import { generateKeyPairSync, sign } from 'node:crypto';

import { GoogleOidcClient, verifyIdToken } from './google-oidc';

const CLIENT = '123-abc.apps.googleusercontent.com';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' } as {
  kid: string;
  kty: string;
  n: string;
  e: string;
};
const NOW = Date.UTC(2026, 8, 29, 6, 0, 0);
const nowS = Math.floor(NOW / 1000);

function token(
  claims: Record<string, unknown>,
  { kid = 'k1', alg = 'RS256', key = privateKey } = {},
): string {
  const enc = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg, kid, typ: 'JWT' });
  const body = enc(claims);
  const sig = sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key);
  return `${head}.${body}.${sig.toString('base64url')}`;
}

const good = {
  iss: 'https://accounts.google.com',
  aud: CLIENT,
  sub: '1098765',
  email: 'Wanjiru@Example.com',
  email_verified: true,
  name: 'Wanjiru',
  nonce: 'n-1',
  iat: nowS - 10,
  exp: nowS + 3600,
};

describe('Google ID token checks', () => {
  it('accepts a correctly signed token for our client', () => {
    expect(verifyIdToken(token(good), CLIENT, [jwk], NOW)).toEqual({
      sub: '1098765',
      email: 'wanjiru@example.com',
      emailVerified: true,
      name: 'Wanjiru',
      nonce: 'n-1',
    });
  });

  it('refuses another app, another issuer, expired, or unsigned tokens', () => {
    expect(
      verifyIdToken(token({ ...good, aud: 'other' }), CLIENT, [jwk], NOW),
    ).toBeNull();
    expect(
      verifyIdToken(
        token({ ...good, iss: 'https://evil.example' }),
        CLIENT,
        [jwk],
        NOW,
      ),
    ).toBeNull();
    expect(
      verifyIdToken(token({ ...good, exp: nowS - 120 }), CLIENT, [jwk], NOW),
    ).toBeNull();
    expect(
      verifyIdToken(token(good, { alg: 'none' }), CLIENT, [jwk], NOW),
    ).toBeNull();
    expect(
      verifyIdToken(token(good, { kid: 'unknown' }), CLIENT, [jwk], NOW),
    ).toBeNull();
  });

  it('refuses a tampered payload or a token signed with another key', () => {
    const t = token(good).split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...good, sub: 'attacker' }),
    ).toString('base64url');
    expect(
      verifyIdToken(`${t[0]}.${forged}.${t[2]}`, CLIENT, [jwk], NOW),
    ).toBeNull();
    const other = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    }).privateKey;
    expect(
      verifyIdToken(token(good, { key: other }), CLIENT, [jwk], NOW),
    ).toBeNull();
    expect(verifyIdToken('not.a.jwt', CLIENT, [jwk], NOW)).toBeNull();
  });
});

describe('Google token exchange', () => {
  it('sends the code with PKCE, then verifies the returned ID token', async () => {
    const sent: Record<string, string> = {};
    const now = Math.floor(Date.now() / 1000);
    const http = ((url: string, init?: RequestInit) => {
      if (url.includes('/certs')) {
        return Promise.resolve(Response.json({ keys: [jwk] }));
      }
      for (const [k, v] of new URLSearchParams(init?.body as string))
        sent[k] = v;
      return Promise.resolve(
        Response.json({
          id_token: token({ ...good, iat: now, exp: now + 600 }),
        }),
      );
    }) as typeof fetch;
    const client = new GoogleOidcClient(
      { provider: 'google', clientId: CLIENT, clientSecret: 'secret-value-1' },
      http,
    );
    const claims = await client.exchange(
      'the-code',
      'the-verifier',
      'https://app.example/auth/google/callback',
    );
    expect(claims?.sub).toBe('1098765');
    expect(sent).toMatchObject({
      code: 'the-code',
      code_verifier: 'the-verifier',
      client_id: CLIENT,
      client_secret: 'secret-value-1',
      grant_type: 'authorization_code',
      redirect_uri: 'https://app.example/auth/google/callback',
    });
  });

  it('returns null when Google refuses the code or is unreachable', async () => {
    const refuse = (() =>
      Promise.resolve(
        Response.json({ error: 'invalid_grant' }, { status: 400 }),
      )) as typeof fetch;
    const down = (() => Promise.reject(new Error('down'))) as typeof fetch;
    for (const http of [refuse, down]) {
      const c = new GoogleOidcClient(
        { provider: 'google', clientId: CLIENT, clientSecret: 'x'.repeat(12) },
        http,
      );
      expect(await c.exchange('c', 'v', 'https://app.example/cb')).toBeNull();
    }
  });
});
