import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

const { buildApiHeaders } = await import('@/lib/api');

describe('buildApiHeaders', () => {
  it('always sends the shared secret and client IP', () => {
    expect(
      buildApiHeaders({ secret: 's', ip: '203.0.113.1', json: false }),
    ).toEqual({
      'x-bff-secret': 's',
      'x-client-ip': '203.0.113.1',
      accept: 'application/json',
    });
  });

  it('adds the session token and JSON content type when needed', () => {
    expect(
      buildApiHeaders({ secret: 's', ip: '1.1.1.1', token: 'tok', json: true }),
    ).toMatchObject({
      authorization: 'Session tok',
      'content-type': 'application/json',
    });
  });

  it('passes the browser User-Agent on, capped', () => {
    const h = buildApiHeaders({
      secret: 's',
      ip: '1.1.1.1',
      json: false,
      ua: 'x'.repeat(2000),
    });
    expect(h['x-client-ua']).toHaveLength(512);
    expect(
      buildApiHeaders({ secret: 's', ip: '1.1.1.1', json: false, ua: null }),
    ).not.toHaveProperty('x-client-ua');
  });
});
