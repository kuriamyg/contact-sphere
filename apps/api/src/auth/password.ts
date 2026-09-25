import * as argon2 from 'argon2';

import { PASSWORD_MAX, PASSWORD_MIN } from './auth.constants';

/**
 * Checks a NEW password against the policy. Returns a user-facing reason, or
 * null when acceptable. (Existing passwords are only length-capped at login.)
 */
export function passwordProblem(
  password: string,
  email: string,
): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Use at least ${PASSWORD_MIN} characters. A few unrelated words make a strong, memorable password.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Use at most ${PASSWORD_MAX} characters.`;
  }
  if (password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return 'Your password must not be your email address.';
  }
  if (/^(.)\1+$/.test(password)) {
    return 'Your password must not be one character repeated.';
  }
  return null;
}

/** argon2id with the library's defaults (m=64 MiB, t=3, p=4). */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same argon2 time as a real check. Used when no account matches
 * an email, so response time does not reveal which emails have accounts.
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= argon2.hash('dummy-password-for-timing', {
    type: argon2.argon2id,
  });
  await verifyPassword(await dummyHash, password);
}
