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
const FIRST_MIGRATION = '20260925185127_init';

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
  // Refuse to touch any database that is not a Contact Sphere database.
  // This machine's environment has once carried ANOTHER project's database
  // credentials under the same variable names; a role script must never act
  // on a database merely because a variable pointed at it. The proof is this
  // project's own first migration in Prisma's history table.
  const ours = await client
    .query(
      `SELECT 1 FROM _prisma_migrations
        WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      [FIRST_MIGRATION],
    )
    .catch(() => ({ rowCount: 0 }));
  if (ours.rowCount !== 1) {
    fail(
      'this database is not a migrated Contact Sphere database ' +
        `(no applied ${FIRST_MIGRATION}). Nothing was changed. ` +
        'Check DIRECT_URL, and run migrations first.',
    );
  }

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

  // Least privilege, VERIFIED rather than asserted. Setting these attributes
  // (ALTER ROLE ... NOSUPERUSER) needs superuser rights that a managed-Postgres
  // owner such as Neon's does not have, even to restate a default. So check
  // them instead, and refuse to report success if any is present.
  const attrs = await client.query(
    `SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
       FROM pg_roles WHERE rolname = $1`,
    [role],
  );
  const dangerous = Object.entries(attrs.rows[0]).filter(([, on]) => on);
  if (dangerous.length > 0) {
    fail(
      `${role} has privileges it must not have: ${dangerous.map(([k]) => k).join(', ')}.`,
    );
  }
  const memberships = await client.query(
    `SELECT DISTINCT g.rolname FROM pg_auth_members m
       JOIN pg_roles g ON g.oid = m.roleid
       JOIN pg_roles r ON r.oid = m.member
      WHERE r.rolname = $1 ORDER BY 1`,
    [role],
  );
  const groups = memberships.rows.map((r) => r.rolname);
  if (groups.join(',') !== 'app_runtime') {
    fail(
      `${role} must belong to app_runtime only, but belongs to: ${groups.join(', ')}.`,
    );
  }
  console.log(
    `${role} is a member of app_runtime and nothing else (verified).`,
  );
} finally {
  await client.end();
}
