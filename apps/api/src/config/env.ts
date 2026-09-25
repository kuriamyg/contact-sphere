/**
 * The one place the API reads its environment.
 *
 * Every variable is parsed and validated here, at boot, so that a
 * misconfigured deployment fails immediately with a message naming the
 * variable — instead of starting "healthy" and failing on the first request
 * that happens to need the missing value.
 *
 * Error messages name the variable and what is wrong with it, but never echo
 * the value: later phases add secrets here, and a boot log is not a safe
 * place for a secret.
 */

export type NodeEnv = 'development' | 'test' | 'production';

export interface Env {
  nodeEnv: NodeEnv;
  port: number;
  /** Exact browser origins allowed to call the API. Never a wildcard. */
  webOrigins: string[];
  /**
   * How many reverse proxies in front of us are trusted to set
   * X-Forwarded-For. 0 locally; 1 on Render (its TLS-terminating proxy).
   */
  trustProxyHops: number;
  /**
   * Runtime database connection: the least-privilege app role, through the
   * pooler in deployed environments (ADR 0012). Never the owner role.
   */
  databaseUrl: string;
  /**
   * Shared secret the web app's server sends with every request. Only the
   * web server may call the API (ADR 0006): without this, a request is
   * refused before any other processing.
   */
  apiSharedSecret: string;
  /**
   * One-time token that allows creating the first account while no account
   * exists. Unset = setup disabled. Remove it after setup.
   */
  setupToken?: string;
  /**
   * 32-byte key (64 hex chars) that encrypts TOTP secrets at rest
   * (AES-256-GCM, ADR 0013). Losing it disables everyone's two-factor
   * (recovery codes still work); changing it requires re-enrolment.
   */
  totpEncryptionKey: Buffer;
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

const NODE_ENVS: readonly NodeEnv[] = ['development', 'test', 'production'];
const DEFAULT_PORT = 3001;
const DEFAULT_DEV_ORIGIN = 'http://localhost:3000';

function parseNodeEnv(raw: string | undefined): NodeEnv {
  const value = raw?.trim() || 'development';
  if (!(NODE_ENVS as readonly string[]).includes(value)) {
    throw new EnvError(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}.`);
  }
  return value as NodeEnv;
}

function parseNonNegativeInt(
  name: string,
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new EnvError(`${name} must be a whole number of 0 or more.`);
  }
  return value;
}

function parseOrigins(raw: string | undefined, nodeEnv: NodeEnv): string[] {
  const configured = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (configured.length === 0) {
    // In production a missing allowlist is a deployment mistake, not a
    // reason to guess. Locally, the Next.js dev server is the only caller.
    if (nodeEnv === 'production') {
      throw new EnvError(
        'WEB_ORIGIN must be set in production (comma-separated exact origins).',
      );
    }
    return [DEFAULT_DEV_ORIGIN];
  }

  for (const origin of configured) {
    if (origin.includes('*')) {
      throw new EnvError('WEB_ORIGIN must list exact origins; "*" is refused.');
    }
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new EnvError(`WEB_ORIGIN contains an entry that is not a URL.`);
    }
    // An origin is scheme + host + port. A path here would never match a
    // browser's Origin header, silently breaking CORS.
    if (url.origin !== origin) {
      throw new EnvError(
        'WEB_ORIGIN entries must be bare origins like https://app.example.com (no path).',
      );
    }
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
      throw new EnvError('WEB_ORIGIN entries must use https in production.');
    }
  }
  return configured;
}

const DB_SCHEMES = ['postgresql:', 'postgres:'];

function parseDatabaseUrl(raw: string | undefined, nodeEnv: NodeEnv): string {
  const value = raw?.trim();
  if (!value) {
    throw new EnvError(
      'DATABASE_URL must be set (see .env.example and docs/operations/database-roles.md).',
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // A password containing # / ? must be percent-encoded, or the URL will
    // not parse. Say so, without ever printing the value.
    throw new EnvError(
      'DATABASE_URL is not a parseable URL. Percent-encode # / ? in the password.',
    );
  }
  if (!DB_SCHEMES.includes(url.protocol)) {
    throw new EnvError('DATABASE_URL must start with postgresql://.');
  }
  // A deployed API must never talk to its database in clear text.
  if (
    nodeEnv === 'production' &&
    !['require', 'verify-ca', 'verify-full'].includes(
      url.searchParams.get('sslmode') ?? '',
    )
  ) {
    throw new EnvError(
      'DATABASE_URL must set sslmode=verify-full (or require) in production.',
    );
  }
  return value;
}

const MIN_SECRET_LENGTH = 32;

function parseSecret(
  name: string,
  raw: string | undefined,
  required: boolean,
): string | undefined {
  const value = raw?.trim();
  if (!value) {
    if (required) {
      throw new EnvError(
        `${name} must be set (at least ${MIN_SECRET_LENGTH} characters; openssl rand -hex 32).`,
      );
    }
    return undefined;
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new EnvError(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters (openssl rand -hex 32).`,
    );
  }
  return value;
}

function parseKey(name: string, raw: string | undefined): Buffer {
  const value = raw?.trim() ?? '';
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new EnvError(
      `${name} must be 64 hex characters (32 bytes): openssl rand -hex 32.`,
    );
  }
  return Buffer.from(value, 'hex');
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = parseNodeEnv(source.NODE_ENV);
  const port = parseNonNegativeInt('PORT', source.PORT, DEFAULT_PORT);
  if (port < 1 || port > 65535) {
    throw new EnvError('PORT must be between 1 and 65535.');
  }
  return {
    nodeEnv,
    port,
    webOrigins: parseOrigins(source.WEB_ORIGIN, nodeEnv),
    trustProxyHops: parseNonNegativeInt(
      'TRUST_PROXY_HOPS',
      source.TRUST_PROXY_HOPS,
      0,
    ),
    databaseUrl: parseDatabaseUrl(source.DATABASE_URL, nodeEnv),
    apiSharedSecret: parseSecret(
      'API_SHARED_SECRET',
      source.API_SHARED_SECRET,
      true,
    ) as string,
    setupToken: parseSecret('SETUP_TOKEN', source.SETUP_TOKEN, false),
    totpEncryptionKey: parseKey(
      'TOTP_ENCRYPTION_KEY',
      source.TOTP_ENCRYPTION_KEY,
    ),
  };
}
