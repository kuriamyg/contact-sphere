import { randomBytes } from 'node:crypto';

import { Secret, TOTP } from 'otpauth';

import { hashToken } from './tokens';

/**
 * TOTP per RFC 6238 with the settings every authenticator app supports:
 * SHA-1, 6 digits, 30-second steps (ADR 0013). The algorithm is the
 * `otpauth` library's; nothing here is home-made cryptography.
 */
export const TOTP_PERIOD = 30;
/** Accept the previous and next step too, for clock drift (±30 s). */
const WINDOW = 1;
const ISSUER = 'Contact Sphere';

function totp(secretBase32: string, label = 'account'): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
}

/** A fresh 160-bit secret (RFC 4226's recommended length), base32. */
export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** The otpauth:// URI authenticator apps import (as a QR code or a link). */
export function totpUri(secretBase32: string, email: string): string {
  return totp(secretBase32, email).toString();
}

/**
 * Checks a code. Returns the time step it matched, or null. A code whose
 * step is not NEWER than `lastStep` is refused — each code works once, so a
 * code seen over someone's shoulder is useless a moment later.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastStep: bigint | null,
  now = Date.now(),
): number | null {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const delta = totp(secretBase32).validate({
    token: clean,
    timestamp: now,
    window: WINDOW,
  });
  if (delta === null) return null;
  const step = Math.floor(now / 1000 / TOTP_PERIOD) + delta;
  if (lastStep !== null && BigInt(step) <= lastStep) return null;
  return step;
}

/** A code for a given time — for tests only. */
export function totpCodeAt(secretBase32: string, time: number): string {
  return totp(secretBase32).generate({ timestamp: time });
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

/** 10 codes like `K7QM-2XPA-9TRD` (60 bits each), shown to the user once. */
export function newRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(12);
    const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % 32]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  });
}

/** How a recovery code is stored and looked up: case and dashes ignored. */
export function hashRecoveryCode(code: string): string {
  return hashToken(code.toUpperCase().replace(/[^A-Z0-9]/g, ''));
}

export function looksLikeRecoveryCode(code: string): boolean {
  return /^[A-Z0-9]{12}$/.test(code.toUpperCase().replace(/[^A-Z0-9]/g, ''));
}
