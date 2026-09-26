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
  /**
   * VAPID keys for Web Push (morning reminders on the phone). Unset = the
   * feature is off and says so. Generate once: npx web-push
   * generate-vapid-keys. Changing them drops every phone's subscription.
   */
  push?: { publicKey: string; privateKey: string; subject: string };
  /**
   * Paid group texts through an SMS aggregator (Phase 11). Unset = off:
   * groups are texted from the owner's own phone instead. `log` only
   * records (tests, local); `partner` is the partnerID/apikey/shortcode API
   * that Celcom, Advanta and TextSMS share.
   */
  sms?: SmsConfig;
}

export interface SmsConfig {
  provider: 'log' | 'partner';
  /** Partner API base, e.g. https://isms.celcomafrica.com/api/services/ */
  url?: string;
  apiKey?: string;
  partnerId?: string;
  /** Registered sender ID ("shortcode" in these APIs). */
  senderId?: string;
  /** Most SMS parts one owner may send in a calendar month. 0 = none. */
  monthlyLimit: number;
  /** What one SMS part costs us, in KES cents, for estimates. */
  priceCents: number;
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

const VAPID_PUBLIC = /^[A-Za-z0-9_-]{87}$/;
const VAPID_PRIVATE = /^[A-Za-z0-9_-]{43}$/;

function parsePush(source: NodeJS.ProcessEnv): Env['push'] | undefined {
  const publicKey = source.VAPID_PUBLIC_KEY?.trim();
  const privateKey = source.VAPID_PRIVATE_KEY?.trim();
  const subject = source.VAPID_SUBJECT?.trim();
  if (!publicKey && !privateKey && !subject) return undefined;
  if (!publicKey || !privateKey || !subject) {
    throw new EnvError(
      'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set together.',
    );
  }
  if (!VAPID_PUBLIC.test(publicKey) || !VAPID_PRIVATE.test(privateKey)) {
    throw new EnvError(
      'VAPID keys are not valid (npx web-push generate-vapid-keys).',
    );
  }
  if (!/^(mailto:|https:\/\/)/.test(subject)) {
    throw new EnvError('VAPID_SUBJECT must be a mailto: or https:// URL.');
  }
  return { publicKey, privateKey, subject };
}

function parseSms(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): SmsConfig | undefined {
  const provider = source.SMS_PROVIDER?.trim();
  if (!provider) return undefined;
  const monthlyLimit = parseNonNegativeInt(
    'SMS_MONTHLY_LIMIT',
    source.SMS_MONTHLY_LIMIT,
    0,
  );
  const price = (source.SMS_PRICE_KES ?? '').trim() || '0';
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(price)) {
    throw new EnvError('SMS_PRICE_KES must be a price like 0.35.');
  }
  const priceCents = Math.round(Number(price) * 100);
  if (provider === 'log') {
    if (nodeEnv === 'production') {
      throw new EnvError('SMS_PROVIDER=log is for tests; not in production.');
    }
    return { provider, monthlyLimit, priceCents };
  }
  if (provider !== 'partner') {
    throw new EnvError('SMS_PROVIDER must be partner or log.');
  }
  const url = source.SMS_API_URL?.trim().replace(/\/*$/, '/');
  const apiKey = source.SMS_API_KEY?.trim();
  const partnerId = source.SMS_PARTNER_ID?.trim();
  const senderId = source.SMS_SENDER_ID?.trim();
  if (!url || !apiKey || !partnerId || !senderId) {
    throw new EnvError(
      'SMS_PROVIDER=partner needs SMS_API_URL, SMS_API_KEY, SMS_PARTNER_ID and SMS_SENDER_ID.',
    );
  }
  if (!url.startsWith('https://')) {
    throw new EnvError('SMS_API_URL must use https.');
  }
  return {
    provider,
    url,
    apiKey,
    partnerId,
    senderId,
    monthlyLimit,
    priceCents,
  };
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
    push: parsePush(source),
    sms: parseSms(source, nodeEnv),
  };
}
