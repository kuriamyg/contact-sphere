import { AfricasTalkingOtpSms } from './otp-sms';

const reply = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

describe("Africa's Talking codes", () => {
  it('posts the form to the sandbox for the sandbox user, with the key header', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const sms = new AfricasTalkingOtpSms(
      {
        provider: 'africastalking',
        username: 'sandbox',
        apiKey: 'k'.repeat(30),
      },
      ((url: string, init: RequestInit) => {
        calls.push({ url, init });
        return reply(201, {
          SMSMessageData: {
            Recipients: [{ statusCode: 101, status: 'Success' }],
          },
        });
      }) as unknown as typeof fetch,
    );
    expect(await sms.send('+254712000101', 'Your code is 123456')).toEqual({
      ok: true,
    });
    expect(calls[0].url).toBe(
      'https://api.sandbox.africastalking.com/version1/messaging',
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.apiKey).toBe('k'.repeat(30));
    const form = new URLSearchParams(calls[0].init.body as string);
    expect(form.get('username')).toBe('sandbox');
    expect(form.get('to')).toBe('+254712000101');
    expect(form.has('from')).toBe(false);
  });

  it('uses the live API and the sender ID for a real account', async () => {
    let url = '';
    let body = '';
    const sms = new AfricasTalkingOtpSms(
      {
        provider: 'africastalking',
        username: 'contactsphere',
        apiKey: 'k'.repeat(30),
        senderId: 'ContactSph',
      },
      ((u: string, init: RequestInit) => {
        url = u;
        body = init.body as string;
        return reply(201, {
          SMSMessageData: { Recipients: [{ statusCode: 102 }] },
        });
      }) as unknown as typeof fetch,
    );
    expect(await sms.send('+254712000101', 'x')).toEqual({ ok: true });
    expect(url).toBe('https://api.africastalking.com/version1/messaging');
    expect(new URLSearchParams(body).get('from')).toBe('ContactSph');
  });

  it('reports why a send was refused, never the number', async () => {
    const make = (f: () => Promise<Response>) =>
      new AfricasTalkingOtpSms(
        { provider: 'africastalking', username: 'x', apiKey: 'k'.repeat(30) },
        f,
      );
    const recipient = (statusCode: number, status: string) => () =>
      reply(201, { SMSMessageData: { Recipients: [{ statusCode, status }] } });
    expect(
      await make(recipient(403, 'InvalidPhoneNumber')).send(
        '+254712000101',
        'x',
      ),
    ).toEqual({
      ok: false,
      blocked: false,
      reason: 'InvalidPhoneNumber (403)',
    });
    // Do Not Disturb: only the line's owner can change it.
    expect(
      await make(recipient(406, 'UserInBlacklist')).send('+254712000101', 'x'),
    ).toEqual({ ok: false, blocked: true, reason: 'UserInBlacklist (406)' });
    expect(await make(() => reply(401, {})).send('+254712000101', 'x')).toEqual(
      { ok: false, blocked: false, reason: 'HTTP 401' },
    );
    expect(
      await make(() => Promise.reject(new Error('down'))).send(
        '+254712000101',
        'x',
      ),
    ).toEqual({ ok: false, blocked: false, reason: 'unreachable' });
  });
});
