import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration (migrate, generate, diff).
 *
 * The CLI connects with DIRECT_URL: the database OWNER role on a direct,
 * non-pooled connection, because schema changes (DDL) need both. The running
 * API never uses this — it connects as the least-privilege app role through
 * the pooler (DATABASE_URL, see apps/api/src/prisma/prisma.service.ts and
 * ADR 0012).
 *
 * No dotenv on purpose: the variable must be set deliberately in the shell,
 * CI or deployment workflow that runs a migration, so that a stray .env file
 * can never silently point a migration at the wrong database.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
