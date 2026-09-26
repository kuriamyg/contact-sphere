'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import QRCode from 'qrcode';

import { api, isProduction } from '@/lib/api';
import {
  mfaCookieName,
  mfaCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from '@/lib/session-cookie';

/**
 * Server Actions for sign-in and account security. Next.js only runs them
 * for POSTs whose Origin matches this site, which is the CSRF protection
 * (with the SameSite=Lax cookie as a second layer).
 */
export interface FormState {
  error?: string;
  success?: string;
}

interface SessionResponse {
  token: string;
  expiresAt: string;
}

interface MfaResponse {
  mfaRequired: true;
  challenge: string;
  expiresAt: string;
}

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
};

async function startSession(session: SessionResponse): Promise<void> {
  (await cookies()).set(
    sessionCookieName(isProduction()),
    session.token,
    sessionCookieOptions(isProduction(), new Date(session.expiresAt)),
  );
}

/**
 * Removes a cookie by overwriting it with an expired one carrying the SAME
 * attributes. `cookies().delete()` omits `Secure`, and browsers ignore any
 * attempt to change a `__Host-`/`__Secure-` cookie without it — the cookie
 * would silently stay.
 */
async function clearCookie(
  name: string,
  options: ReturnType<typeof sessionCookieOptions>,
): Promise<void> {
  (await cookies()).set(name, '', { ...options, expires: new Date(0) });
}

async function endSession(): Promise<void> {
  await clearCookie(
    sessionCookieName(isProduction()),
    sessionCookieOptions(isProduction(), new Date(0)),
  );
}

async function endMfaChallenge(): Promise<void> {
  await clearCookie(
    mfaCookieName(isProduction()),
    mfaCookieOptions(isProduction(), new Date(0)),
  );
}

function failure(status: number, message?: string): FormState {
  if (status === 429) {
    return {
      error: message ?? 'Too many attempts. Wait a minute and try again.',
    };
  }
  if (status >= 500 || status === 0) {
    return { error: 'The service is unavailable. Try again shortly.' };
  }
  return { error: message ?? 'Something went wrong. Try again.' };
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const res = await api<SessionResponse | MfaResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: field(form, 'email'), password: field(form, 'password') },
  });
  if (res.status !== 200 || !res.data) return failure(res.status, res.message);
  if ('mfaRequired' in res.data) {
    (await cookies()).set(
      mfaCookieName(isProduction()),
      res.data.challenge,
      mfaCookieOptions(isProduction(), new Date(res.data.expiresAt)),
    );
    redirect('/login/verify');
  }
  await startSession(res.data);
  redirect('/contacts');
}

/** Second sign-in step: a code from the authenticator app, or a recovery code. */
export async function verifyMfa(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const jar = await cookies();
  const challenge = jar.get(mfaCookieName(isProduction()))?.value;
  if (!challenge) redirect('/login');
  const res = await api<SessionResponse>('/auth/login/mfa', {
    method: 'POST',
    auth: false,
    body: { challenge, code: field(form, 'code').trim() },
  });
  if (res.status !== 200 || !res.data) {
    if (res.message?.includes('expired')) await endMfaChallenge();
    return failure(res.status, res.message);
  }
  await endMfaChallenge();
  await startSession(res.data);
  redirect('/contacts');
}

export async function setup(_: FormState, form: FormData): Promise<FormState> {
  const res = await api<SessionResponse>('/auth/setup', {
    method: 'POST',
    auth: false,
    body: {
      setupToken: field(form, 'setupToken'),
      email: field(form, 'email'),
      password: field(form, 'password'),
    },
  });
  if (res.status !== 201 || !res.data) return failure(res.status, res.message);
  await startSession(res.data);
  redirect('/contacts');
}

export async function logout(): Promise<void> {
  await api('/auth/logout', { method: 'POST' });
  await endSession();
  redirect('/login');
}

export async function logoutEverywhere(): Promise<void> {
  await api('/auth/logout-all', { method: 'POST' });
  await endSession();
  redirect('/login');
}

export async function changePassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const newPassword = field(form, 'newPassword');
  if (newPassword !== field(form, 'confirmPassword')) {
    return { error: 'The two new passwords do not match.' };
  }
  const res = await api('/auth/password', {
    method: 'POST',
    body: { currentPassword: field(form, 'currentPassword'), newPassword },
  });
  if (res.status === 401 && !res.message) redirect('/login');
  if (res.status !== 204) return failure(res.status, res.message);
  return {
    success: 'Password changed. Every other device has been signed out.',
  };
}

export interface TotpSetupState extends FormState {
  /** QR code as an SVG data URI (allowed by the CSP's img-src data:). */
  qr?: string;
  secret?: string;
  uri?: string;
  recoveryCodes?: string[];
}

export async function startTotpSetup(): Promise<TotpSetupState> {
  const res = await api<{ secret: string; uri: string }>('/auth/totp/setup', {
    method: 'POST',
  });
  if (res.status !== 200 || !res.data) return failure(res.status, res.message);
  const svg = await QRCode.toString(res.data.uri, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  return {
    qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    secret: res.data.secret,
    uri: res.data.uri,
  };
}

export async function enableTotp(
  prev: TotpSetupState,
  form: FormData,
): Promise<TotpSetupState> {
  const res = await api<{ recoveryCodes: string[] }>('/auth/totp/enable', {
    method: 'POST',
    body: { code: field(form, 'code').replace(/\s/g, '') },
  });
  if (res.status !== 200 || !res.data) {
    return { ...prev, ...failure(res.status, res.message) };
  }
  return { recoveryCodes: res.data.recoveryCodes };
}

export async function disableTotp(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const res = await api('/auth/totp/disable', {
    method: 'POST',
    body: {
      password: field(form, 'password'),
      code: field(form, 'code').trim(),
    },
  });
  if (res.status !== 204) return failure(res.status, res.message);
  return { success: 'Two-factor is off.' };
}

export async function updateProfile(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const res = await api('/auth/profile', {
    method: 'POST',
    body: { displayName: field(form, 'displayName') },
  });
  if (res.status === 401) redirect('/login');
  if (res.status !== 200) return failure(res.status, res.message);
  // The header shows the name too: refresh everything under the app layout.
  revalidatePath('/', 'layout');
  return { success: 'Saved.' };
}
