'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import QRCode from 'qrcode';

import { apiError, getLocale, getMessages } from '@/i18n/server';
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

async function failure(status: number, message?: string): Promise<FormState> {
  return { error: await apiError(status, message) };
}

/** "me@example.com" signs in by email; anything else is a phone number. */
function identifier(value: string): { email: string } | { phone: string } {
  return value.includes('@') ? { email: value } : { phone: value };
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const res = await api<SessionResponse | MfaResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: {
      ...identifier(field(form, 'identifier')),
      password: field(form, 'password'),
    },
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

/** Sign-up and password reset by SMS code (B6): the number carries over. */
export interface PhoneCodeState extends FormState {
  /** Set once a code has been sent: the number, as typed. */
  phone?: string;
  /** Kept after a failed try: React clears the form on every submit. */
  displayName?: string;
}

async function sendCode(
  path: '/auth/signup/code' | '/auth/reset/code',
  prev: PhoneCodeState,
  form: FormData,
): Promise<PhoneCodeState> {
  const phone = field(form, 'phone').trim();
  const res = await api(path, {
    method: 'POST',
    auth: false,
    body: { phone, locale: await getLocale() },
  });
  if (res.status !== 204) {
    // A failed resend keeps the code step open; a failed first send does not.
    const keep = field(form, 'resend') === '1' ? prev.phone : undefined;
    return { ...(await failure(res.status, res.message)), phone: keep };
  }
  return { phone };
}

export async function sendSignupCode(
  prev: PhoneCodeState,
  form: FormData,
): Promise<PhoneCodeState> {
  return sendCode('/auth/signup/code', prev, form);
}

export async function sendResetCode(
  prev: PhoneCodeState,
  form: FormData,
): Promise<PhoneCodeState> {
  return sendCode('/auth/reset/code', prev, form);
}

export async function signup(
  _: PhoneCodeState,
  form: FormData,
): Promise<PhoneCodeState> {
  const displayName = field(form, 'displayName').trim();
  const res = await api<SessionResponse>('/auth/signup', {
    method: 'POST',
    auth: false,
    body: {
      phone: field(form, 'phone'),
      code: field(form, 'code').trim(),
      password: field(form, 'password'),
      locale: await getLocale(),
      ...(displayName ? { displayName } : {}),
    },
  });
  if (res.status !== 201 || !res.data) {
    return { ...(await failure(res.status, res.message)), displayName };
  }
  await startSession(res.data);
  redirect('/contacts');
}

export async function resetPassword(
  _: PhoneCodeState,
  form: FormData,
): Promise<PhoneCodeState> {
  const res = await api('/auth/reset', {
    method: 'POST',
    auth: false,
    body: {
      phone: field(form, 'phone'),
      code: field(form, 'code').trim(),
      newPassword: field(form, 'newPassword'),
    },
  });
  if (res.status !== 204) return failure(res.status, res.message);
  redirect('/login?reset=1');
}

export async function logout(): Promise<void> {
  await api('/auth/logout', { method: 'POST' });
  await endSession();
  redirect('/login');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Signs one other device out (Profile → Devices). */
export async function signOutDevice(form: FormData): Promise<void> {
  const id = field(form, 'sessionId');
  if (UUID.test(id)) {
    await api(`/auth/sessions/${id}`, { method: 'DELETE' });
  }
  revalidatePath('/account');
}

/**
 * Deletes the account and all its data (B7). On success the session cookie
 * goes and the sign-in page wipes this phone's offline copy (?deleted=1).
 */
export async function deleteAccount(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const t = (await getMessages()).errors;
  if (field(form, 'confirm').trim() !== 'DELETE') {
    return { error: t.typeDelete };
  }
  const code = field(form, 'code').trim();
  const res = await api('/auth/account/delete', {
    method: 'POST',
    body: {
      password: field(form, 'password'),
      confirm: 'DELETE',
      ...(code ? { code } : {}),
    },
  });
  if (res.status !== 204) return failure(res.status, res.message);
  await endSession();
  redirect('/login?deleted=1');
}

/** "Not you? Sign out" on the sign-up page: sign out, stay on sign-up. */
export async function logoutToSignup(): Promise<void> {
  await api('/auth/logout', { method: 'POST' });
  await endSession();
  redirect('/signup');
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
    return { error: (await getMessages()).errors.passwordsDiffer };
  }
  const res = await api('/auth/password', {
    method: 'POST',
    body: { currentPassword: field(form, 'currentPassword'), newPassword },
  });
  if (res.status === 401 && !res.message) redirect('/login');
  if (res.status !== 204) return failure(res.status, res.message);
  return { success: (await getMessages()).errors.passwordChanged };
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
    return { ...prev, ...(await failure(res.status, res.message)) };
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
  return { success: (await getMessages()).errors.twoFactorOff };
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
  return { success: (await getMessages()).errors.nameSaved };
}
