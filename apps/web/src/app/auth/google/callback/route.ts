import { timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getLocale } from '@/i18n/server';
import { api, isProduction } from '@/lib/api';
import {
  CALLBACK_PATH,
  decodeState,
  type GoogleProblem,
  oauthCookieName,
  oauthCookieOptions,
  problemFor,
} from '@/lib/google-oauth';
import {
  mfaCookieName,
  mfaCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from '@/lib/session-cookie';

/**
 * Google sends people back here with a one-time code (ADR 0020). We check
 * the state against our cookie, then the API exchanges the code (with the
 * PKCE verifier) and checks Google's signed answer. Nothing from the URL
 * is trusted beyond that.
 */
export const dynamic = 'force-dynamic';

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (problem: GoogleProblem) =>
    NextResponse.redirect(`${origin}/login?google=${problem}`);
  const jar = await cookies();
  const name = oauthCookieName(isProduction());
  const saved = decodeState(jar.get(name)?.value);
  // One use only.
  jar.set(name, '', { ...oauthCookieOptions(isProduction()), maxAge: 0 });

  if (url.searchParams.get('error')) return back('cancelled');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!saved) return back('expired');
  if (!code || !state || !same(state, saved.state)) return back('failed');

  const res = await api<{
    token?: string;
    expiresAt: string;
    mfaRequired?: true;
    challenge?: string;
    handoff?: string;
  }>('/auth/google', {
    method: 'POST',
    auth: false,
    body: {
      code,
      codeVerifier: saved.verifier,
      nonce: saved.nonce,
      redirectUri: `${origin}${CALLBACK_PATH}`,
      locale: await getLocale(),
      ...(saved.app ? { appChallenge: saved.app } : {}),
    },
  });
  if (res.status !== 200 || !res.data) {
    return back(problemFor(res.status, res.message));
  }
  // Started in the Android app: no session here; back to the app.
  if (saved.app) {
    if (!res.data.handoff) return back('failed');
    return NextResponse.redirect(
      `${origin}/auth/app/return?code=${encodeURIComponent(res.data.handoff)}`,
    );
  }
  const expires = new Date(res.data.expiresAt);
  if (res.data.mfaRequired && res.data.challenge) {
    jar.set(
      mfaCookieName(isProduction()),
      res.data.challenge,
      mfaCookieOptions(isProduction(), expires),
    );
    return NextResponse.redirect(`${origin}/login/verify`);
  }
  if (!res.data.token) return back('failed');
  jar.set(
    sessionCookieName(isProduction()),
    res.data.token,
    sessionCookieOptions(isProduction(), expires),
  );
  return NextResponse.redirect(`${origin}/today`);
}
