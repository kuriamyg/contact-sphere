import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  decodeState,
  encodeState,
  googleAuthUrl,
  newOAuthState,
  oauthCookieName,
  oauthCookieOptions,
  problemFor,
} from '@/lib/google-oauth';

describe('Continue with Google (web side)', () => {
  it('sends Google a PKCE challenge, state and nonce — never the verifier', () => {
    const s = newOAuthState();
    const url = new URL(
      googleAuthUrl(
        'id.apps.googleusercontent.com',
        'https://app.example/auth/google/callback',
        s,
      ),
    );
    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    const q = url.searchParams;
    expect(q.get('scope')).toBe('openid email profile');
    expect(q.get('response_type')).toBe('code');
    expect(q.get('state')).toBe(s.state);
    expect(q.get('nonce')).toBe(s.nonce);
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('code_challenge')).toBe(
      createHash('sha256').update(s.verifier).digest('base64url'),
    );
    expect(url.toString()).not.toContain(s.verifier);
  });

  it('makes fresh, long random values each time', () => {
    const a = newOAuthState();
    const b = newOAuthState();
    expect(a.state).not.toBe(b.state);
    expect(a.verifier.length).toBeGreaterThanOrEqual(43);
  });

  it('keeps the state in a short-lived HttpOnly cookie that survives the return trip', () => {
    expect(oauthCookieName(true)).toBe('__Host-cs_oauth');
    expect(oauthCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    const s = newOAuthState();
    expect(decodeState(encodeState(s))).toEqual(s);
    expect(decodeState('garbage')).toBeNull();
    expect(decodeState(undefined)).toBeNull();
  });

  it('maps API answers to messages for the sign-in page', () => {
    expect(problemFor(403)).toBe('no-account');
    expect(problemFor(409)).toBe('taken');
    expect(
      problemFor(400, 'Google has not verified the email on that account yet.'),
    ).toBe('unverified');
    expect(problemFor(500)).toBe('failed');
  });
});
