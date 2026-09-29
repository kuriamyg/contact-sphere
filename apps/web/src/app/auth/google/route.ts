import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { isProduction } from '@/lib/api';
import { signupStatus } from '@/lib/auth';
import {
  CALLBACK_PATH,
  encodeState,
  googleAuthUrl,
  newOAuthState,
  oauthCookieName,
  oauthCookieOptions,
} from '@/lib/google-oauth';

/** "Continue with Google": off to Google's own sign-in page (ADR 0020). */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const { googleClientId } = await signupStatus();
  if (!googleClientId) return NextResponse.redirect(`${origin}/login`);
  const s = newOAuthState();
  (await cookies()).set(
    oauthCookieName(isProduction()),
    encodeState(s),
    oauthCookieOptions(isProduction()),
  );
  return NextResponse.redirect(
    googleAuthUrl(googleClientId, `${origin}${CALLBACK_PATH}`, s),
  );
}
