import { CloudflareTurnstile, FakeTurnstile } from './turnstile';

const reply = (status: number, body: unknown) =>
  jest
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify(body), { status }),
    ) as unknown as typeof fetch;

describe('Turnstile (C3)', () => {
  it('asks Cloudflare with the secret and the token', async () => {
    const f = reply(200, { success: true });
    await expect(
      new CloudflareTurnstile('s3cret', f).verify('tok'),
    ).resolves.toBe(true);
    const [url, init] = (f as unknown as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect((init.body as URLSearchParams).toString()).toBe(
      'secret=s3cret&response=tok',
    );
  });

  it('refuses a bad or missing token without asking', async () => {
    const f = reply(200, {
      success: false,
      'error-codes': ['invalid-input-response'],
    });
    const t = new CloudflareTurnstile('s', f);
    await expect(t.verify('bad')).resolves.toBe(false);
    await expect(t.verify(undefined)).resolves.toBe(false);
    await expect(t.verify('x'.repeat(3000))).resolves.toBe(false);
    expect((f as unknown as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('lets people through when Cloudflare is down', async () => {
    const down = jest
      .fn()
      .mockRejectedValue(new Error('unreachable')) as unknown as typeof fetch;
    await expect(
      new CloudflareTurnstile('s', down).verify('tok'),
    ).resolves.toBe(true);
    await expect(
      new CloudflareTurnstile('s', reply(500, {})).verify('tok'),
    ).resolves.toBe(true);
  });

  it('fake: "pass" only', async () => {
    await expect(new FakeTurnstile().verify('pass')).resolves.toBe(true);
    await expect(new FakeTurnstile().verify('nope')).resolves.toBe(false);
  });
});
