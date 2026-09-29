import 'server-only';

import { headers } from 'next/headers';

/** The Android app adds this to its WebView's User-Agent (ADR 0025). */
export const APP_UA_MARK = 'ContactSphereAndroid/';

/**
 * True for pages requested from inside the Android app. For display only
 * (which buttons to show), never for security: anyone can send any UA.
 */
export async function inAndroidApp(): Promise<boolean> {
  return ((await headers()).get('user-agent') ?? '').includes(APP_UA_MARK);
}
