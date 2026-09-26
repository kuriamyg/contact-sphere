import type { SmsConfig } from '../config/env';
import { PartnerSmsProvider } from './sms-provider';

const cfg: SmsConfig = {
  provider: 'partner',
  url: 'https://sms.example/api/services/',
  apiKey: 'key',
  partnerId: '123',
  senderId: 'CSPHERE',
  monthlyLimit: 100,
  priceCents: 35,
};

const ok = (codes: number[]) =>
  new Response(
    JSON.stringify({
      responses: codes.map((c) => ({ 'response-code': c })),
    }),
    { status: 200 },
  );

describe('PartnerSmsProvider', () => {
  it('posts batches of 20 to sendbulk and counts accepted messages', async () => {
    const calls: {
      url: string;
      body: { count: number; smslist: Record<string, unknown>[] };
    }[] = [];
    const http = ((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as (typeof calls)[0]['body'];
      calls.push({ url, body });
      return Promise.resolve(
        ok(body.smslist.map((_, i) => (i === 0 ? 1004 : 200))),
      );
    }) as unknown as typeof fetch;
    const to = Array.from(
      { length: 45 },
      (_, i) => `+2547${String(i).padStart(8, '0')}`,
    );
    const r = await new PartnerSmsProvider(cfg, http).send(to, 'Habari');
    expect(calls.map((c) => c.body.count)).toEqual([20, 20, 5]);
    expect(calls[0].url).toBe('https://sms.example/api/services/sendbulk/');
    expect(calls[0].body.smslist[0]).toEqual({
      partnerID: '123',
      apikey: 'key',
      pass_type: 'plain',
      clientsmsid: 1,
      mobile: '254700000000',
      message: 'Habari',
      shortcode: 'CSPHERE',
    });
    // One rejected per batch.
    expect(r.accepted).toBe(42);
  });

  it('counts a failed batch as not accepted and carries on', async () => {
    let n = 0;
    const http = (() => {
      n += 1;
      return n === 1
        ? Promise.reject(new Error('network'))
        : Promise.resolve(ok([200]));
    }) as unknown as typeof fetch;
    const to = Array.from(
      { length: 21 },
      (_, i) => `+2547${String(i).padStart(8, '0')}`,
    );
    expect(
      (await new PartnerSmsProvider(cfg, http).send(to, 'x')).accepted,
    ).toBe(1);
  });
});
