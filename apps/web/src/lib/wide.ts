import 'server-only';

import { cookies } from 'next/headers';

/** Cookie the browser sets to say whether its window is laptop-wide. */
export const WIDE_COOKIE = 'cs-wide';

/**
 * True when the last known window was at least 1024 px wide. Pages render
 * the side-by-side list only then, so phones never download a list they
 * would not show. A display preference, not a secret.
 */
export async function isWide(): Promise<boolean> {
  return (await cookies()).get(WIDE_COOKIE)?.value === '1';
}
