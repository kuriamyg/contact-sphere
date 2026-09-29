import { createHash, createPublicKey, verify } from 'node:crypto';

import type { GoogleConfig } from '../config/env';

/** What we use from Google's ID token. */
export interface GoogleClaims {
  /** Google's stable account id. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  nonce?: string;
}

export interface GoogleOidc {
  /** Exchanges the authorization code and returns the verified claims. */
  exchange(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<GoogleClaims | null>;
}

export const GOOGLE_OIDC = Symbol('GOOGLE_OIDC');

const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const TIMEOUT_MS = 10_000;
/** Clock drift allowed on exp/iat. */
const SKEW_S = 60;

const b64url = (s: string) => Buffer.from(s, 'base64url');

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

/**
 * Parses and verifies a Google ID token: RS256 signature against Google's
 * published keys, issuer, audience, expiry. Returns null on any doubt.
 */
export function verifyIdToken(
  token: string,
  clientId: string,
  keys: Jwk[],
  now = Date.now(),
): GoogleClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64url(h).toString('utf8')) as typeof header;
    payload = JSON.parse(b64url(p).toString('utf8')) as typeof payload;
  } catch {
    return null;
  }
  if (header.alg !== 'RS256') return null;
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) return null;
  let ok = false;
  try {
    const key = createPublicKey({
      key: { kty: 'RSA', n: jwk.n, e: jwk.e },
      format: 'jwk',
    });
    ok = verify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, b64url(s));
  } catch {
    return null;
  }
  if (!ok) return null;
  const nowS = Math.floor(now / 1000);
  const aud = payload.aud;
  if (
    !ISSUERS.includes(String(payload.iss)) ||
    !(aud === clientId || (Array.isArray(aud) && aud.includes(clientId))) ||
    typeof payload.exp !== 'number' ||
    payload.exp + SKEW_S < nowS ||
    (typeof payload.iat === 'number' && payload.iat - SKEW_S > nowS) ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string'
  ) {
    return null;
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    nonce: typeof payload.nonce === 'string' ? payload.nonce : undefined,
  };
}

/** The real thing: token endpoint + signature check with cached keys. */
export class GoogleOidcClient implements GoogleOidc {
  private keys?: { list: Jwk[]; until: number };

  constructor(
    private readonly cfg: GoogleConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  private async certs(force = false): Promise<Jwk[]> {
    if (!force && this.keys && this.keys.until > Date.now()) {
      return this.keys.list;
    }
    const res = await this.http(CERTS_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { keys?: Jwk[] };
    this.keys = { list: body.keys ?? [], until: Date.now() + 3600_000 };
    return this.keys.list;
  }

  async exchange(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<GoogleClaims | null> {
    try {
      const res = await this.http(TOKEN_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: this.cfg.clientId,
          client_secret: this.cfg.clientSecret ?? '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { id_token?: string };
      if (!body.id_token) return null;
      const claims = verifyIdToken(
        body.id_token,
        this.cfg.clientId,
        await this.certs(),
      );
      // Google rotates keys: one retry with fresh keys.
      return (
        claims ??
        verifyIdToken(body.id_token, this.cfg.clientId, await this.certs(true))
      );
    } catch {
      return null;
    }
  }
}

/**
 * Tests only (refused in production): the code is "fake:" plus base64url
 * JSON claims, and the verifier must hash to its "challenge" field.
 */
export class FakeGoogleOidc implements GoogleOidc {
  exchange(code: string, codeVerifier: string): Promise<GoogleClaims | null> {
    if (!code.startsWith('fake:')) return Promise.resolve(null);
    try {
      const c = JSON.parse(
        b64url(code.slice(5)).toString('utf8'),
      ) as GoogleClaims & { challenge?: string };
      const challenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      if (c.challenge && c.challenge !== challenge) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        sub: c.sub,
        email: c.email.toLowerCase(),
        emailVerified: c.emailVerified,
        name: c.name,
        nonce: c.nonce,
      });
    } catch {
      return Promise.resolve(null);
    }
  }
}

export function googleOidcFor(
  cfg: GoogleConfig | undefined,
): GoogleOidc | null {
  if (!cfg) return null;
  return cfg.provider === 'fake'
    ? new FakeGoogleOidc()
    : new GoogleOidcClient(cfg);
}
