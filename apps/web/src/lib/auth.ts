import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { api, sessionToken } from './api';

export interface CurrentUser {
  id: string;
  /** Null for accounts made with a mobile number (B6). */
  email: string | null;
  /** Optional: older API versions do not send these. */
  phone?: string | null;
  displayName?: string | null;
  createdAt?: string;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
  /** Runs the service (B9). Absent while an older API deploys. */
  operator?: boolean;
  plan?: 'plus' | 'free';
  plusUntil?: string | null;
  /** Has ever paid for Plus (not only the trial or free months). */
  paidPlus?: boolean;
  /** False for accounts that sign in with Google only (ADR 0020). */
  hasPassword?: boolean;
  google?: boolean;
  /** False for a number typed in at a password sign-up (ADR 0021). */
  phoneVerified?: boolean;
  hasRecoveryKey?: boolean;
}

/** Thrown when the API cannot say who is signed in (down, slow, 5xx). */
export class ServiceUnavailableError extends Error {
  constructor(status: number) {
    super(`The API could not be reached (status ${status}).`);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * A page's data could not be loaded. "Not signed in" (401: the session
 * expired or was signed out elsewhere) goes to sign-in; anything else shows
 * the "can't reach Contact Sphere" page.
 */
export function failedLoad(status: number): never {
  if (status === 401) redirect('/login');
  throw new ServiceUnavailableError(status);
}

/**
 * The signed-in user, or null. Always asks the API — the cookie alone proves
 * nothing. Only a 401 means "signed out": any other failure is the service
 * being unavailable, and treating that as signed out would send a signed-in
 * person to the sign-in page for no reason. Asked once per request: the
 * layout and the page share the answer.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!(await sessionToken())) return null;
  const res = await api<CurrentUser>('/auth/me');
  if (res.status === 200 && res.data) return res.data;
  if (res.status === 401) return null;
  throw new ServiceUnavailableError(res.status);
});

/** For protected pages: the user, or a redirect to sign-in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

export async function setupAvailable(): Promise<boolean> {
  const res = await api<{ setupAvailable: boolean }>('/auth/setup', {
    auth: false,
  });
  return res.data?.setupAvailable ?? false;
}

export interface SignupStatus {
  /** Anyone can create an account, by some method. */
  open: boolean;
  /** …with a mobile number and an SMS code (B6). */
  sms: boolean;
  /** …with Google (ADR 0020). */
  google: boolean;
  /** …with a mobile number and a password, no code (ADR 0021). */
  password: boolean;
  /** Set when "Continue with Google" works, for new or existing accounts. */
  googleClientId: string | null;
}

/** How people can join and sign in here. */
export async function signupStatus(): Promise<SignupStatus> {
  const res = await api<Partial<SignupStatus>>('/auth/signup', {
    auth: false,
  });
  const d = res.data ?? {};
  return {
    open: d.open ?? false,
    // Older APIs sent only { open }, which meant SMS.
    sms: d.sms ?? d.open ?? false,
    google: d.google ?? false,
    password: d.password ?? false,
    googleClientId: d.googleClientId ?? null,
  };
}

/** Whether anyone can create an account here (B6, ADR 0020). */
export async function signupOpen(): Promise<boolean> {
  return (await signupStatus()).open;
}

/** How to show who is signed in: their name, email or number. */
export function whoIs(user: CurrentUser): string {
  return user.displayName ?? user.email ?? user.phone ?? '';
}

export interface DeviceSession {
  id: string;
  /** "Chrome on Android", or null when the browser did not say. */
  device: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

/** Devices signed in to this account; null if the list could not load. */
export async function getDevices(): Promise<DeviceSession[] | null> {
  const res = await api<DeviceSession[]>('/auth/sessions');
  return res.status === 200 && res.data ? res.data : null;
}
