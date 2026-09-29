import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { LogOtpSms, OTP_SMS } from '../../src/auth/otp-sms';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
} from '../support/test-app';

const PHONE = '+254712000101';
const PASSWORD = 'orange piano window cloud';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let sms: LogOtpSms;
let ip = 0;

type Method = 'get' | 'post' | 'put';
const api = (method: Method, url: string, token?: string) => {
  const r = request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.8.${++ip % 250}`);
  return token ? r.set('authorization', `Session ${token}`) : r;
};

/** The 6-digit code in the last text to `phone`. */
function lastCode(phone = PHONE): string {
  const msg = [...sms.sent].reverse().find((m) => m.to === phone);
  const code = /(\d{6})/.exec(msg?.text ?? '')?.[1];
  if (!code) throw new Error(`no code texted to ${phone}`);
  return code;
}

/** Lets the one-a-minute rule pass without waiting. */
const ageCodes = () =>
  owner.query(
    "UPDATE phone_codes SET created_at = created_at - interval '2 minutes'",
  );

async function signUp(phone = PHONE): Promise<string> {
  await api('post', '/auth/signup/code').send({ phone }).expect(204);
  const res = await api('post', '/auth/signup')
    .send({ phone, code: lastCode(phone), password: PASSWORD })
    .expect(201);
  return res.body.token as string;
}

beforeAll(async () => {
  ({ app } = await createTestApp({
    OPEN_SIGNUP: 'on',
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

describe('open sign-up (B6)', () => {
  it('says whether sign-up is open; off by default elsewhere', async () => {
    expect((await api('get', '/auth/signup').expect(200)).body).toEqual({
      open: true,
    });
    const { app: closed } = await createTestApp();
    const s = closed.getHttpServer();
    const res = await request(s)
      .get('/auth/signup')
      .set('x-bff-secret', TEST_SECRET)
      .expect(200);
    expect(res.body).toEqual({ open: false });
    await request(s)
      .post('/auth/signup/code')
      .set('x-bff-secret', TEST_SECRET)
      .set('x-client-ip', '198.18.9.1')
      .send({ phone: PHONE })
      .expect(404);
    await closed.close();
  });

  it('texts a 6-digit code to a Kenyan mobile, in the chosen language', async () => {
    await api('post', '/auth/signup/code')
      .send({ phone: '0712 000 101', locale: 'sw' })
      .expect(204);
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].to).toBe(PHONE);
    expect(sms.sent[0].text).toMatch(
      /^Msimbo wako wa uthibitisho wa Contact Sphere ni (\d{6})\./,
    );
    // Android fills the code in from the last line, for our site only.
    expect(sms.sent[0].text).toMatch(/\n\n@localhost:3000 #\d{6}$/);
    expect(sms.sent[0].text.length).toBeLessThanOrEqual(160);
    const { rows } = await owner.query<{ code_hash: string }>(
      'SELECT code_hash FROM phone_codes',
    );
    expect(rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].code_hash).not.toContain(lastCode());
  });

  it('says so when the line blocks messages from companies (DND)', async () => {
    jest.spyOn(sms, 'send').mockResolvedValueOnce({
      ok: false,
      blocked: true,
      reason: 'UserInBlacklist (406)',
    });
    const res = await api('post', '/auth/signup/code')
      .send({ phone: PHONE })
      .expect(422);
    expect(res.body.message).toMatch(/Do Not Disturb/);
    jest.spyOn(sms, 'send').mockResolvedValueOnce({
      ok: false,
      blocked: false,
      reason: 'HTTP 500',
    });
    const other = await api('post', '/auth/signup/code')
      .send({ phone: '+254712000909' })
      .expect(503);
    expect(other.body.message).toMatch(/Could not send the code/);
    // Neither failure leaves a code behind or uses up the number's limit.
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM phone_codes',
    );
    expect(rows[0].n).toBe(0);
  });

  it('refuses numbers that are not Kenyan mobiles', async () => {
    for (const phone of ['020 222 2222', '+44 7700 900123', 'hello']) {
      const res = await api('post', '/auth/signup/code')
        .send({ phone })
        .expect(400);
      expect(res.body.message).toMatch(/Kenyan mobile number/);
    }
    expect(sms.sent).toHaveLength(0);
  });

  it('one code a minute and five a day per number', async () => {
    await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    const soon = await api('post', '/auth/signup/code')
      .send({ phone: PHONE })
      .expect(429);
    expect(soon.body.message).toMatch(/Wait a minute/);
    for (let i = 0; i < 4; i++) {
      await ageCodes();
      await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    }
    await ageCodes();
    const day = await api('post', '/auth/signup/code')
      .send({ phone: PHONE })
      .expect(429);
    expect(day.body.message).toMatch(/Too many codes/);
    expect(sms.sent).toHaveLength(5);
  });

  it('makes a phone-only account with the right code, and signs it in', async () => {
    await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    const res = await api('post', '/auth/signup')
      .set('x-client-ua', 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile')
      .send({
        phone: '0712000101',
        code: lastCode(),
        password: PASSWORD,
        displayName: '  Wanjiru  ',
        locale: 'sw',
      })
      .expect(201);
    expect(res.body.user).toMatchObject({ email: null, phone: PHONE });
    const me = await api('get', '/auth/me', res.body.token as string).expect(
      200,
    );
    expect(me.body).toMatchObject({
      phone: PHONE,
      email: null,
      displayName: 'Wanjiru',
      locale: 'sw',
    });
    // Codes are used up; the audit log never holds the number.
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM phone_codes',
    );
    expect(rows[0].n).toBe(0);
    const audit = (
      await owner.query<{ m: string }>(
        'SELECT action || metadata::text AS m FROM audit_logs',
      )
    ).rows
      .map((r) => r.m)
      .join(' ');
    expect(audit).toContain('auth.signup_completed');
    expect(audit).not.toMatch(/712000101|Wanjiru/);
  });

  it('a wrong code costs one of five tries; then the code is dead', async () => {
    await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    const right = lastCode();
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await api('post', '/auth/signup')
        .send({ phone: PHONE, code: wrong, password: PASSWORD })
        .expect(400);
      expect(r.body.message).toBe('That code is not right.');
    }
    const dead = await api('post', '/auth/signup')
      .send({ phone: PHONE, code: right, password: PASSWORD })
      .expect(400);
    expect(dead.body.message).toMatch(/expired/);
  });

  it('checks the password before spending the code', async () => {
    await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    await api('post', '/auth/signup')
      .send({ phone: PHONE, code: lastCode(), password: 'short' })
      .expect(400);
    await api('post', '/auth/signup')
      .send({ phone: PHONE, code: lastCode(), password: PASSWORD })
      .expect(201);
  });

  it('an existing number is told so by text, never by the API', async () => {
    await signUp();
    await ageCodes();
    await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    expect(sms.sent.at(-1)?.text).toMatch(
      /already has a Contact Sphere account/,
    );
    expect(sms.sent.at(-1)?.text).not.toMatch(/\d{6}/);
    await api('post', '/auth/signup')
      .send({ phone: PHONE, code: '123456', password: PASSWORD })
      .expect(400);
  });
});

describe('signing in with a phone number', () => {
  it('works however the number is written; wrong passwords count', async () => {
    await signUp();
    for (const phone of ['0712 000 101', '+254712000101', '254712000101']) {
      await api('post', '/auth/login')
        .send({ phone, password: PASSWORD })
        .expect(200);
    }
    const bad = await api('post', '/auth/login')
      .send({ phone: PHONE, password: 'wrong password here' })
      .expect(401);
    expect(bad.body.message).toBe('Those sign-in details are not right.');
    const { rows } = await owner.query<{ failures: number }>(
      'SELECT failures FROM login_failures',
    );
    expect(rows[0].failures).toBe(1);
  });

  it('needs an email or a phone', async () => {
    await api('post', '/auth/login').send({ password: PASSWORD }).expect(400);
  });
});

describe('forgot password, by SMS', () => {
  it('texts a code only to numbers with an account; same answer either way', async () => {
    await api('post', '/auth/reset/code')
      .send({ phone: '0799 000 707' })
      .expect(204);
    expect(sms.sent).toHaveLength(0);
    await signUp();
    await api('post', '/auth/reset/code').send({ phone: PHONE }).expect(204);
    expect(sms.sent.at(-1)?.text).toMatch(
      /^Your Contact Sphere verification code is \d{6}\./,
    );
    expect(sms.sent.at(-1)?.text.length).toBeLessThanOrEqual(160);
  });

  it('sets the new password and signs every device out', async () => {
    const token = await signUp();
    await api('post', '/auth/reset/code').send({ phone: PHONE }).expect(204);
    await api('post', '/auth/reset')
      .send({
        phone: PHONE,
        code: lastCode(),
        newPassword: 'blue kettle river stone',
      })
      .expect(204);
    await api('get', '/auth/me', token).expect(401);
    await api('post', '/auth/login')
      .send({ phone: PHONE, password: PASSWORD })
      .expect(401);
    await api('post', '/auth/login')
      .send({ phone: PHONE, password: 'blue kettle river stone' })
      .expect(200);
    const { rows } = await owner.query<{ action: string }>(
      "SELECT action FROM audit_logs WHERE action = 'auth.password_reset'",
    );
    expect(rows).toHaveLength(1);
  });

  it('a code for sign-up does not reset a password', async () => {
    await signUp();
    await ageCodes();
    await api('post', '/auth/signup/code').send({ phone: PHONE }).expect(204);
    await api('post', '/auth/reset')
      .send({
        phone: PHONE,
        code: '123456',
        newPassword: 'blue kettle river stone',
      })
      .expect(400);
  });
});

describe('phone-only accounts elsewhere', () => {
  it('cannot switch on email reminders without an email', async () => {
    const token = await signUp();
    const res = await api('put', '/reach/email', token)
      .send({ on: true })
      .expect((r) => expect([400, 403]).toContain(r.status));
    expect(res.body.message).toMatch(/email/i);
  });
});
