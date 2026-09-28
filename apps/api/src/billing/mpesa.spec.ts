import type { MpesaConfig } from '../config/env';
import { DarajaMpesa, darajaTimestamp, parseStkCallback } from './mpesa';

const CFG: MpesaConfig = {
  provider: 'daraja',
  environment: 'sandbox',
  consumerKey: 'key',
  consumerSecret: 'secret',
  shortcode: '174379',
  passkey: 'passkey-for-tests-only-000',
  type: 'paybill',
  partyB: '174379',
  callbackToken: 't'.repeat(32),
};

const json = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

describe('darajaTimestamp', () => {
  it('is Nairobi time, yyyyMMddHHmmss', () => {
    expect(darajaTimestamp(new Date('2026-09-28T21:30:05Z'))).toBe(
      '20260929003005',
    );
  });
});

describe('DarajaMpesa', () => {
  it('gets a token once, then sends the prompt with the right fields', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const http = ((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('/oauth/')) {
        return json(200, { access_token: 'tok', expires_in: '3599' });
      }
      return json(200, {
        ResponseCode: '0',
        CheckoutRequestID: 'ws_CO_1',
        MerchantRequestID: 'm',
      });
    }) as typeof fetch;
    const d = new DarajaMpesa(CFG, http);
    const req = {
      phone: '254712000303',
      amountKes: 99,
      reference: 'ContactSphere',
      callbackUrl: 'https://example.test/cb',
    };
    expect(await d.stkPush(req)).toEqual({ ok: true, checkoutId: 'ws_CO_1' });
    await d.stkPush(req);
    expect(calls.filter((c) => c.url.includes('/oauth/'))).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    );
    expect(
      (calls[0].init?.headers as Record<string, string>).authorization,
    ).toBe(`Basic ${Buffer.from('key:secret').toString('base64')}`);
    const sent = JSON.parse(calls[1].init?.body as string) as Record<
      string,
      unknown
    >;
    expect(sent).toMatchObject({
      BusinessShortCode: '174379',
      TransactionType: 'CustomerPayBillOnline',
      Amount: 99,
      PartyA: '254712000303',
      PartyB: '174379',
      PhoneNumber: '254712000303',
      CallBackURL: 'https://example.test/cb',
      AccountReference: 'ContactSphere'.slice(0, 12),
    });
    const ts = sent.Timestamp as string;
    expect(Buffer.from(sent.Password as string, 'base64').toString()).toBe(
      `174379${CFG.passkey}${ts}`,
    );
  });

  it('reports a refusal instead of throwing', async () => {
    const http = ((url: string) =>
      url.includes('/oauth/')
        ? json(200, { access_token: 'tok', expires_in: 3599 })
        : json(400, { errorMessage: 'Invalid PhoneNumber' })) as typeof fetch;
    const r = await new DarajaMpesa(CFG, http).stkPush({
      phone: '254700',
      amountKes: 99,
      reference: 'x',
      callbackUrl: 'https://example.test/cb',
    });
    expect(r).toEqual({ ok: false, reason: 'Invalid PhoneNumber' });
    const down = (() => Promise.reject(new Error('down'))) as typeof fetch;
    expect(
      await new DarajaMpesa(CFG, down).stkPush({
        phone: '254712000303',
        amountKes: 99,
        reference: 'x',
        callbackUrl: 'https://example.test/cb',
      }),
    ).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('reads query answers: paid, cancelled, still processing', async () => {
    const answers = [
      json(200, { ResponseCode: '0', ResultCode: '0', ResultDesc: 'ok' }),
      json(200, {
        ResponseCode: '0',
        ResultCode: '1032',
        ResultDesc: 'Request cancelled by user',
      }),
      json(500, {
        errorCode: '500.001.1001',
        errorMessage: 'The transaction is being processed',
      }),
    ];
    const http = ((url: string) =>
      url.includes('/oauth/')
        ? json(200, { access_token: 'tok', expires_in: 3599 })
        : answers.shift()) as typeof fetch;
    const d = new DarajaMpesa({ ...CFG, environment: 'production' }, http);
    expect(d.base).toBe('https://api.safaricom.co.ke');
    expect(await d.query('a')).toEqual({ state: 'paid' });
    expect(await d.query('b')).toEqual({
      state: 'failed',
      resultDesc: 'Request cancelled by user',
    });
    expect(await d.query('c')).toEqual({ state: 'pending' });
  });

  it('uses Buy Goods for a till', async () => {
    let sent: Record<string, unknown> = {};
    const http = ((url: string, init?: RequestInit) => {
      if (url.includes('/oauth/')) {
        return json(200, { access_token: 'tok', expires_in: 3599 });
      }
      sent = JSON.parse(init?.body as string) as Record<string, unknown>;
      return json(200, { ResponseCode: '0', CheckoutRequestID: 'x' });
    }) as typeof fetch;
    await new DarajaMpesa(
      { ...CFG, type: 'till', shortcode: '600000', partyB: '5123456' },
      http,
    ).stkPush({
      phone: '254712000303',
      amountKes: 990,
      reference: 'x',
      callbackUrl: 'https://example.test/cb',
    });
    expect(sent).toMatchObject({
      BusinessShortCode: '600000',
      PartyB: '5123456',
      TransactionType: 'CustomerBuyGoodsOnline',
    });
  });
});

describe('parseStkCallback', () => {
  it('reads a paid callback and ignores anything else', () => {
    expect(
      parseStkCallback({
        Body: {
          stkCallback: {
            CheckoutRequestID: 'ws_CO_1',
            ResultCode: 0,
            ResultDesc: 'ok',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 99 },
                { Name: 'MpesaReceiptNumber', Value: 'SJK3ABCD12' },
              ],
            },
          },
        },
      }),
    ).toEqual({
      checkoutId: 'ws_CO_1',
      resultCode: 0,
      resultDesc: 'ok',
      amount: 99,
      receipt: 'SJK3ABCD12',
    });
    expect(parseStkCallback({})).toBeNull();
    expect(parseStkCallback('nonsense')).toBeNull();
    expect(
      parseStkCallback({
        Body: { stkCallback: { CheckoutRequestID: 'x', ResultCode: 'no' } },
      }),
    ).toBeNull();
  });
});
