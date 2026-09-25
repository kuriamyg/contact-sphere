import { describe, expect, it, vi } from 'vitest';

import { checkApiHealth } from '@/lib/api-health';

function respond(status: number, body: unknown): typeof fetch {
  return vi.fn(async () =>
    Response.json(body, { status }),
  ) as unknown as typeof fetch;
}

describe('checkApiHealth', () => {
  it('reports not-configured when no API URL is set', async () => {
    expect(await checkApiHealth(undefined)).toBe('not-configured');
    expect(await checkApiHealth('   ')).toBe('not-configured');
  });

  it('reports online for {status: ok}', async () => {
    expect(
      await checkApiHealth('http://api.test', respond(200, { status: 'ok' })),
    ).toBe('online');
  });

  it('calls /health once, without a double slash', async () => {
    const fetchImpl = respond(200, { status: 'ok' });
    await checkApiHealth('http://api.test/', fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/health',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('reports offline for a non-2xx response', async () => {
    expect(
      await checkApiHealth('http://api.test', respond(503, { status: 'ok' })),
    ).toBe('offline');
  });

  it('reports offline for an unexpected body', async () => {
    expect(
      await checkApiHealth('http://api.test', respond(200, { hello: 1 })),
    ).toBe('offline');
  });

  it('reports offline when the network fails', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await checkApiHealth('http://api.test', failing)).toBe('offline');
  });
});
