import { createHash } from 'node:crypto';

/**
 * Google sign-in for the Android app (P5b, ADR 0025). Google refuses to
 * sign in inside an app's web view, so the app opens sign-in in the phone's
 * browser with `challenge` = base64url(SHA-256(verifier)); only the app
 * knows `verifier`. After Google, the browser gets a short, single-use code
 * instead of a session, and hands it to the app. Another app catching the
 * link cannot use the code without the verifier.
 */
export const APP_HANDOFF_MS = 2 * 60_000;
export const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;
export const APP_HANDOFF_FAILED =
  'That sign-in has expired. Please sign in again.';

export function challengeOf(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}
