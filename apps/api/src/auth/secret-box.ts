import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Encrypts small secrets at rest (the TOTP seed, ADR 0013) with AES-256-GCM:
 * a random 96-bit nonce per value, and an authentication tag, so a tampered
 * value fails to decrypt instead of decrypting to garbage.
 *
 * Format: `v1:` + base64(nonce ‖ tag ‖ ciphertext). The version prefix lets
 * the key or algorithm change later without guessing what old rows are.
 */
const VERSION = 'v1:';

export function seal(plaintext: string, key: Buffer): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const body = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return (
    VERSION +
    Buffer.concat([nonce, cipher.getAuthTag(), body]).toString('base64')
  );
}

export function open(sealed: string, key: Buffer): string {
  if (!sealed.startsWith(VERSION)) throw new Error('Unknown sealed format');
  const raw = Buffer.from(sealed.slice(VERSION.length), 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
}
