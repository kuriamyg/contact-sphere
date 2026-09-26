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
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
