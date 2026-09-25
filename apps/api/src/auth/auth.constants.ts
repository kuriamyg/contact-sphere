/** Session lifetimes (ADR 0006). */
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days unused
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days max
/** last_seen_at is refreshed at most this often, to avoid a write per request. */
export const SESSION_TOUCH_MS = 5 * 60 * 1000;

/** Headers the web app's server sends. Browsers never call the API. */
export const BFF_SECRET_HEADER = 'x-bff-secret';
export const CLIENT_IP_HEADER = 'x-client-ip';
/** `Authorization: Session <token>` */
export const SESSION_SCHEME = 'Session';

/** Password policy (ADR 0006). Long passphrases beat complexity rules. */
export const PASSWORD_MIN = 12;
/** An upper bound stops a multi-megabyte "password" being fed to argon2. */
export const PASSWORD_MAX = 128;

/** Per-account brute-force limit, on top of the per-IP rate limit. */
export const LOGIN_FAILURES_MAX = 10;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
