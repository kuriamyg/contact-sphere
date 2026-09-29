import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn() }));

const { appVersion } = await import('@/lib/in-app');

describe('the Android app User-Agent', () => {
  it('reads the app version, and nothing from a normal browser', () => {
    expect(
      appVersion(
        'Mozilla/5.0 (Linux; Android 16; wv) ContactSphereAndroid/0.2',
      ),
    ).toEqual([0, 2]);
    expect(appVersion('Mozilla/5.0 (Linux; Android 16) Chrome/140')).toBeNull();
  });
});
