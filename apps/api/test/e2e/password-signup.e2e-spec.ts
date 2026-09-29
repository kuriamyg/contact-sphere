import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { LOGIN_FAILURES_MAX } from '../../src/auth/auth.constants';
import { LogOtpSms, OTP_SMS } from '../../src/auth/otp-sms';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
} from '../support/test-app';

const PHONE = '+254712000303';
const PASSWORD = 'orange piano window cloud';
const NEW_PASSWORD = 'blue kettle river stone';
const KEY = /^[2-9A-HJ-NP-Z]{4}(-[2-9A-HJ-NP-Z]{4}){3}$/;

let app: NestExpressApplication;
let server: App;
let owner: Client;
let sms: LogOtpSms;
let ip = 0;

type Method = 'get' | 'post';
const api = (method: Method, url: string, token?: string) => {
  const r = request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.10.${++ip % 250}`);
  return token ? r.set('authorization', `Session ${token}`) : r;
};

async function register(
  phone = PHONE,
): Promise<{ token: string; recoveryKey: string }> {
  const res = await api('post', '/auth/register')
    .send({ phone, password: PASSWORD })
    .expect(201);
  return res.body as { token: string; recoveryKey: string };
}

beforeAll(async () => {
  ({ app } = await createTestApp({
    OPEN_SIGNUP: 'on',
    SIGNUP_METHODS: 'password,sms',
    OTP_SMS_PROVIDER: 'log',
  }));
  server = app.getHttpServer();
  sms = app.get<LogOtpSms>(OTP_SMS);
  owner = ownerClient();
  await owner.connect();
});
beforeEach(async () => {
  await resetDatabase(owner);
  await owner.query('DELETE FROM phone_codes');
  sms.sent.length = 0;
});
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('sign-up with a phone number and a password (ADR 0021)', () => {
  it('is offered only where SIGNUP_METHODS lists it', async () => {
    const status = await api('get', '/auth/signup').expect(200);
    expect(status.body).toMatchObject({ open: true, password: true });
    const { app: closed } = await createTestApp();
    await request(closed.getHttpServer())
      .post('/auth/register')
      .set('x-bff-secret', TEST_SECRET)
      .set('x-client-ip', '198.18.11.1')
      .send({ phone: PHONE, password: PASSWORD })
      .expect(404);
    await closed.close();
  });

  it('makes an account with no code: signed in, unverified, on the trial, with a recovery key', async () => {
    const res = await api('post', '/auth/register')
      .set('x-client-ua', 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile')
      .send({
        phone: '0712 000 303',
        password: PASSWORD,
        displayName: ' Achieng ',
        locale: 'sw',
      })
      .expect(201);
    expect(res.body.user).toMatchObject({ phone: PHONE, email: null });
    expect(res.body.recoveryKey).toMatch(KEY);
    expect(sms.sent).toHaveLength(0);
    const me = await api('get', '/auth/me', res.body.token as string).expect(
      200,
    );
    expect(me.body).toMatchObject({
      phone: PHONE,
      phoneVerified: false,
      hasRecoveryKey: true,
      hasPassword: true,
      displayName: 'Achieng',
      locale: 'sw',
      plan: 'plus',
    });
    // Only a hash of the key is stored; the audit log holds no number.
    const { rows } = await owner.query<{ h: string }>(
      'SELECT recovery_key_hash h FROM users',
    );
    expect(rows[0].h).toMatch(/^[0-9a-f]{64}$/);
    const key = (res.body.recoveryKey as string).replace(/-/g, '');
    expect(rows[0].h).not.toContain(key);
    const audit = (
      await owner.query<{ m: string }>(
        'SELECT action || metadata::text AS m FROM audit_logs',
      )
    ).rows
      .map((r) => r.m)
      .join(' ');
    expect(audit).toContain('auth.signup_completed{"method": "password"}');
    expect(audit).not.toMatch(/712000303|Achieng/);
  });

  it('refuses a taken number, a non-Kenyan number and a weak password', async () => {
    await register();
    const taken = await api('post', '/auth/register')
      .send({ phone: '254712000303', password: 'another long passphrase' })
      .expect(409);
    expect(taken.body.message).toMatch(/already has an account/);
    const foreign = await api('post', '/auth/register')
      .send({ phone: '+44 7700 900123', password: PASSWORD })
      .expect(400);
    expect(foreign.body.message).toMatch(/Kenyan mobile number/);
    await api('post', '/auth/register')
      .send({ phone: '0712000304', password: 'short' })
      .expect(400);
  });

  it('signs in with the number and password like any account', async () => {
    await register();
    await api('post', '/auth/login')
      .send({ phone: '0712 000 303', password: PASSWORD })
      .expect(200);
  });

  it('never texts a reset code to a number nobody proved', async () => {
    await register();
    await api('post', '/auth/reset/code').send({ phone: PHONE }).expect(204);
    expect(sms.sent).toHaveLength(0);
  });
});

describe('forgot password with the recovery key', () => {
  it('sets the new password, signs every device out and swaps the key', async () => {
    const { token, recoveryKey } = await register();
    // Typed loosely: lower case, spaces instead of dashes.
    const typed = recoveryKey.toLowerCase().replace(/-/g, ' ');
    const res = await api('post', '/auth/recover')
      .send({
        identifier: '0712000303',
        recoveryKey: typed,
        newPassword: NEW_PASSWORD,
      })
      .expect(200);
    expect(res.body.recoveryKey).toMatch(KEY);
    expect(res.body.recoveryKey).not.toBe(recoveryKey);
    await api('get', '/auth/me', token).expect(401);
    await api('post', '/auth/login')
      .send({ phone: PHONE, password: NEW_PASSWORD })
      .expect(200);
    // A key works once.
    await api('post', '/auth/recover')
      .send({ identifier: PHONE, recoveryKey, newPassword: PASSWORD })
      .expect(400);
    const { rows } = await owner.query<{ action: string }>(
      "SELECT action FROM audit_logs WHERE action = 'auth.password_recovered'",
    );
    expect(rows).toHaveLength(1);
  });

  it('one answer for a wrong key or an unknown number; wrong keys lock the account', async () => {
    await register();
    const unknown = await api('post', '/auth/recover')
      .send({
        identifier: '0799000999',
        recoveryKey: 'AAAA-BBBB-CCCC-DDDD',
        newPassword: NEW_PASSWORD,
      })
      .expect(400);
    for (let i = 0; i < LOGIN_FAILURES_MAX; i++) {
      const wrong = await api('post', '/auth/recover')
        .send({
          identifier: PHONE,
          recoveryKey: 'AAAA-BBBB-CCCC-DDDD',
          newPassword: NEW_PASSWORD,
        })
        .expect(400);
      expect(wrong.body.message).toBe(unknown.body.message);
    }
    // Locked: even the right password cannot sign in now.
    await api('post', '/auth/login')
      .send({ phone: PHONE, password: PASSWORD })
      .expect(429);
  });

  it('a weak new password spends no attempt', async () => {
    const { recoveryKey } = await register();
    await api('post', '/auth/recover')
      .send({ identifier: PHONE, recoveryKey, newPassword: 'short' })
      .expect(400);
    await api('post', '/auth/recover')
      .send({ identifier: PHONE, recoveryKey, newPassword: NEW_PASSWORD })
      .expect(200);
  });
});

describe('a new recovery key from the profile', () => {
  it('needs the password; the old key stops working', async () => {
    const { token, recoveryKey } = await register();
    await api('post', '/auth/recovery-key', token)
      .send({ password: 'not my password at all' })
      .expect(401);
    const res = await api('post', '/auth/recovery-key', token)
      .send({ password: PASSWORD })
      .expect(200);
    expect(res.body.recoveryKey).toMatch(KEY);
    await api('post', '/auth/recover')
      .send({ identifier: PHONE, recoveryKey, newPassword: NEW_PASSWORD })
      .expect(400);
    await api('post', '/auth/recover')
      .send({
        identifier: PHONE,
        recoveryKey: res.body.recoveryKey as string,
        newPassword: NEW_PASSWORD,
      })
      .expect(200);
  });
});
