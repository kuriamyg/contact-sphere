import 'server-only';

import { headers } from 'next/headers';

import type { SignupStatus } from './auth';

/** What a sign-up form needs to show the "not a robot" check, or null. */
export async function turnstileFor(
  status: SignupStatus,
): Promise<{ siteKey: string; nonce: string } | null> {
  if (!status.turnstileSiteKey) return null;
  const nonce = (await headers()).get('x-nonce') ?? '';
  return { siteKey: status.turnstileSiteKey, nonce };
}
