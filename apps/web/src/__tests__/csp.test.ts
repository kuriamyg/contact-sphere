import { describe, expect, it } from 'vitest';

import { buildCsp, DISPLAY_NONE_HASH, newNonce } from '@/lib/csp';

describe('buildCsp', () => {
  it('allows only nonce-carrying scripts in production', () => {
    const csp = buildCsp('abc123', false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('allows exactly one inline style attribute: display:none', async () => {
    const csp = buildCsp('n', false);
    const style = csp.split('; ').find((d) => d.startsWith('style-src'));
    expect(style).toBe(
      `style-src 'self' 'nonce-n' 'unsafe-hashes' '${DISPLAY_NONE_HASH}'`,
    );
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode('display:none'),
    );
    const b64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
    expect(DISPLAY_NONE_HASH).toBe(`sha256-${b64}`);
    // 'unsafe-hashes' never reaches scripts.
    expect(
      csp.split('; ').find((d) => d.startsWith('script-src')),
    ).not.toContain('unsafe-hashes');
  });

  it('adds unsafe-eval only in development (React debugging)', () => {
    expect(buildCsp('n', true)).toContain("'unsafe-eval'");
  });
});

describe('newNonce', () => {
  it('is 128 random bits, different every time', () => {
    const a = newNonce();
    expect(atob(a)).toHaveLength(16);
    expect(newNonce()).not.toBe(a);
  });
});
