'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { api, isProduction } from '@/lib/api';
import { sessionCookieName, sessionCookieOptions } from '@/lib/session-cookie';

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

async function endSession(): Promise<void> {
  (await cookies()).delete(sessionCookieName(isProduction()));
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
  const res = await api<SessionResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: field(form, 'email'), password: field(form, 'password') },
  });
  if (res.status !== 200 || !res.data) return failure(res.status, res.message);
  await startSession(res.data);
  redirect('/account');
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
  redirect('/account');
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
