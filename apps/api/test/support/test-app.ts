import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap/configure-app';
import { type Env, loadEnv } from '../../src/config/env';
import { requireLocalDatabaseUrl } from './local-database';

export const TEST_SECRET = 'test-only-bff-secret-0123456789abcdef';
export const TEST_SETUP_TOKEN = 'test-only-setup-token-0123456789abcdef';
export const TEST_TOTP_KEY = '0f'.repeat(32);

/** The app exactly as main.ts builds it, against the local test database. */
export async function createTestApp(
  overrides: Record<string, string | undefined> = {},
): Promise<{ app: NestExpressApplication; env: Env }> {
  const env = loadEnv({
    NODE_ENV: 'test',
    WEB_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: requireLocalDatabaseUrl('DATABASE_URL'),
    API_SHARED_SECRET: TEST_SECRET,
    SETUP_TOKEN: TEST_SETUP_TOKEN,
    TOTP_ENCRYPTION_KEY: TEST_TOTP_KEY,
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forEnv(env)],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app, env);
  await app.init();
  return { app, env };
}

/** Owner connection, for resetting tables between tests (the app role cannot touch audit_logs). */
export function ownerClient(): Client {
  return new Client({
    connectionString: requireLocalDatabaseUrl('DIRECT_URL'),
  });
}

export async function resetDatabase(owner: Client): Promise<void> {
  await owner.query(
    'TRUNCATE mfa_challenges, recovery_codes, sessions, audit_logs, users',
  );
}
