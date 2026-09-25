#!/usr/bin/env node
/**
 * Pre-flight validation for the database connection strings, run before any
 * deploy touches a real database.
 *
 * Prisma reports a malformed connection string as
 *
 *     P1013 The provided database string is invalid.
 *           The scheme is not recognized in database URL.
 *
 * without naming WHICH variable it read, and — because `migrate deploy` uses
 * `directUrl` — without noticing a malformed `url` at all. This script names
 * the offending variable and says what is wrong with it.
 *
 * Usage: node scripts/check-database-urls.mjs [NAME ...]
 * With no names it checks both DIRECT_URL and DATABASE_URL.
 *
 * Ported from TrustGiving, where it was written after a real P1013 incident.
 *
 * It never prints a value or any substring of one. What it prints is the
 * variable name, a fault category, a length, and a truncated SHA-256
 * fingerprint that lets you compare against the value you believe you stored
 * without either side revealing it. See the README for that procedure.
 */

import { createHash } from 'node:crypto';

const SCHEMES = ['postgresql://', 'postgres://'];

const ALL_VARIABLES = [
  {
    name: 'DIRECT_URL',
    usedFor:
      'migrations (prisma migrate deploy reads directUrl) — a fault here is what produces P1013',
  },
  {
    name: 'DATABASE_URL',
    usedFor:
      'the application at runtime (Prisma Client reads url) — migrate deploy does NOT validate this, so a fault here fails later, in the running app',
  },
];

const requested = process.argv.slice(2);
const VARIABLES = requested.length
  ? ALL_VARIABLES.filter((v) => requested.includes(v.name))
  : ALL_VARIABLES;
if (VARIABLES.length !== (requested.length || ALL_VARIABLES.length)) {
  console.log(
    '::error::Unknown variable name. Expected DIRECT_URL and/or DATABASE_URL.',
  );
  process.exit(1);
}

const ALL_NAMES = ALL_VARIABLES.map((v) => v.name);

/** Truncated digest: enough to compare two values, not enough to reverse one. */
function fingerprint(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12);
}

/**
 * Faults that mean the secret never carried a real value — the plumbing
 * delivered a name or an unexpanded template instead. These are reported
 * separately from "malformed URL" because the remedy is completely different:
 * the value stored is wrong, not the value's syntax.
 */
function findPlumbingFault(raw, name) {
  const bare = raw.trim().replace(/^["']|["']$/g, '');

  if (ALL_NAMES.includes(bare)) {
    return bare === name
      ? `contains its own name, the literal text "${name}". The value field holds the variable's name instead of a connection string — check you did not paste the name into both fields when creating the secret`
      : `contains the literal text "${bare}", which is the name of the other connection variable — the two secrets' values look transposed with their names`;
  }

  if (/^\$\{\{.*\}\}$/.test(bare)) {
    return 'is an unexpanded GitHub Actions expression (it still contains ${{ ... }}). A secret value is stored verbatim — GitHub does not evaluate expressions inside secret values, so an expression pasted into the value field arrives literally';
  }

  if (
    /^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(bare) ||
    /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(bare)
  ) {
    return 'is an unexpanded shell-style reference such as ${NAME} or $NAME. A secret value is stored verbatim — store the connection string itself, not a reference to it';
  }

  return null;
}

/** Faults in the syntax of a value that is at least trying to be a URL. */
function findUrlFault(raw) {
  if (raw.trim() === '') {
    return 'is empty or only whitespace';
  }

  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"));
  if (quoted) {
    return 'is wrapped in quotes — store the bare value, GitHub does not strip them';
  }

  if (raw !== raw.trimStart()) {
    return 'has leading whitespace or a newline before the scheme';
  }

  if (!SCHEMES.some((scheme) => raw.startsWith(scheme))) {
    return `does not start with ${SCHEMES.join(' or ')}`;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return (
      'is not a parseable URL. The usual cause is an unencoded reserved ' +
      'character in the password: # / ? must be percent-encoded (%23 %2F %3F)'
    );
  }

  if (!parsed.hostname) {
    return (
      'parses but has no host. The usual cause is an unencoded reserved ' +
      'character in the password: # / ? must be percent-encoded (%23 %2F %3F)'
    );
  }

  return null;
}

let failed = false;
const seen = new Map();

for (const { name, usedFor } of VARIABLES) {
  const raw = process.env[name];

  if (raw === undefined || raw === '') {
    console.log(
      `::error title=${name} is not set::${name} resolved to an empty value. ` +
        'Either the secret does not exist in the selected GitHub Environment, ' +
        'or it is defined as a variable rather than a secret. ' +
        `It is used for ${usedFor}.`,
    );
    failed = true;
    continue;
  }

  // Safe to print: name, length, and a truncated digest of the whole value.
  console.log(`${name}: length ${raw.length}, sha256:${fingerprint(raw)}`);
  seen.set(name, fingerprint(raw));

  const plumbing = findPlumbingFault(raw, name);
  if (plumbing) {
    console.log(
      `::error title=${name} did not receive a connection string::${name} ${plumbing}. ` +
        `It is used for ${usedFor}.`,
    );
    failed = true;
    continue;
  }

  const fault = findUrlFault(raw);
  if (fault) {
    console.log(
      `::error title=${name} is malformed::${name} ${fault}. It is used for ${usedFor}.`,
    );
    failed = true;
    continue;
  }

  if (raw !== raw.trimEnd()) {
    console.log(
      `::warning title=${name} has trailing whitespace::${name} ends in whitespace or a newline. ` +
        'Prisma tolerates it, but other tooling may not — re-paste the secret without a trailing newline.',
    );
  }
}

// Neon's pooled and direct endpoints are different hosts. Identical values
// usually mean one secret was pasted into both.
if (seen.size === 2 && new Set(seen.values()).size === 1 && !failed) {
  console.log(
    '::warning title=Both connection strings are identical::DATABASE_URL and DIRECT_URL have the same value. ' +
      "Neon's pooled and direct endpoints differ (the pooled host contains '-pooler'), so this is usually a copy-paste slip.",
  );
}

if (failed) {
  console.log(
    '::error title=Pre-flight failed::Fix the secret named above under ' +
      'Settings → Environments → the environment you deployed to, then re-run. ' +
      'Nothing was deployed. To confirm what is stored without revealing it, ' +
      "compare the sha256 above with: printf %s 'your-connection-string' | sha256sum | cut -c1-12",
  );
  process.exit(1);
}

console.log('All connection strings are present and well-formed.');
