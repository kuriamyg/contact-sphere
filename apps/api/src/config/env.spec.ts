import { EnvError, loadEnv } from './env';

describe('loadEnv', () => {
  it('uses safe local defaults when nothing is set', () => {
    expect(loadEnv({})).toEqual({
      nodeEnv: 'development',
      port: 3001,
      webOrigins: ['http://localhost:3000'],
      trustProxyHops: 0,
    });
  });

  it('parses a comma-separated origin list and strips trailing slashes', () => {
    const env = loadEnv({
      WEB_ORIGIN: 'https://a.example.com/, https://b.example.com',
    });
    expect(env.webOrigins).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });

  it('refuses to start in production without an origin allowlist', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(EnvError);
  });

  it('refuses a wildcard origin', () => {
    expect(() => loadEnv({ WEB_ORIGIN: '*' })).toThrow(/exact origins/);
  });

  it('refuses an origin with a path, which could never match', () => {
    expect(() =>
      loadEnv({ WEB_ORIGIN: 'https://app.example.com/login' }),
    ).toThrow(/bare origins/);
  });

  it('refuses plain http origins in production', () => {
    expect(() =>
      loadEnv({ NODE_ENV: 'production', WEB_ORIGIN: 'http://app.example.com' }),
    ).toThrow(/https/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadEnv({ NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
  });

  it.each(['-1', '1.5', 'abc'])('rejects TRUST_PROXY_HOPS=%s', (value) => {
    expect(() => loadEnv({ TRUST_PROXY_HOPS: value })).toThrow(
      /TRUST_PROXY_HOPS/,
    );
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => loadEnv({ PORT: '70000' })).toThrow(/PORT/);
  });

  it('never echoes a rejected value in its error message', () => {
    const secretLooking = 'not-a-url-but-maybe-a-secret';
    expect(() => loadEnv({ WEB_ORIGIN: secretLooking })).toThrow(EnvError);
    expect(() => loadEnv({ WEB_ORIGIN: secretLooking })).not.toThrow(
      secretLooking,
    );
  });
});
