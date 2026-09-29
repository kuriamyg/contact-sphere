import { randomInt } from 'node:crypto';

import { hashToken } from './tokens';

/**
 * Recovery keys (ADR 0021): with the phone number, one resets a forgotten
 * password when no SMS can prove the number. 16 characters from a 32-letter
 * alphabet with no look-alikes (no 0/O, 1/I), shown as XXXX-XXXX-XXXX-XXXX:
 * 80 random bits, easy to copy by hand, impossible to guess online.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LENGTH = 16;

/** A new key for the owner to keep, e.g. "7KQM-2WXD-HB9R-4TFN". */
export function newRecoveryKey(): string {
  let key = '';
  for (let i = 0; i < LENGTH; i++) key += ALPHABET[randomInt(ALPHABET.length)];
  return key.match(/.{4}/g)!.join('-');
}

/**
 * The key as typed ("7kqm 2wxd-hb9r4tfn") in its one stored form, or null
 * when it cannot be a key at all.
 */
export function normaliseRecoveryKey(input: string): string | null {
  const key = input.toUpperCase().replace(/[\s-]/g, '');
  if (key.length !== LENGTH) return null;
  for (const c of key) if (!ALPHABET.includes(c)) return null;
  return key;
}

/**
 * What the database stores. SHA-256 is enough (as for session tokens):
 * the key is 80 random bits, not a password a person chose.
 */
export function hashRecoveryKey(key: string): string {
  return hashToken(`recovery:${normaliseRecoveryKey(key) ?? ''}`);
}
