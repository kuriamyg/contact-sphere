/**
 * The session cookie (ADR 0006). Pure functions, so the security-relevant
 * options are unit-tested.
 *
 * - HttpOnly: page JavaScript (and so any XSS) cannot read the token.
 * - Secure + `__Host-` prefix in production: HTTPS only, and the browser
 *   refuses it unless it is host-only with Path=/ — no subdomain can set or
 *   overwrite it.
 * - SameSite=Lax: not sent on cross-site POSTs (CSRF), still sent when you
 *   follow a link to the app.
 */
export function sessionCookieName(production: boolean): string {
  // Browsers only accept the __Host- prefix on Secure cookies; local
  // development runs over plain http://localhost.
  return production ? '__Host-cs_session' : 'cs_session';
}

export function sessionCookieOptions(production: boolean, expiresAt: Date) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
