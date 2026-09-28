import { createHash } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { SESSION_IDLE_MS } from '../../src/auth/auth.constants';
import { BreachedPasswords } from '../../src/auth/breached-passwords';
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
    put: (url: string) => wrap(agent.put(url)),
    delete: (url: string) => wrap(agent.delete(url)),
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
      phone: null,
      displayName: null,
      locale: 'en',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      totpEnabled: false,
      recoveryCodesLeft: 0,
      operator: true,
      plan: 'plus',
      plusUntil: null,
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
      user: { id: expect.any(String), email: EMAIL, phone: null },
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

  it('locks one account after 10 failures, even from many IPs — and a restart does not unlock it', async () => {
    const attempt = (s: App, password: string, ip: string) =>
      request(s)
        .post('/auth/login')
        .set('x-bff-secret', TEST_SECRET)
        .set('x-client-ip', ip)
        .send({ email: EMAIL, password });
    for (let i = 0; i < 10; i++) {
      await attempt(server, 'wrong password here', `192.0.2.${i + 1}`).expect(
        401,
      );
    }
    const res = await attempt(server, PASSWORD, '192.0.2.200').expect(429);
    expect(res.body.message).toMatch(/Too many failed attempts/);
    // A fresh instance (a restart, or a second server) sees the same lock.
    const { app: restarted } = await createTestApp();
    await attempt(restarted.getHttpServer(), PASSWORD, '192.0.2.201').expect(
      429,
    );
    await restarted.close();
    // The row holds a hash, never the email typed.
    const { rows } = await owner.query<{ key_hash: string; failures: number }>(
      'SELECT key_hash, failures FROM login_failures',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].failures).toBe(10);
  });

  it('a new window starts after 15 minutes; a correct password clears the count', async () => {
    for (let i = 0; i < 3; i++) {
      await login('wrong password here', `192.0.2.${i + 30}`).expect(401);
    }
    await owner.query(
      "UPDATE login_failures SET window_started_at = now() - interval '16 minutes'",
    );
    await login('wrong password here', '192.0.2.40').expect(401);
    expect(
      (await owner.query('SELECT failures FROM login_failures')).rows[0]
        .failures,
    ).toBe(1);
    await login(PASSWORD, '192.0.2.41').expect(200);
    expect(
      (await owner.query('SELECT count(*)::int n FROM login_failures')).rows[0]
        .n,
    ).toBe(0);
  });

  it('counts the email however it is capitalised', async () => {
    for (let i = 0; i < 10; i++) {
      await bff()
        .post('/auth/login')
        .set('x-client-ip', `192.0.2.${i + 60}`)
        .send({
          email: i % 2 ? EMAIL.toUpperCase() : EMAIL,
          password: 'wrong password here',
        })
        .expect((r) => expect([400, 401]).toContain(r.status));
    }
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM login_failures',
    );
    expect(rows[0].n).toBe(1);
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

  it('lists signed-in devices with a coarse label, this one marked', async () => {
    const PHONE =
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
    const phone = (await login().set('x-client-ua', PHONE).expect(200)).body
      .token as string;
    const res = await withSession(bff().get('/auth/sessions'), phone).expect(
      200,
    );
    // setup + login (no browser named) + this phone
    expect(res.body).toHaveLength(3);
    const list = res.body as Record<string, unknown>[];
    const mine = list.find((x) => x.current === true)!;
    expect(mine).toMatchObject({ device: 'Chrome on Android', current: true });
    expect(Object.keys(mine).sort()).toEqual(
      ['createdAt', 'current', 'device', 'id', 'lastSeenAt'].sort(),
    );
    // Only the label is stored — never the full string, never an address.
    const { rows } = await owner.query<{ device: string | null }>(
      'SELECT device FROM sessions',
    );
    expect(rows.map((r) => r.device)).toContain('Chrome on Android');
    expect(JSON.stringify(rows)).not.toMatch(/Pixel|537|Mozilla/);
  });

  it('signs one other device out, not this one, not someone else’s', async () => {
    const other = (await login().expect(200)).body.token as string;
    const list = (await withSession(bff().get('/auth/sessions'), token))
      .body as {
      id: string;
      current: boolean;
    }[];
    const here = list.find((x) => x.current)!.id;
    const { rows } = await owner.query<{ id: string }>(
      "SELECT id FROM sessions WHERE token_hash = encode(sha256($1::bytea), 'hex')",
      [other],
    );
    await withSession(bff().delete(`/auth/sessions/${here}`), token).expect(
      400,
    );
    await withSession(
      bff().delete(`/auth/sessions/${rows[0].id}`),
      token,
    ).expect(204);
    await withSession(bff().get('/auth/me'), other).expect(401);
    await withSession(bff().get('/auth/me'), token).expect(200);
    await withSession(
      bff().delete(`/auth/sessions/${rows[0].id}`),
      token,
    ).expect(404);
    await withSession(bff().delete('/auth/sessions/not-a-uuid'), token).expect(
      400,
    );
    expect(await auditActions()).toContain('auth.session_ended');
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

describe('language', () => {
  let token: string;
  beforeEach(async () => {
    token = await setupOwner();
  });

  const setLocale = (body: object, as = token) =>
    withSession(bff().put('/auth/locale'), as).send(body);

  it('starts in English and can switch to Kiswahili and back', async () => {
    const me = () => withSession(bff().get('/auth/me'), token).expect(200);
    expect((await me()).body.locale).toBe('en');
    await setLocale({ locale: 'sw' }).expect(204);
    expect((await me()).body.locale).toBe('sw');
    await setLocale({ locale: 'en' }).expect(204);
    expect((await me()).body.locale).toBe('en');
  });

  it('accepts only the languages the app speaks', async () => {
    await setLocale({ locale: 'fr' }).expect(400);
    await setLocale({ locale: 'SW' }).expect(400);
    await setLocale({}).expect(400);
    await setLocale({ locale: 'sw', extra: 1 }).expect(400);
  });

  it('needs a session', async () => {
    await bff().put('/auth/locale').send({ locale: 'sw' }).expect(401);
  });

  it('the database refuses an unknown language too', async () => {
    await expect(owner.query("UPDATE users SET locale = 'xx'")).rejects.toThrow(
      /users_locale_known/,
    );
  });
});

describe('breached passwords (A5)', () => {
  const BREACHED = 'password1234';
  const sha1 = (p: string) =>
    createHash('sha1').update(p).digest('hex').toUpperCase();

  it('refuses a breached password at setup and on change; an outage never blocks', async () => {
    const { app: on } = await createTestApp({ BREACHED_PASSWORD_CHECK: 'on' });
    const checker = on.get(BreachedPasswords);
    const asked: string[] = [];
    let down = false;
    checker.fetchFn = (url) => {
      asked.push(url);
      if (down) return Promise.reject(new Error('network'));
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`${sha1(BREACHED).slice(5)}:3861493\nABCDEF:0`),
      });
    };
    const s = on.getHttpServer();
    const post = (url: string, token?: string) => {
      const r = request(s)
        .post(url)
        .set('x-bff-secret', TEST_SECRET)
        .set('x-client-ip', `198.18.9.${++ipCounter % 250}`);
      return token ? r.set('authorization', `Session ${token}`) : r;
    };
    const refused = await post('/auth/setup')
      .send({ setupToken: TEST_SETUP_TOKEN, email: EMAIL, password: BREACHED })
      .expect(400);
    expect(refused.body.message).toMatch(/appeared in known data breaches/);
    // Only the 5-character prefix ever left the server.
    expect(asked[0]).toBe(
      `https://api.pwnedpasswords.com/range/${sha1(BREACHED).slice(0, 5)}`,
    );
    const token = (
      await post('/auth/setup')
        .send({
          setupToken: TEST_SETUP_TOKEN,
          email: EMAIL,
          password: PASSWORD,
        })
        .expect(201)
    ).body.token as string;
    await post('/auth/password', token)
      .send({ currentPassword: PASSWORD, newPassword: BREACHED })
      .expect(400);
    down = true;
    await post('/auth/password', token)
      .send({ currentPassword: PASSWORD, newPassword: BREACHED })
      .expect(204);
    await on.close();
  });
});
