import { describe, expect, it } from 'vitest';

import { sessionCookieName, sessionCookieOptions } from '@/lib/session-cookie';

describe('session cookie', () => {
  const expires = new Date('2026-10-25T00:00:00Z');

  it('is HttpOnly, Secure, SameSite=Lax, host-only in production', () => {
    expect(sessionCookieName(true)).toBe('__Host-cs_session');
    expect(sessionCookieOptions(true, expires)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires,
    });
  });

  it('drops only Secure (and the __Host- prefix) for http://localhost', () => {
    expect(sessionCookieName(false)).toBe('cs_session');
    expect(sessionCookieOptions(false, expires)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  });
});

import { mfaCookieName, mfaCookieOptions } from '@/lib/session-cookie';

describe('two-factor challenge cookie', () => {
  it('is HttpOnly, Secure in production, short-lived and scoped to /login', () => {
    const expires = new Date('2026-10-01T00:05:00Z');
    expect(mfaCookieName(true)).toBe('__Secure-cs_mfa');
    expect(mfaCookieOptions(true, expires)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/login',
      expires,
    });
  });
});
