import { createHash, randomBytes } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
  TEST_SETUP_TOKEN,
} from '../support/test-app';

const REDIRECT = 'http://localhost:3000/auth/google/callback';
const PASSWORD = 'orange piano window cloud';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let ip = 0;

type Method = 'get' | 'post' | 'put';
const api = (method: Method, url: string, token?: string) => {
  const r = request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.6.${++ip % 250}`);
  return token ? r.set('authorization', `Session ${token}`) : r;
};
const body = (res: { body: unknown }) => res.body as Record<string, unknown>;

interface Claims {
  sub: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
}

/** What the web server sends after Google's redirect (fake provider). */
function googleRequest(c: Claims, overrides: Record<string, unknown> = {}) {
  const verifier = randomBytes(32).toString('base64url');
  const nonce = randomBytes(16).toString('base64url');
  const claims = {
    emailVerified: true,
    ...c,
    nonce,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
  return {
    code: `fake:${Buffer.from(JSON.stringify(claims)).toString('base64url')}`,
    codeVerifier: verifier,
    nonce,
    redirectUri: REDIRECT,
    ...overrides,
  };
}

const WANJIRU = { sub: '1001', email: 'Wanjiru@Example.com', name: 'Wanjiru' };

beforeAll(async () => {
  ({ app } = await createTestApp({
    OPEN_SIGNUP: 'on',
    SIGNUP_METHODS: 'google',
    GOOGLE_CLIENT_ID: 'test-client',
    GOOGLE_OAUTH: 'fake',
  }));
  server = app.getHttpServer();
  owner = ownerClient();
  await owner.connect();
});
beforeEach(() => resetDatabase(owner));
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('Continue with Google (ADR 0020)', () => {
  it('reports Google sign-up, and no SMS sign-up', async () => {
    const res = await api('get', '/auth/signup').expect(200);
    expect(res.body).toEqual({
      open: true,
      sms: false,
      google: true,
      googleClientId: 'test-client',
    });
    await api('post', '/auth/signup/code')
      .send({ phone: '0712000101' })
      .expect(404);
  });

  it('creates a new account from Google, on the Plus trial, without a password', async () => {
    const res = await api('post', '/auth/google')
      .set('x-client-ua', 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile')
      .send({ ...googleRequest(WANJIRU), locale: 'sw' })
      .expect(200);
    const token = body(res).token as string;
    const me = body(await api('get', '/auth/me', token).expect(200));
    expect(me).toMatchObject({
      email: 'wanjiru@example.com',
      displayName: 'Wanjiru',
      locale: 'sw',
      plan: 'plus',
      operator: false,
      hasPassword: false,
      google: true,
    });
    // Signing in again finds the same account by Google id.
    const again = await api('post', '/auth/google')
      .send(googleRequest({ ...WANJIRU, email: 'new-address@example.com' }))
      .expect(200);
    expect(body(again).user).toMatchObject({ id: me.id });
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM users',
    );
    expect(rows[0].n).toBe(1);
    const audit = (
      await owner.query<{ m: string }>(
        'SELECT action || metadata::text AS m FROM audit_logs',
      )
    ).rows
      .map((r) => r.m)
      .join(' ');
    expect(audit).toContain('auth.signup_completed');
    expect(audit).not.toMatch(/wanjiru|1001/i);
  });

  it('links an existing account with the same verified email, keeping two-factor', async () => {
    const setup = await api('post', '/auth/setup')
      .send({
        setupToken: TEST_SETUP_TOKEN,
        email: 'owner@example.com',
        password: PASSWORD,
      })
      .expect(201);
    const t = body(setup).token as string;
    await owner.query(
      'UPDATE users SET totp_enabled_at = now(), totp_secret = $1',
      ['v1:placeholder'],
    );
    const res = await api('post', '/auth/google')
      .send(googleRequest({ sub: '2002', email: 'OWNER@example.com' }))
      .expect(200);
    expect(body(res)).toMatchObject({ mfaRequired: true });
    const { rows } = await owner.query<{ google_sub: string; role: string }>(
      'SELECT google_sub, role FROM users',
    );
    expect(rows).toEqual([{ google_sub: '2002', role: 'operator' }]);
    // The password still works for that account.
    await api('get', '/auth/me', t).expect(200);
  });

  it('refuses a wrong nonce, a wrong verifier, a foreign redirect, or an unverified email', async () => {
    await api('post', '/auth/google')
      .send(googleRequest(WANJIRU, { nonce: 'x'.repeat(22) }))
      .expect(400);
    await api('post', '/auth/google')
      .send(googleRequest(WANJIRU, { codeVerifier: 'v'.repeat(43) }))
      .expect(400);
    await api('post', '/auth/google')
      .send(
        googleRequest(WANJIRU, {
          redirectUri: 'https://evil.example/auth/google/callback',
        }),
      )
      .expect(400);
    const res = await api('post', '/auth/google')
      .send(googleRequest({ ...WANJIRU, emailVerified: false }))
      .expect(400);
    expect(body(res).message).toMatch(/not verified the email/);
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM users',
    );
    expect(rows[0].n).toBe(0);
  });

  it('an email linked to another Google id is not taken over', async () => {
    await api('post', '/auth/google').send(googleRequest(WANJIRU)).expect(200);
    const res = await api('post', '/auth/google')
      .send(googleRequest({ sub: '9999', email: 'wanjiru@example.com' }))
      .expect(409);
    expect(body(res).message).toMatch(/different Google account/);
  });

  it('password-only features adapt for Google accounts', async () => {
    const res = await api('post', '/auth/google')
      .send(googleRequest(WANJIRU))
      .expect(200);
    const token = body(res).token as string;
    // No password to sign in with, or to change.
    await api('post', '/auth/login')
      .send({ email: 'wanjiru@example.com', password: PASSWORD })
      .expect(401);
    const change = await api('post', '/auth/password', token)
      .send({ currentPassword: 'anything at all', newPassword: PASSWORD })
      .expect(400);
    expect(body(change).message).toMatch(/signs in with Google/);
    // Deleting needs only the typed word (no two-factor here).
    await api('post', '/auth/account/delete', token)
      .send({ confirm: 'DELETE' })
      .expect(204);
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM users',
    );
    expect(rows[0].n).toBe(0);
  });

  it('password accounts still need their password to delete', async () => {
    const setup = await api('post', '/auth/setup')
      .send({
        setupToken: TEST_SETUP_TOKEN,
        email: 'owner@example.com',
        password: PASSWORD,
      })
      .expect(201);
    await api('post', '/auth/account/delete', body(setup).token as string)
      .send({ confirm: 'DELETE' })
      .expect(401);
  });
});

describe('Google with sign-up closed', () => {
  let closed: NestExpressApplication;
  beforeAll(async () => {
    ({ app: closed } = await createTestApp({
      GOOGLE_CLIENT_ID: 'test-client',
      GOOGLE_OAUTH: 'fake',
    }));
  });
  afterAll(() => closed.close());

  it('signs in existing accounts only', async () => {
    const s = closed.getHttpServer();
    const post = (b: unknown) =>
      request(s)
        .post('/auth/google')
        .set('x-bff-secret', TEST_SECRET)
        .set('x-client-ip', `198.18.5.${++ip % 250}`)
        .send(b as object);
    const status = await request(s)
      .get('/auth/signup')
      .set('x-bff-secret', TEST_SECRET);
    expect(status.body).toMatchObject({
      open: false,
      google: false,
      googleClientId: 'test-client',
    });
    const res = await post(googleRequest(WANJIRU)).expect(403);
    expect(body(res).message).toMatch(/no Contact Sphere account/);
    await owner.query(
      "INSERT INTO users (id, email, google_sub, updated_at) VALUES (gen_random_uuid(), 'wanjiru@example.com', '1001', now())",
    );
    await post(googleRequest(WANJIRU)).expect(200);
  });
});
