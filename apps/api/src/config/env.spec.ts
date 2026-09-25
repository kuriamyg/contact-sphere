import { EnvError, loadEnv } from './env';

const DB = 'postgresql://app:pw@localhost:5432/db';
const SECRET = 's'.repeat(32);
/** The minimum valid configuration; tests override one thing at a time. */
const BASE = { DATABASE_URL: DB, API_SHARED_SECRET: SECRET };
const PROD_DB = 'postgresql://app:pw@db.example:5432/db?sslmode=verify-full';
const PROD = {
  API_SHARED_SECRET: SECRET,
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://app.example.com',
  DATABASE_URL: PROD_DB,
};

describe('loadEnv', () => {
  it('uses safe local defaults for everything except the database', () => {
    expect(loadEnv(BASE)).toEqual({
      nodeEnv: 'development',
      port: 3001,
      webOrigins: ['http://localhost:3000'],
      trustProxyHops: 0,
      databaseUrl: DB,
      apiSharedSecret: SECRET,
      setupToken: undefined,
    });
  });

  it('accepts a complete production configuration', () => {
    expect(loadEnv(PROD).databaseUrl).toBe(PROD_DB);
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadEnv({ API_SHARED_SECRET: SECRET })).toThrow(
      /DATABASE_URL must be set/,
    );
  });

  it('requires API_SHARED_SECRET, and a long one', () => {
    expect(() => loadEnv({ DATABASE_URL: DB })).toThrow(
      /API_SHARED_SECRET must be set/,
    );
    expect(() => loadEnv({ ...BASE, API_SHARED_SECRET: 'short' })).toThrow(
      /at least 32/,
    );
  });

  it('treats SETUP_TOKEN as optional, but refuses a short one', () => {
    expect(loadEnv({ ...BASE, SETUP_TOKEN: 't'.repeat(32) }).setupToken).toBe(
      't'.repeat(32),
    );
    expect(() => loadEnv({ ...BASE, SETUP_TOKEN: 'abc' })).toThrow(
      /SETUP_TOKEN must be at least 32/,
    );
  });

  it('rejects a DATABASE_URL that is not postgres', () => {
    expect(() =>
      loadEnv({ ...BASE, DATABASE_URL: 'mysql://a:b@h/db' }),
    ).toThrow(/postgresql:\/\//);
  });

  it('rejects an unparseable DATABASE_URL without echoing it', () => {
    const secret = 'postgresql://u:p#ss@host/db-SECRET';
    expect(() => loadEnv({ ...BASE, DATABASE_URL: secret })).toThrow(
      /percent-encode/i,
    );
    expect(() => loadEnv({ ...BASE, DATABASE_URL: secret })).not.toThrow(
      'SECRET',
    );
  });

  it('refuses an unencrypted database connection in production', () => {
    expect(() =>
      loadEnv({ ...PROD, DATABASE_URL: 'postgresql://a:b@db.example/db' }),
    ).toThrow(/sslmode/);
  });

  it('parses a comma-separated origin list and strips trailing slashes', () => {
    const env = loadEnv({
      ...BASE,
      WEB_ORIGIN: 'https://a.example.com/, https://b.example.com',
    });
    expect(env.webOrigins).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });

  it('refuses to start in production without an origin allowlist', () => {
    expect(() =>
      loadEnv({ NODE_ENV: 'production', DATABASE_URL: PROD_DB }),
    ).toThrow(/WEB_ORIGIN must be set/);
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
