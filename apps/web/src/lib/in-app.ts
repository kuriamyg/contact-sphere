import 'server-only';

import { headers } from 'next/headers';

/** The Android app adds this to its WebView's User-Agent (ADR 0025). */
export const APP_UA_MARK = 'ContactSphereAndroid/';

/** "ContactSphereAndroid/0.2" → [0, 2]; null outside the app. */
export function appVersion(ua: string): [number, number] | null {
  const m = /ContactSphereAndroid\/(\d+)\.(\d+)/.exec(ua);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * For pages requested from inside the Android app. For display only (which
 * buttons to show), never for security: anyone can send any User-Agent.
 */
export async function androidApp(): Promise<{
  /** This build can do Google sign-in through the browser (0.2+). */
  googleHandoff: boolean;
  /** This build can put contacts in the phone's Contacts (0.3+). */
  phoneCopy: boolean;
} | null> {
  const v = appVersion((await headers()).get('user-agent') ?? '');
  if (!v) return null;
  const atLeast = (minor: number) => v[0] > 0 || v[1] >= minor;
  return { googleHandoff: atLeast(2), phoneCopy: atLeast(3) };
}

export async function inAndroidApp(): Promise<boolean> {
  return (await androidApp()) !== null;
}
