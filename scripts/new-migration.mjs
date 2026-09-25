#!/usr/bin/env node
/**
 * Creates a new migration from the difference between the migrations and
 * prisma/schema.prisma — without Prisma's shadow database.
 *
 *   DIRECT_URL=<LOCAL owner connection> npm run db:new-migration -- <name>
 *
 * Why not `prisma migrate dev`: it replays every migration into a scratch
 * "shadow" database that lacks Prisma's `_prisma_migrations` table, and the
 * first migration (already applied in staging and production, so frozen)
 * refers to that table. This script instead:
 *   1. applies the existing migrations to your LOCAL database,
 *   2. asks Prisma for the SQL that turns that database into the schema,
 *   3. writes it as prisma/migrations/<timestamp>_<name>/migration.sql.
 * Review the SQL, add any grants/constraints by hand (ADR 0012), then apply
 * it with `npm run prisma:deploy`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function fail(message) {
  console.error(`new-migration: ${message}`);
  process.exit(1);
}

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9_]{2,60}$/.test(name)) {
  fail('give a snake_case name, e.g. npm run db:new-migration -- add_contacts');
}
let host;
try {
  host = new URL(process.env.DIRECT_URL ?? '').hostname;
} catch {
  fail('DIRECT_URL must be set to your LOCAL owner connection.');
}
if (!LOCAL_HOSTS.has(host)) {
  fail(
    'DIRECT_URL must point at a local database. Migrations are created locally, then deployed.',
  );
}

const prisma = (args) =>
  execFileSync('npx', ['prisma', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

prisma(['migrate', 'deploy']);
const sql = prisma([
  'migrate',
  'diff',
  '--from-config-datasource',
  '--to-schema',
  'prisma/schema.prisma',
  '--script',
]);
if (!sql.trim() || /^-- This is an empty migration/m.test(sql)) {
  fail('the schema matches the migrations; nothing to create.');
}

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const dir = `prisma/migrations/${stamp}_${name}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/migration.sql`, sql);
console.log(
  `Created ${dir}/migration.sql — review it, add grants/constraints, then npm run prisma:deploy.`,
);
