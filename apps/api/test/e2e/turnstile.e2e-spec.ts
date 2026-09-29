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

// Cloudflare's published test keys; the fake provider accepts "pass".
const SITE_KEY = '1x00000000000000000000AA';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let sms: LogOtpSms;
let ip = 0;

const post = (url: string) =>
  request(server)
    .post(url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.14.${++ip % 250}`);

beforeAll(async () => {
  ({ app } = await createTestApp({
    OPEN_SIGNUP: 'on',
    SIGNUP_METHODS: 'password,sms',
    OTP_SMS_PROVIDER: 'log',
    TURNSTILE_SITE_KEY: SITE_KEY,
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    TURNSTILE_PROVIDER: 'fake',
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

describe('"not a robot" check on sign-up (C3)', () => {
  it('gives the page the public site key', async () => {
    const res = await request(server)
      .get('/auth/signup')
      .set('x-bff-secret', TEST_SECRET)
      .expect(200);
    expect(res.body).toMatchObject({ turnstileSiteKey: SITE_KEY });
  });

  it('password sign-up needs a good token', async () => {
    const body = { phone: '0712000401', password: 'orange piano window cloud' };
    const none = await post('/auth/register').send(body).expect(400);
    expect(none.body.message).toMatch(/not a robot/);
    await post('/auth/register')
      .send({ ...body, turnstileToken: 'forged' })
      .expect(400);
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM users',
    );
    expect(rows[0].n).toBe(0);
    await post('/auth/register')
      .send({ ...body, turnstileToken: 'pass' })
      .expect(201);
  });

  it('no SMS is sent without one — texts cost money', async () => {
    await post('/auth/signup/code').send({ phone: '0712000402' }).expect(400);
    await post('/auth/reset/code').send({ phone: '0712000402' }).expect(400);
    expect(sms.sent).toHaveLength(0);
    await post('/auth/signup/code')
      .send({ phone: '0712000402', turnstileToken: 'pass' })
      .expect(204);
    expect(sms.sent).toHaveLength(1);
  });
});
