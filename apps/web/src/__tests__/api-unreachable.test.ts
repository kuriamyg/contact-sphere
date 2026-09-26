import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name.includes('cs_session') ? { value: 'tok' } : undefined,
  })),
  headers: vi.fn(async () => new Headers({ 'x-real-ip': '203.0.113.7' })),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));

const { api } = await import('@/lib/api');
const { currentUser, ServiceUnavailableError } = await import('@/lib/auth');

function fetchWith(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test');
  vi.stubEnv('API_SHARED_SECRET', 's'.repeat(32));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('api() when the API cannot be reached', () => {
  it('returns status 0 on a network error instead of throwing', async () => {
    fetchWith(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(
      api('/auth/totp/enable', { method: 'POST', body: { code: '123456' } }),
    ).resolves.toEqual({ status: 0, data: null });
  });

  it('returns status 0 on a timeout instead of throwing', async () => {
    fetchWith(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });
    await expect(api('/auth/me')).resolves.toEqual({ status: 0, data: null });
  });
});

describe('currentUser()', () => {
  it('treats only a 401 as signed out', async () => {
    fetchWith(async () => Response.json({ message: 'no' }, { status: 401 }));
    await expect(currentUser()).resolves.toBeNull();
  });

  it('does not treat an unreachable API as signed out', async () => {
    fetchWith(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(currentUser()).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('does not treat a 5xx as signed out', async () => {
    fetchWith(async () => new Response('bad gateway', { status: 502 }));
    await expect(currentUser()).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('returns the user on 200', async () => {
    const user = {
      id: 'u',
      email: 'a@b.c',
      totpEnabled: false,
      recoveryCodesLeft: 0,
    };
    fetchWith(async () => Response.json(user));
    await expect(currentUser()).resolves.toEqual(user);
  });
});
