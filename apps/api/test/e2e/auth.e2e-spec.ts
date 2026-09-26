import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { SESSION_IDLE_MS } from '../../src/auth/auth.constants';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
  TEST_SETUP_TOKEN,
} from '../support/test-app';

const EMAIL = 'owner@example.com';
const PASSWORD = 'orange piano window cloud';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let ipCounter = 0;

/**
 * A request as the web server sends it: shared secret plus a client IP.
 * Each test gets fresh IPs so the per-IP rate limit never leaks between
 * tests unless a test is about rate limiting.
 */
function bff(ip = `198.51.100.${++ipCounter % 250}`) {
  const agent = request(server);
  const wrap = (r: request.Test) =>
    r.set('x-bff-secret', TEST_SECRET).set('x-client-ip', ip);
  return {
    get: (url: string) => wrap(agent.get(url)),
    post: (url: string) => wrap(agent.post(url)),
  };
}

const withSession = (r: request.Test, token: string) =>
  r.set('authorization', `Session ${token}`);

async function setupOwner(): Promise<string> {
  const res = await bff()
    .post('/auth/setup')
    .send({ setupToken: TEST_SETUP_TOKEN, email: EMAIL, password: PASSWORD })
    .expect(201);
  return res.body.token as string;
}

function login(password = PASSWORD, ip?: string): request.Test {
  return bff(ip).post('/auth/login').send({ email: EMAIL, password });
}

async function auditActions(): Promise<string[]> {
  const { rows } = await owner.query<{ action: string }>(
    'SELECT action FROM audit_logs ORDER BY created_at, id',
  );
  return rows.map((r) => r.action);
}

beforeAll(async () => {
  ({ app } = await createTestApp());
  server = app.getHttpServer();
  owner = ownerClient();
  await owner.connect();
});

beforeEach(async () => {
  await resetDatabase(owner);
});

afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('the web-server secret (first gate)', () => {
  it('refuses any API route without it', async () => {
    await request(server).get('/auth/me').expect(403);
    await request(server)
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(403);
  });

  it('refuses a wrong secret', async () => {
    await request(server)
      .get('/auth/setup')
      .set('x-bff-secret', TEST_SECRET + 'x')
      .expect(403);
  });

  it('leaves health checks open for monitors', async () => {
    await request(server).get('/health').expect(200);
    await request(server).get('/health/ready').expect(200);
  });
});

describe('first-account setup', () => {
  it('is available only while no account exists', async () => {
    expect((await bff().get('/auth/setup').expect(200)).body).toEqual({
      setupAvailable: true,
    });
    await setupOwner();
    expect((await bff().get('/auth/setup').expect(200)).body).toEqual({
      setupAvailable: false,
    });
  });

  it('creates the owner, signs them in, and audits it without the email', async () => {
    const token = await setupOwner();
    const me = await withSession(bff().get('/auth/me'), token).expect(200);
    expect(me.body).toEqual({
      id: expect.any(String),
      email: EMAIL,
      displayName: null,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      totpEnabled: false,
      recoveryCodesLeft: 0,
    });
    expect(await auditActions()).toEqual(['auth.setup_completed']);
    const { rows } = await owner.query('SELECT metadata::text FROM audit_logs');
    expect(JSON.stringify(rows)).not.toContain(EMAIL);
  });

  it('cannot be done twice', async () => {
    await setupOwner();
    await bff()
      .post('/auth/setup')
      .send({
        setupToken: TEST_SETUP_TOKEN,
        email: 'attacker@example.com',
        password: PASSWORD,
      })
      .expect(409);
  });

  it('refuses a wrong setup token', async () => {
    await bff()
      .post('/auth/setup')
      .send({ setupToken: 'x'.repeat(40), email: EMAIL, password: PASSWORD })
      .expect(401);
  });

  it('enforces the password policy', async () => {
    const res = await bff()
      .post('/auth/setup')
      .send({ setupToken: TEST_SETUP_TOKEN, email: EMAIL, password: 'short' })
      .expect(400);
    expect(res.body.message).toMatch(/at least 12/);
  });

  it('is disabled entirely when no setup token is configured', async () => {
    const { app: noSetup } = await createTestApp({ SETUP_TOKEN: undefined });
    const s = noSetup.getHttpServer();
    const get = await request(s)
      .get('/auth/setup')
      .set('x-bff-secret', TEST_SECRET)
      .expect(200);
    expect(get.body).toEqual({ setupAvailable: false });
    await request(s)
      .post('/auth/setup')
      .set('x-bff-secret', TEST_SECRET)
      .send({ setupToken: TEST_SETUP_TOKEN, email: EMAIL, password: PASSWORD })
      .expect(404);
    await noSetup.close();
  });

  it('only one of two simultaneous setups succeeds', async () => {
    const attempt = (email: string) =>
      bff()
        .post('/auth/setup')
        .send({ setupToken: TEST_SETUP_TOKEN, email, password: PASSWORD });
    const statuses = (
      await Promise.all([attempt('a@example.com'), attempt('b@example.com')])
    )
      .map((r) => r.status)
      .sort();
    expect(statuses).toEqual([201, 409]);
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM users',
    );
    expect(rows[0].n).toBe(1);
  });
});

describe('login', () => {
  beforeEach(setupOwner);

  it('returns a session for the right password; email is case-insensitive', async () => {
    const res = await bff()
      .post('/auth/login')
      .send({ email: '  Owner@Example.COM ', password: PASSWORD })
      .expect(200);
    expect(res.body).toEqual({
      token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expiresAt: expect.any(String),
      user: { id: expect.any(String), email: EMAIL },
    });
  });

  it('never stores the token itself', async () => {
    const res = await login().expect(200);
    const { rows } = await owner.query<{ token_hash: string }>(
      'SELECT token_hash FROM sessions',
    );
    expect(rows.map((r) => r.token_hash)).not.toContain(res.body.token);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await login('wrong password here').expect(401);
    const unknown = await bff()
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
    expect(await auditActions()).toEqual([
      'auth.setup_completed',
      'auth.login_failed',
      'auth.login_failed',
    ]);
  });

  it('refuses unexpected fields (validation whitelist)', async () => {
    await bff()
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD, isAdmin: true })
      .expect(400);
  });

  it('rate-limits one client IP to 5 attempts a minute', async () => {
    const ip = '203.0.113.9';
    for (let i = 0; i < 5; i++)
      await login('wrong password here', ip).expect(401);
    await login(PASSWORD, ip).expect(429);
    // Another client is unaffected.
    await login(PASSWORD, '203.0.113.10').expect(200);
  });

  it('locks one account after 10 failures, even from many IPs', async () => {
    // Its own app instance: the lock lasts 15 minutes and would otherwise
    // (correctly) lock this account for every later test.
    const { app: isolated } = await createTestApp();
    const s = isolated.getHttpServer();
    const attempt = (password: string, ip: string) =>
      request(s)
        .post('/auth/login')
        .set('x-bff-secret', TEST_SECRET)
        .set('x-client-ip', ip)
        .send({ email: EMAIL, password });
    for (let i = 0; i < 10; i++) {
      await attempt('wrong password here', `192.0.2.${i + 1}`).expect(401);
    }
    const res = await attempt(PASSWORD, '192.0.2.200').expect(429);
    expect(res.body.message).toMatch(/Too many failed attempts/);
    await isolated.close();
  });
});

describe('sessions', () => {
  let token: string;
  beforeEach(async () => {
    await setupOwner();
    token = (await login().expect(200)).body.token as string;
  });

  it('protects routes by default', async () => {
    await bff().get('/auth/me').expect(401);
    await withSession(bff().get('/auth/me'), 'not-a-real-token').expect(401);
    await bff()
      .get('/auth/me')
      .set('authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('logout ends this session only', async () => {
    const other = (await login().expect(200)).body.token as string;
    await withSession(bff().post('/auth/logout'), token).expect(204);
    await withSession(bff().get('/auth/me'), token).expect(401);
    await withSession(bff().get('/auth/me'), other).expect(200);
  });

  it('logout-all ends every session', async () => {
    const other = (await login().expect(200)).body.token as string;
    await withSession(bff().post('/auth/logout-all'), token).expect(204);
    await withSession(bff().get('/auth/me'), token).expect(401);
    await withSession(bff().get('/auth/me'), other).expect(401);
  });

  it('an idle session expires, and is deleted', async () => {
    await owner.query(
      `UPDATE sessions SET last_seen_at = now() - ($1 || ' milliseconds')::interval`,
      [SESSION_IDLE_MS + 1000],
    );
    await withSession(bff().get('/auth/me'), token).expect(401);
    const { rows } = await owner.query(
      'SELECT count(*)::int AS n FROM sessions',
    );
    expect(rows[0].n).toBe(1); // the setup session's row remains; this one is gone
  });

  it('an absolutely expired session is refused', async () => {
    await owner.query(
      `UPDATE sessions SET created_at = now() - interval '31 days', expires_at = now() - interval '1 second'`,
    );
    await withSession(bff().get('/auth/me'), token).expect(401);
  });
});

describe('changing the password', () => {
  let token: string;
  beforeEach(async () => {
    await setupOwner();
    token = (await login().expect(200)).body.token as string;
  });

  const change = (currentPassword: string, newPassword: string) =>
    withSession(bff().post('/auth/password'), token).send({
      currentPassword,
      newPassword,
    });

  it('requires the current password', async () => {
    await change('wrong password here', 'a brand new passphrase').expect(401);
  });

  it('applies the policy to the new password', async () => {
    await change(PASSWORD, 'short').expect(400);
    await change(PASSWORD, PASSWORD).expect(400);
  });

  it('changes it, keeps this session, and signs out every other', async () => {
    const other = (await login().expect(200)).body.token as string;
    await change(PASSWORD, 'a brand new passphrase').expect(204);
    await withSession(bff().get('/auth/me'), token).expect(200);
    await withSession(bff().get('/auth/me'), other).expect(401);
    await login(PASSWORD).expect(401);
    await login('a brand new passphrase').expect(200);
    expect(await auditActions()).toContain('auth.password_changed');
  });
});
