/**
 * Refuses to let a test suite touch anything but a disposable local database.
 *
 * The e2e and database suites write and delete rows. Pointed at Neon — by a
 * stale .env, a copied command, a mistyped variable — they would do that to
 * real data. TrustGiving learned this the hard way (ADR 0008); here the suite
 * checks the host itself before it connects, instead of trusting a name.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function requireLocalDatabaseUrl(name: string): string {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(
      `${name} is not set. These tests need a disposable local Postgres ` +
        '(CI provides one; locally see .claude/hooks/session-start.sh).',
    );
  }
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new Error(`${name} is not a parseable URL.`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    // Never print the URL: it contains a password.
    throw new Error(
      `Refusing to run: ${name} points at a non-local host. ` +
        'These tests are destructive and only ever run against a local, disposable database.',
    );
  }
  return raw;
}
