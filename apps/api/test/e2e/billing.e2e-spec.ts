import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { LogOtpSms, OTP_SMS } from '../../src/auth/otp-sms';
import { LogMpesa, MPESA } from '../../src/billing/mpesa';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
  TEST_SETUP_TOKEN,
} from '../support/test-app';

const TOKEN = 'cb'.repeat(32);
const PHONE = '+254712000303';
const PASSWORD = 'orange piano window cloud';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let sms: LogOtpSms;
let mpesa: LogMpesa;
let ip = 0;

type Method = 'get' | 'post' | 'put';
const api = (method: Method, url: string, token?: string) => {
  const r = request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.7.${++ip % 250}`);
  return token ? r.set('authorization', `Session ${token}`) : r;
};
const body = (res: { body: unknown }) => res.body as Record<string, unknown>;

async function operator(): Promise<string> {
  const res = await api('post', '/auth/setup')
    .send({
      setupToken: TEST_SETUP_TOKEN,
      email: 'owner@example.com',
      password: PASSWORD,
    })
    .expect(201);
  return body(res).token as string;
}

async function member(phone = PHONE): Promise<{ token: string; id: string }> {
  await api('post', '/auth/signup/code').send({ phone }).expect(204);
  const code = /(\d{6})/.exec(sms.sent.at(-1)?.text ?? '')?.[1];
  const res = await api('post', '/auth/signup')
    .send({ phone, code, password: PASSWORD })
    .expect(201);
  const b = body(res);
  return { token: b.token as string, id: (b.user as { id: string }).id };
}

/** Ends a member's Plus (trial) now. */
const expire = (id: string) =>
  owner.query(
    "UPDATE users SET plus_until = now() - interval '1 minute' WHERE id = $1",
    [id],
  );

const callback = (checkoutId: string, resultCode: number, extra = {}) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'm-1',
      CheckoutRequestID: checkoutId,
      ResultCode: resultCode,
      ResultDesc:
        resultCode === 0
          ? 'The service request is processed successfully.'
          : 'Request cancelled by user',
      ...extra,
    },
  },
});
const paidMeta = (amount: number, receipt = 'SJK3ABCD12') => ({
  CallbackMetadata: {
    Item: [
      { Name: 'Amount', Value: amount },
      { Name: 'MpesaReceiptNumber', Value: receipt },
      { Name: 'TransactionDate', Value: 20260928193000 },
      { Name: 'PhoneNumber', Value: 254712000303 },
    ],
  },
});

beforeAll(async () => {
  ({ app } = await createTestApp({
    OPEN_SIGNUP: 'on',
    OTP_SMS_PROVIDER: 'log',
    MPESA_PROVIDER: 'log',
    MPESA_CALLBACK_TOKEN: TOKEN,
    BILLING_PAY_TO: 'Send Money to 0700 000 000 (Example)',
    EMAIL_PROVIDER: 'log',
  }));
  server = app.getHttpServer();
  sms = app.get<LogOtpSms>(OTP_SMS);
  mpesa = app.get<LogMpesa>(MPESA);
  owner = ownerClient();
  await owner.connect();
});
beforeEach(async () => {
  await resetDatabase(owner);
  sms.sent.length = 0;
  mpesa.pushed.length = 0;
  mpesa.outcomes.clear();
});
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('plans', () => {
  it('the first account runs the service and always has Plus', async () => {
    const t = await operator();
    const me = body(await api('get', '/auth/me', t).expect(200));
    expect(me).toMatchObject({ operator: true, plan: 'plus' });
    const b = body(await api('get', '/billing', t).expect(200));
    expect(b).toMatchObject({
      plan: 'plus',
      operator: true,
      mpesa: true,
      payTo: 'Send Money to 0700 000 000 (Example)',
      prices: [
        { months: 1, amountKes: 99 },
        { months: 12, amountKes: 990 },
      ],
    });
  });

  it('sign-up starts a 30-day Plus trial', async () => {
    const { token } = await member();
    const me = body(await api('get', '/auth/me', token).expect(200));
    expect(me).toMatchObject({ operator: false, plan: 'plus' });
    const days = (Date.parse(me.plusUntil as string) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('the free plan holds 3 groups; old groups stay', async () => {
    const { token, id } = await member();
    for (const name of ['Chama', 'Church', 'Family', 'Work']) {
      await api('post', '/groups', token).send({ name }).expect(201);
    }
    await expire(id);
    const res = await api('post', '/groups', token)
      .send({ name: 'Football' })
      .expect(403);
    expect(body(res).message).toBe(
      'The free plan holds 3 groups. Plus has no limit.',
    );
    const list = await api('get', '/groups', token).expect(200);
    expect(list.body).toHaveLength(4);
  });

  it('morning reminders need Plus, and lapsed accounts get none', async () => {
    const op = await operator();
    const { token, id } = await member();
    await expire(id);
    const res = await api('put', '/reach/email', token)
      .send({ on: true })
      .expect(403);
    expect(body(res).message).toBe('Morning reminders are part of Plus.');

    // A lapsed account that had email reminders on before: skipped.
    await owner.query(
      "UPDATE users SET email = 'member@example.com', digest_email = true WHERE id = $1",
      [id],
    );
    const nairobi = new Date(Date.now() + 3 * 3600e3)
      .toISOString()
      .slice(0, 10);
    const c = await api('post', '/contacts', token)
      .send({ displayName: 'Achieng', phones: [{ raw: '0722 456 789' }] })
      .expect(201);
    await api(
      'post',
      `/remember/contacts/${body(c).id as string}/follow-ups`,
      token,
    )
      .send({ dueOn: nairobi, note: 'Ask about the harambee' })
      .expect(201);
    const skipped = await api('post', '/reach/digest/run').expect(200);
    expect(body(skipped)).toMatchObject({ emailed: 0 });

    await api('post', `/operator/accounts/${id}/grant`, op)
      .send({ months: 1 })
      .expect(204);
    await owner.query('UPDATE users SET digest_sent_on = NULL');
    const sent = await api('post', '/reach/digest/run').expect(200);
    expect(body(sent)).toMatchObject({ emailed: 1 });
  });
});

describe('paying with the M-Pesa prompt', () => {
  it('prompts the phone, and the callback credits exactly once', async () => {
    const { token, id } = await member();
    await expire(id);
    const start = await api('post', '/billing/mpesa', token)
      .send({ months: 1, phone: '0712 000 303' })
      .expect(201);
    const paymentId = body(start).paymentId as string;
    expect(mpesa.pushed).toHaveLength(1);
    expect(mpesa.pushed[0]).toMatchObject({
      phone: '254712000303',
      amountKes: 99,
      callbackUrl: `http://localhost:3000/api/mpesa/callback/${TOKEN}`,
    });
    const pending = await api(
      'get',
      `/billing/payments/${paymentId}`,
      token,
    ).expect(200);
    expect(body(pending).status).toBe('pending');

    const cb = callback(mpesa.pushed[0].checkoutId, 0, paidMeta(99));
    await api('post', `/billing/mpesa/callback/${TOKEN}`)
      .send(cb)
      .expect(200, { ResultCode: 0, ResultDesc: 'Accepted' });
    await api('post', `/billing/mpesa/callback/${TOKEN}`).send(cb).expect(200);

    const paid = body(
      await api('get', `/billing/payments/${paymentId}`, token).expect(200),
    );
    expect(paid).toMatchObject({ status: 'paid', receipt: 'SJK3ABCD12' });
    const me = body(await api('get', '/auth/me', token).expect(200));
    expect(me.plan).toBe('plus');
    const days = (Date.parse(me.plusUntil as string) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);
    const { rows } = await owner.query<{ n: number }>(
      "SELECT count(*)::int n FROM audit_logs WHERE action = 'billing.paid'",
    );
    expect(rows[0].n).toBe(1);
  });

  it('refuses callbacks with a wrong token, unknown id or wrong amount', async () => {
    const { token } = await member();
    await api('post', '/billing/mpesa', token)
      .send({ months: 12, phone: PHONE })
      .expect(201);
    const checkout = mpesa.pushed[0].checkoutId;
    await api('post', `/billing/mpesa/callback/${'x'.repeat(64)}`)
      .send(callback(checkout, 0, paidMeta(990)))
      .expect(404);
    await api('post', `/billing/mpesa/callback/${TOKEN}`)
      .send(callback('ws_CO_not_ours', 0, paidMeta(990)))
      .expect(200);
    await api('post', `/billing/mpesa/callback/${TOKEN}`)
      .send(callback(checkout, 0, paidMeta(1)))
      .expect(200);
    const { rows } = await owner.query<{ status: string; result_desc: string }>(
      'SELECT status, result_desc FROM payments',
    );
    expect(rows).toEqual([
      { status: 'failed', result_desc: 'Amount did not match.' },
    ]);
  });

  it('a cancelled prompt fails; the payment check asks M-Pesa when no callback came', async () => {
    const { token } = await member();
    const a = await api('post', '/billing/mpesa', token)
      .send({ months: 1, phone: PHONE })
      .expect(201);
    await api('post', `/billing/mpesa/callback/${TOKEN}`)
      .send(callback(mpesa.pushed[0].checkoutId, 1032))
      .expect(200);
    const failed = body(
      await api(
        'get',
        `/billing/payments/${body(a).paymentId as string}`,
        token,
      ),
    );
    expect(failed).toMatchObject({
      status: 'failed',
      resultDesc: 'Request cancelled by user',
    });

    await owner.query(
      "UPDATE payments SET created_at = created_at - interval '2 minutes'",
    );
    const b = await api('post', '/billing/mpesa', token)
      .send({ months: 1, phone: PHONE })
      .expect(201);
    mpesa.outcomes.set(mpesa.pushed[1].checkoutId, { state: 'paid' });
    await owner.query(
      "UPDATE payments SET created_at = created_at - interval '20 seconds' WHERE status = 'pending'",
    );
    const paid = body(
      await api(
        'get',
        `/billing/payments/${body(b).paymentId as string}`,
        token,
      ),
    );
    expect(paid.status).toBe('paid');
  });

  it('one prompt a minute; only 1 or 12 months', async () => {
    const { token } = await member();
    await api('post', '/billing/mpesa', token)
      .send({ months: 1, phone: PHONE })
      .expect(201);
    await api('post', '/billing/mpesa', token)
      .send({ months: 1, phone: PHONE })
      .expect(429);
    await api('post', '/billing/mpesa', token)
      .send({ months: 3, phone: PHONE })
      .expect(400);
  });

  it("someone else's payment is not found", async () => {
    const a = await member();
    const b = await member('+254712000404');
    const res = await api('post', '/billing/mpesa', a.token)
      .send({ months: 1, phone: PHONE })
      .expect(201);
    await api(
      'get',
      `/billing/payments/${body(res).paymentId as string}`,
      b.token,
    ).expect(404);
  });
});

describe('the operator', () => {
  it('sees accounts with counts only, and members cannot', async () => {
    const op = await operator();
    const m = await member();
    await api('post', '/contacts', m.token)
      .send({ displayName: 'Wanjiru', phones: [{ raw: '0722 111 222' }] })
      .expect(201);
    const list = (await api('get', '/operator/accounts', op).expect(200))
      .body as Record<string, unknown>[];
    expect(list).toHaveLength(2);
    const row = list.find((r) => r.id === m.id);
    expect(row).toMatchObject({
      phone: PHONE,
      plan: 'plus',
      contacts: 1,
      operator: false,
      paidKes: 0,
    });
    expect(JSON.stringify(list)).not.toContain('Wanjiru');
    await api('get', '/operator/accounts', m.token).expect(403);
    await api('post', `/operator/accounts/${m.id}/grant`, m.token)
      .send({ months: 1 })
      .expect(403);
  });

  it('grants free months and records hand payments once', async () => {
    const op = await operator();
    const m = await member();
    await expire(m.id);
    await api('post', `/operator/accounts/${m.id}/grant`, op)
      .send({ months: 3 })
      .expect(204);
    let me = body(await api('get', '/auth/me', m.token));
    expect(me.plan).toBe('plus');
    await api('post', `/operator/accounts/${m.id}/payments`, op)
      .send({ receipt: 'sjk3abcd12', amountKes: 99, months: 1 })
      .expect(204);
    const dup = await api('post', `/operator/accounts/${m.id}/payments`, op)
      .send({ receipt: 'SJK3ABCD12', amountKes: 99, months: 1 })
      .expect(409);
    expect(body(dup).message).toBe('That M-Pesa code is already recorded.');
    await api('post', `/operator/accounts/${m.id}/payments`, op)
      .send({ receipt: 'bad', amountKes: 99, months: 1 })
      .expect(400);
    me = body(await api('get', '/auth/me', m.token));
    const months =
      (Date.parse(me.plusUntil as string) - Date.now()) / (30 * 86_400_000);
    expect(months).toBeGreaterThan(3.8);
    expect(months).toBeLessThan(4.3);
    const b = body(await api('get', '/billing', m.token));
    expect(
      (b.payments as { method: string }[]).map((p) => p.method).sort(),
    ).toEqual(['grant', 'manual']);
  });

  it('payment records survive account deletion without the owner', async () => {
    const op = await operator();
    const m = await member();
    await api('post', `/operator/accounts/${m.id}/payments`, op)
      .send({ receipt: 'SJK3ABCD99', amountKes: 99, months: 1 })
      .expect(204);
    await api('post', '/auth/account/delete', m.token)
      .send({ password: PASSWORD, confirm: 'DELETE' })
      .expect(204);
    const { rows } = await owner.query<{
      owner_id: string | null;
      receipt: string;
    }>('SELECT owner_id, receipt FROM payments');
    expect(rows).toEqual([{ owner_id: null, receipt: 'SJK3ABCD99' }]);
  });
});
