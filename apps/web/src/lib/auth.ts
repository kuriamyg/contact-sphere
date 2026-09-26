import 'server-only';

import { redirect } from 'next/navigation';

import { api, sessionToken } from './api';

export interface CurrentUser {
  id: string;
  email: string;
  /** Optional: older API versions do not send these. */
  displayName?: string | null;
  createdAt?: string;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
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
 * person to the sign-in page for no reason.
 */
export async function currentUser(): Promise<CurrentUser | null> {
  if (!(await sessionToken())) return null;
  const res = await api<CurrentUser>('/auth/me');
  if (res.status === 200 && res.data) return res.data;
  if (res.status === 401) return null;
  throw new ServiceUnavailableError(res.status);
}

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
