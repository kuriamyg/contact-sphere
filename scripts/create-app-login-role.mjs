#!/usr/bin/env node
/**
 * Creates (or re-passwords) the API's LOGIN role in one environment and makes
 * it a member of app_runtime, the privilege group the migrations define.
 *
 *   DIRECT_URL=<owner connection>  APP_DB_ROLE=contact_sphere_app \
 *   APP_DB_PASSWORD=<new password>  node scripts/create-app-login-role.mjs
 *
 * Run it after `prisma migrate deploy` (app_runtime must exist). Idempotent:
 * running it again with a new password rotates the password.
 *
 * The password arrives through the environment, is sent to Postgres as a
 * literal inside one statement, and is never printed or logged here.
 * See docs/operations/database-roles.md.
 */
import pg from 'pg';

const ROLE_PATTERN = /^[a-z_][a-z0-9_]{2,62}$/;

const directUrl = process.env.DIRECT_URL;
const role = process.env.APP_DB_ROLE ?? 'contact_sphere_app';
const password = process.env.APP_DB_PASSWORD;

function fail(message) {
  console.error(`create-app-login-role: ${message}`);
  process.exit(1);
}

if (!directUrl) fail('DIRECT_URL (the owner connection) is not set.');
if (!ROLE_PATTERN.test(role))
  fail('APP_DB_ROLE must be a plain lower-case identifier.');
if (!password || password.length < 24) {
  fail(
    'APP_DB_PASSWORD must be set and at least 24 characters (openssl rand -hex 24).',
  );
}

const client = new pg.Client({ connectionString: directUrl });
await client.connect();
try {
  const { rows } = await client.query(
    'SELECT 1 FROM pg_roles WHERE rolname = $1',
    [role],
  );
  // Identifiers and the password literal cannot be bind parameters in DDL.
  // Both are escaped by the driver's own escaping functions.
  const ident = client.escapeIdentifier(role);
  const secret = client.escapeLiteral(password);
  if (rows.length === 0) {
    await client.query(`CREATE ROLE ${ident} LOGIN PASSWORD ${secret}`);
    console.log(`Created login role ${role}.`);
  } else {
    await client.query(`ALTER ROLE ${ident} WITH LOGIN PASSWORD ${secret}`);
    console.log(`Updated password for existing role ${role}.`);
  }
  await client.query(`GRANT app_runtime TO ${ident}`);
  // Least privilege, stated explicitly rather than assumed from defaults.
  await client.query(
    `ALTER ROLE ${ident} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  );
  console.log(`${role} is a member of app_runtime and nothing else.`);
} finally {
  await client.end();
}
