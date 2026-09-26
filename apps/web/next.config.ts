import type { NextConfig } from 'next';

/**
 * Security headers for every page. The Content-Security-Policy is set per
 * request in src/proxy.ts, because it carries a fresh nonce each time.
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
  experimental: {
    // A .vcf import is sent to a Server Action as text. Photos are removed
    // in the browser first, so a few thousand contacts fit well within this
    // (and within Vercel's 4.5 MB request limit).
    serverActions: { bodySizeLimit: '4.4mb' },
  },
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The offline app (public/offline*): plain files with no inline code,
      // so a fixed, strict policy (no nonce needed). src/proxy.ts skips them.
      {
        source: '/offline(.html|-app.js|-app.css)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
          },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
      // The service worker must be re-checked on every visit, so a fix
      // reaches every installed phone straight away.
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
