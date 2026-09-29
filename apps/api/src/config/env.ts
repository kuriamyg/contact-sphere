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
  /**
   * The morning reminder by email (A3). Unset = off. Needs a verified
   * sending domain at the provider (SPF + DKIM), so it stays off until one
   * exists. `log` only records (tests, local).
   */
  email?: EmailConfig;
  /**
   * Refuse new passwords found in known data breaches (A5), via the Have I
   * Been Pwned range API (k-anonymity: only 5 hex characters of the SHA-1
   * leave the server). BREACHED_PASSWORD_CHECK=on|off; on by default in
   * production, off elsewhere so tests never call out.
   */
  breachedPasswordCheck: boolean;
  /** pino level: info by default, silent in tests. LOG_LEVEL overrides. */
  logLevel: LogLevel;
  /**
   * Open sign-up with an SMS code (B6, ADR 0018). OPEN_SIGNUP=on|off, off by
   * default; turning it on needs an SMS provider for the codes.
   */
  openSignup: boolean;
  /**
   * Sends one-time codes by SMS (sign-up, password reset). Unset = no codes;
   * `log` only records them (tests, local), never in production.
   */
  otpSms?: OtpSmsConfig;
  /** Plans and payments (B9, ADR 0019). */
  billing: BillingConfig;
  /**
   * "Continue with Google" (OpenID Connect, ADR 0020). Unset = no Google
   * button. `fake` reads test claims from the code (tests only).
   */
  google?: GoogleConfig;
  /**
   * Cloudflare Turnstile on password sign-up and SMS-code requests (C3).
   * Unset = no check. `fake` accepts the token "pass" (tests only).
   */
  turnstile?: TurnstileConfig;
  /**
   * How new people may join when OPEN_SIGNUP=on: SIGNUP_METHODS lists
   * google, sms and/or password. Google and SMS need their own
   * configuration; password (phone + password + recovery key, ADR 0021)
   * needs none.
   */
  signupMethods: SignupMethod[];
}

export interface TurnstileConfig {
  provider: 'cloudflare' | 'fake';
  /** Public: rendered in the sign-up page. */
  siteKey: string;
  secret: string;
}

const SIGNUP_METHODS = ['google', 'sms', 'password'] as const;
export type SignupMethod = (typeof SIGNUP_METHODS)[number];

export interface GoogleConfig {
  provider: 'google' | 'fake';
  clientId: string;
  clientSecret?: string;
}

export interface BillingConfig {
  /**
   * How to pay by hand, shown on the Plan page, e.g. "Send Money to 0712
   * 345 678 (Moses Kuria)". Unset = no manual payments offered. Lives in
   * the server's environment, never in the public repository.
   */
  payTo?: string;
  /** The M-Pesa prompt on the phone (STK push). Unset = off. */
  mpesa?: MpesaConfig;
}

export interface MpesaConfig {
  /** `log` records prompts (tests, local); `daraja` is Safaricom's API. */
  provider: 'log' | 'daraja';
  environment: 'sandbox' | 'production';
  consumerKey?: string;
  consumerSecret?: string;
  /** The paybill, or the till's store number. */
  shortcode: string;
  passkey?: string;
  /** paybill: CustomerPayBillOnline; till: CustomerBuyGoodsOnline. */
  type: 'paybill' | 'till';
  /** Where the money lands: the till number (till), else the shortcode. */
  partyB: string;
  /**
   * The secret last part of the callback URL
   * (<web origin>/api/mpesa/callback/<token>). Safaricom does not sign
   * callbacks; this, the checkout id and the amount are what we check.
   */
  callbackToken: string;
}

export interface OtpSmsConfig {
  provider: 'log' | 'africastalking';
  /** Africa's Talking username; "sandbox" uses their test simulator. */
  username?: string;
  apiKey?: string;
  /** Registered sender ID; unset = the provider's shared sender. */
  senderId?: string;
}

export type LogLevel =
  'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
const LOG_LEVELS: readonly LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
];

export interface EmailConfig {
  provider: 'log' | 'resend' | 'brevo';
  apiKey?: string;
  /** Sender shown in the inbox. */
  from: { name: string; address: string };
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

const EMAIL_ADDRESS = /^[^\s@<>"]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** "Contact Sphere <digest@example.com>" or a bare address. */
function parseFrom(raw: string): EmailConfig['from'] {
  const m = /^\s*(?:"?([^"<>]{1,60})"?\s*)?<([^<>]+)>\s*$/.exec(raw);
  const name = (m?.[1] ?? 'Contact Sphere').trim() || 'Contact Sphere';
  const address = (m ? m[2] : raw).trim();
  if (!EMAIL_ADDRESS.test(address) || /[\r\n]/.test(raw)) {
    throw new EnvError(
      'EMAIL_FROM must be an address like "Contact Sphere <digest@example.com>".',
    );
  }
  return { name, address };
}

function parseEmail(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): EmailConfig | undefined {
  const provider = source.EMAIL_PROVIDER?.trim();
  if (!provider) return undefined;
  if (provider === 'log') {
    if (nodeEnv === 'production') {
      throw new EnvError('EMAIL_PROVIDER=log is for tests; not in production.');
    }
    return {
      provider,
      from: parseFrom(source.EMAIL_FROM?.trim() || 'test@example.com'),
    };
  }
  if (provider !== 'resend' && provider !== 'brevo') {
    throw new EnvError('EMAIL_PROVIDER must be resend, brevo or log.');
  }
  const apiKey = source.EMAIL_API_KEY?.trim();
  const from = source.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new EnvError(
      `EMAIL_PROVIDER=${provider} needs EMAIL_API_KEY and EMAIL_FROM.`,
    );
  }
  return { provider, apiKey, from: parseFrom(from) };
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
    email: parseEmail(source, nodeEnv),
    breachedPasswordCheck: parseOnOff(
      'BREACHED_PASSWORD_CHECK',
      source.BREACHED_PASSWORD_CHECK,
      nodeEnv === 'production',
    ),
    logLevel: parseLogLevel(source.LOG_LEVEL, nodeEnv),
    ...parseSignup(source, nodeEnv),
    turnstile: parseTurnstile(source, nodeEnv),
    billing: parseBilling(source, nodeEnv),
  };
}

function parseBilling(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): BillingConfig {
  const payTo = source.BILLING_PAY_TO?.trim() || undefined;
  if (payTo && payTo.length > 120) {
    throw new EnvError('BILLING_PAY_TO must be at most 120 characters.');
  }
  return { payTo, mpesa: parseMpesa(source, nodeEnv) };
}

function parseMpesa(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): MpesaConfig | undefined {
  const provider = source.MPESA_PROVIDER?.trim();
  if (!provider) return undefined;
  if (provider !== 'daraja' && provider !== 'log') {
    throw new EnvError('MPESA_PROVIDER must be daraja or log.');
  }
  if (provider === 'log' && nodeEnv === 'production') {
    throw new EnvError('MPESA_PROVIDER=log is for tests; not in production.');
  }
  const callbackToken = source.MPESA_CALLBACK_TOKEN?.trim() ?? '';
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(callbackToken)) {
    throw new EnvError(
      'MPESA_CALLBACK_TOKEN must be 32+ letters, digits, - or _ (openssl rand -hex 32).',
    );
  }
  if (provider === 'log') {
    return {
      provider,
      environment: 'sandbox',
      shortcode: '174379',
      type: 'paybill',
      partyB: '174379',
      callbackToken,
    };
  }
  const environment = source.MPESA_ENV?.trim() || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new EnvError('MPESA_ENV must be sandbox or production.');
  }
  const consumerKey = source.MPESA_CONSUMER_KEY?.trim();
  const consumerSecret = source.MPESA_CONSUMER_SECRET?.trim();
  const passkey = source.MPESA_PASSKEY?.trim();
  const shortcode = source.MPESA_SHORTCODE?.trim() ?? '';
  const type = source.MPESA_TYPE?.trim() || 'paybill';
  if (
    !consumerKey ||
    !consumerSecret ||
    /\s/.test(consumerKey + consumerSecret)
  ) {
    throw new EnvError(
      'MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be your Daraja app keys.',
    );
  }
  if (!passkey || passkey.length < 20) {
    throw new EnvError('MPESA_PASSKEY must be the Lipa na M-Pesa passkey.');
  }
  if (!/^\d{5,7}$/.test(shortcode)) {
    throw new EnvError('MPESA_SHORTCODE must be a 5–7 digit shortcode.');
  }
  if (type !== 'paybill' && type !== 'till') {
    throw new EnvError('MPESA_TYPE must be paybill or till.');
  }
  const till = source.MPESA_TILL?.trim();
  if (type === 'till' && !/^\d{5,7}$/.test(till ?? '')) {
    throw new EnvError('MPESA_TILL must be the 5–7 digit till number.');
  }
  return {
    provider,
    environment,
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    type,
    partyB: type === 'till' ? (till as string) : shortcode,
    callbackToken,
  };
}

function parseTurnstile(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): TurnstileConfig | undefined {
  const siteKey = source.TURNSTILE_SITE_KEY?.trim();
  const secret = source.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey && !secret) return undefined;
  if (!siteKey || !secret) {
    throw new EnvError(
      'Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither.',
    );
  }
  const key = /^[\w-]{10,100}$/;
  if (!key.test(siteKey) || !key.test(secret)) {
    throw new EnvError('TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY look wrong.');
  }
  const fake = source.TURNSTILE_PROVIDER?.trim() === 'fake';
  if (fake && nodeEnv === 'production') {
    throw new EnvError(
      'TURNSTILE_PROVIDER=fake is for tests; not in production.',
    );
  }
  return { provider: fake ? 'fake' : 'cloudflare', siteKey, secret };
}

function parseSignup(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): {
  openSignup: boolean;
  otpSms?: OtpSmsConfig;
  google?: GoogleConfig;
  signupMethods: SignupMethod[];
} {
  const otpSms = parseOtpSms(source, nodeEnv);
  const google = parseGoogle(source, nodeEnv);
  const openSignup = parseOnOff('OPEN_SIGNUP', source.OPEN_SIGNUP, false);
  const raw = source.SIGNUP_METHODS?.trim();
  // Before ADR 0020 sign-up was SMS only; keep that as the default.
  const methods = (raw ? raw.split(',') : ['sms']).map((m) => m.trim());
  if (
    !methods.every((m) => (SIGNUP_METHODS as readonly string[]).includes(m))
  ) {
    throw new EnvError('SIGNUP_METHODS must list google, sms and/or password.');
  }
  const signupMethods = [...new Set(methods)] as SignupMethod[];
  if (openSignup) {
    if (signupMethods.includes('sms') && !otpSms) {
      throw new EnvError(
        'Sign-up by SMS needs OTP_SMS_PROVIDER to send sign-up codes.',
      );
    }
    if (signupMethods.includes('google') && !google) {
      throw new EnvError(
        'Sign-up with Google needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }
  }
  return { openSignup, otpSms, google, signupMethods };
}

function parseGoogle(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): GoogleConfig | undefined {
  const clientId = source.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return undefined;
  if (source.GOOGLE_OAUTH?.trim() === 'fake') {
    if (nodeEnv === 'production') {
      throw new EnvError('GOOGLE_OAUTH=fake is for tests; not in production.');
    }
    return { provider: 'fake', clientId };
  }
  if (!/^[\w.-]{10,200}\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new EnvError(
      'GOOGLE_CLIENT_ID must be an OAuth client id ending in .apps.googleusercontent.com.',
    );
  }
  const clientSecret = source.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientSecret || clientSecret.length < 10 || /\s/.test(clientSecret)) {
    throw new EnvError('GOOGLE_CLIENT_SECRET must be the OAuth client secret.');
  }
  return { provider: 'google', clientId, clientSecret };
}

function parseOtpSms(
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): OtpSmsConfig | undefined {
  const provider = source.OTP_SMS_PROVIDER?.trim();
  if (!provider) return undefined;
  if (provider === 'log') {
    if (nodeEnv === 'production') {
      throw new EnvError(
        'OTP_SMS_PROVIDER=log is for tests; not in production.',
      );
    }
    return { provider };
  }
  if (provider !== 'africastalking') {
    throw new EnvError('OTP_SMS_PROVIDER must be africastalking or log.');
  }
  const username = source.AT_USERNAME?.trim();
  const apiKey = source.AT_API_KEY?.trim();
  if (!username || !/^[\w.-]{1,60}$/.test(username)) {
    throw new EnvError("AT_USERNAME must be your Africa's Talking username.");
  }
  if (!apiKey || apiKey.length < 20 || /\s/.test(apiKey)) {
    throw new EnvError("AT_API_KEY must be an Africa's Talking API key.");
  }
  const senderId = source.AT_SENDER_ID?.trim() || undefined;
  if (senderId && !/^[A-Za-z0-9 ]{1,11}$/.test(senderId)) {
    throw new EnvError('AT_SENDER_ID must be up to 11 letters or digits.');
  }
  return { provider, username, apiKey, senderId };
}

function parseLogLevel(raw: string | undefined, nodeEnv: NodeEnv): LogLevel {
  const v = raw?.trim().toLowerCase();
  if (!v) return nodeEnv === 'test' ? 'silent' : 'info';
  if (!(LOG_LEVELS as readonly string[]).includes(v)) {
    throw new EnvError(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}.`);
  }
  return v as LogLevel;
}

function parseOnOff(
  name: string,
  raw: string | undefined,
  fallback: boolean,
): boolean {
  const v = raw?.trim().toLowerCase();
  if (!v) return fallback;
  if (v === 'on') return true;
  if (v === 'off') return false;
  throw new EnvError(`${name} must be on or off.`);
}
