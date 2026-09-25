import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** A new session token: 256 bits from the OS CSPRNG, URL-safe. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * What the database stores instead of the token. SHA-256 is right here (not
 * argon2): the token is already 256 random bits, so there is nothing to
 * brute-force, and lookups must be fast and exact.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Compares secrets in constant time, so response timing reveals nothing
 * about how much of a guess was right. Hashing first equalises lengths.
 */
export function secretsEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}
