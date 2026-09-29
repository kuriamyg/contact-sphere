import { createHash, randomBytes } from 'node:crypto';

/**
 * "Continue with Google" on the web server (ADR 0020): OpenID Connect,
 * authorization code flow with PKCE, state and nonce. Pure functions, so
 * the security-relevant parts are unit-tested.
 */

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const CALLBACK_PATH = '/auth/google/callback';

/** Kept between leaving for Google and coming back. */
export interface OAuthState {
  state: string;
  verifier: string;
  nonce: string;
  /** Sign-in started by the Android app (ADR 0025): its challenge. */
  app?: string;
}

/** base64url of a SHA-256: the app's challenge, and the hand-off code. */
export const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;

export function newOAuthState(): OAuthState {
  const r = () => randomBytes(32).toString('base64url');
  return { state: r(), verifier: r(), nonce: r() };
}

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function googleAuthUrl(
  clientId: string,
  redirectUri: string,
  s: OAuthState,
): string {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: s.state,
    nonce: s.nonce,
    code_challenge: pkceChallenge(s.verifier),
    code_challenge_method: 'S256',
    // Always let people pick which Google account to use.
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${q.toString()}`;
}

/**
 * HttpOnly, 10 minutes. SameSite=Lax is what lets it come back on Google's
 * top-level redirect to us; Path=/ is required by the __Host- prefix.
 */
export function oauthCookieName(production: boolean): string {
  return production ? '__Host-cs_oauth' : 'cs_oauth';
}

export function oauthCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
}

export const encodeState = (s: OAuthState) =>
  Buffer.from(JSON.stringify(s)).toString('base64url');

export function decodeState(value: string | undefined): OAuthState | null {
  if (!value) return null;
  try {
    const s = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<OAuthState>;
    return typeof s.state === 'string' &&
      typeof s.verifier === 'string' &&
      typeof s.nonce === 'string'
      ? {
          state: s.state,
          verifier: s.verifier,
          nonce: s.nonce,
          ...(typeof s.app === 'string' && BASE64URL_43.test(s.app)
            ? { app: s.app }
            : {}),
        }
      : null;
  } catch {
    return null;
  }
}

/** Why Google sign-in did not finish, as a word for the sign-in page. */
export type GoogleProblem =
  'cancelled' | 'expired' | 'failed' | 'no-account' | 'unverified' | 'taken';

export function problemFor(status: number, message?: string): GoogleProblem {
  if (status === 403) return 'no-account';
  if (status === 409) return 'taken';
  if (message?.includes('not verified the email')) return 'unverified';
  return 'failed';
}
