import type { NextConfig } from 'next';

/**
 * Security headers for every page.
 *
 * A Content-Security-Policy is deliberately NOT set yet: Next.js needs a
 * nonce-based CSP wired through proxy.ts to allow its own inline scripts, and
 * that is done properly in Phase 3 alongside authentication rather than
 * half-done here (docs/backlog.md).
 */
const securityHeaders = [
  // Nobody may embed this app in a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Browsers must not guess content types.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Never leak full URLs (which may one day contain ids) to other sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Features this app does not use are switched off outright.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // HTTPS only, for two years. Vercel serves HTTPS; localhost ignores HSTS.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
  // Belt and braces with robots.ts: private pages stay out of search.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
