import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { TOTP_PERIOD, totpCodeAt } from '../../src/auth/totp';
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
let ip = 0;

const bff = () => {
  const addr = `198.18.0.${++ip % 250}`;
  const wrap = (r: request.Test) =>
    r.set('x-bff-secret', TEST_SECRET).set('x-client-ip', addr);
  return {
    get: (u: string) => wrap(request(server).get(u)),
    post: (u: string) => wrap(request(server).post(u)),
  };
};
const authed = (r: request.Test, token: string) =>
  r.set('authorization', `Session ${token}`);

/** A code for `steps` periods from now (each code works once). */
const code = (secret: string, steps = 0) =>
  totpCodeAt(secret, Date.now() + steps * TOTP_PERIOD * 1000);

async function setupOwner(): Promise<string> {
  const res = await bff()
    .post('/auth/setup')
    .send({ setupToken: TEST_SETUP_TOKEN, email: EMAIL, password: PASSWORD })
    .expect(201);
  return res.body.token as string;
}

/** Owner with two-factor on. Returns the secret and recovery codes. */
async function enrol(token: string) {
  const setup = await authed(bff().post('/auth/totp/setup'), token).expect(200);
  const secret = setup.body.secret as string;
  const enabled = await authed(bff().post('/auth/totp/enable'), token)
    .send({ code: code(secret) })
    .expect(200);
  return { secret, recoveryCodes: enabled.body.recoveryCodes as string[] };
}

const login = () =>
  bff().post('/auth/login').send({ email: EMAIL, password: PASSWORD });

beforeAll(async () => {
  ({ app } = await createTestApp());
  server = app.getHttpServer();
  owner = ownerClient();
  await owner.connect();
});
beforeEach(() => resetDatabase(owner));
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('enrolment', () => {
  it('shows an otpauth URI, stores the secret only encrypted, and is off until confirmed', async () => {
    const token = await setupOwner();
    const res = await authed(bff().post('/auth/totp/setup'), token).expect(200);
    expect(res.body.uri).toMatch(/^otpauth:\/\/totp\//);
    const { rows } = await owner.query<{ totp_secret: string }>(
      'SELECT totp_secret FROM users',
    );
    expect(rows[0].totp_secret.startsWith('v1:')).toBe(true);
    expect(rows[0].totp_secret).not.toContain(res.body.secret);
    const me = await authed(bff().get('/auth/me'), token).expect(200);
    expect(me.body.totpEnabled).toBe(false);
    await login().expect(200); // still password-only until confirmed
  });

  it('refuses a wrong confirmation code', async () => {
    const token = await setupOwner();
    await authed(bff().post('/auth/totp/setup'), token).expect(200);
    await authed(bff().post('/auth/totp/enable'), token)
      .send({ code: '000000' })
      .expect(400);
  });

  it('confirms with a code, returns 10 recovery codes, and ends other sessions', async () => {
    const token = await setupOwner();
    const other = (await login().expect(200)).body.token as string;
    const { recoveryCodes } = await enrol(token);
    expect(recoveryCodes).toHaveLength(10);
    const me = await authed(bff().get('/auth/me'), token).expect(200);
    expect(me.body).toMatchObject({ totpEnabled: true, recoveryCodesLeft: 10 });
    await authed(bff().get('/auth/me'), other).expect(401);
    const { rows } = await owner.query<{ code_hash: string }>(
      'SELECT code_hash FROM recovery_codes',
    );
    expect(rows.map((r) => r.code_hash)).not.toContain(recoveryCodes[0]);
  });
});

describe('signing in with two-factor on', () => {
  let secret: string;
  let recoveryCodes: string[];
  beforeEach(async () => {
    ({ secret, recoveryCodes } = await enrol(await setupOwner()));
  });

  it('the password alone gives a challenge, not a session', async () => {
    const res = await login().expect(200);
    expect(res.body).toEqual({
      mfaRequired: true,
      challenge: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expiresAt: expect.any(String),
    });
    expect(res.body.token).toBeUndefined();
  });

  it('challenge + current code gives a session', async () => {
    const { challenge } = (await login().expect(200)).body;
    const res = await bff()
      .post('/auth/login/mfa')
      .send({ challenge, code: code(secret, 1) })
      .expect(200);
    await authed(bff().get('/auth/me'), res.body.token as string).expect(200);
  });

  it('a code cannot be used twice', async () => {
    const c = code(secret, 1);
    const first = (await login().expect(200)).body.challenge;
    await bff()
      .post('/auth/login/mfa')
      .send({ challenge: first, code: c })
      .expect(200);
    const second = (await login().expect(200)).body.challenge;
    await bff()
      .post('/auth/login/mfa')
      .send({ challenge: second, code: c })
      .expect(401);
  });

  it('a recovery code works once', async () => {
    const rc = recoveryCodes[0].toLowerCase(); // case-insensitive
    const c1 = (await login().expect(200)).body.challenge;
    await bff()
      .post('/auth/login/mfa')
      .send({ challenge: c1, code: rc })
      .expect(200);
    const c2 = (await login().expect(200)).body.challenge;
    await bff()
      .post('/auth/login/mfa')
      .send({ challenge: c2, code: rc })
      .expect(401);
  });

  it('a challenge dies after 5 wrong codes', async () => {
    const { challenge } = (await login().expect(200)).body;
    for (let i = 0; i < 5; i++) {
      await bff()
        .post('/auth/login/mfa')
        .send({ challenge, code: '000000' })
        .expect(401);
    }
    const res = await bff()
      .post('/auth/login/mfa')
      .send({ challenge, code: code(secret, 1) })
      .expect(401);
    expect(res.body.message).toMatch(/expired/);
  });

  it('an expired challenge is refused', async () => {
    const { challenge } = (await login().expect(200)).body;
    await owner.query(
      `UPDATE mfa_challenges SET created_at = now() - interval '10 minutes', expires_at = now() - interval '1 second'`,
    );
    await bff()
      .post('/auth/login/mfa')
      .send({ challenge, code: code(secret, 1) })
      .expect(401);
  });

  it('a made-up challenge is refused', async () => {
    await bff()
      .post('/auth/login/mfa')
      .send({ challenge: 'x'.repeat(43), code: code(secret, 1) })
      .expect(401);
  });
});

describe('turning two-factor off', () => {
  it('needs the password and a current code', async () => {
    const token = await setupOwner();
    const { secret } = await enrol(token);
    await authed(bff().post('/auth/totp/disable'), token)
      .send({ password: 'wrong password here', code: code(secret, 1) })
      .expect(401);
    await authed(bff().post('/auth/totp/disable'), token)
      .send({ password: PASSWORD, code: '000000' })
      .expect(401);
    await authed(bff().post('/auth/totp/disable'), token)
      .send({ password: PASSWORD, code: code(secret, 1) })
      .expect(204);
    const me = await authed(bff().get('/auth/me'), token).expect(200);
    expect(me.body.totpEnabled).toBe(false);
    await login()
      .expect(200)
      .expect((r) => expect(r.body.token).toBeDefined());
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM recovery_codes',
    );
    expect(rows[0].n).toBe(0);
  });
});
