import { describe, expect, it } from 'vitest';

import { buildCsp, newNonce } from '@/lib/csp';

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
