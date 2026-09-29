import { type NextRequest, NextResponse } from 'next/server';

import { buildCsp, newNonce } from './lib/csp';

/**
 * Runs before every page: gives the request a fresh nonce and sets the CSP.
 * Next.js reads the nonce from the request's CSP header and stamps it on its
 * own scripts. Pages must render per request for this (see layout.tsx).
 */
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  // Only the pages with the "not a robot" check may frame Cloudflare (C3).
  const { pathname } = request.nextUrl;
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development', {
    turnstile: pathname === '/signup' || pathname === '/reset',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|offline.html|offline-app.js|offline-app.css).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
