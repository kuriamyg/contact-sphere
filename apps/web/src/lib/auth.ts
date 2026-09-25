import 'server-only';

import { redirect } from 'next/navigation';

import { api, sessionToken } from './api';

export interface CurrentUser {
  id: string;
  email: string;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
}

/** The signed-in user, or null. Always asks the API — the cookie alone proves nothing. */
export async function currentUser(): Promise<CurrentUser | null> {
  if (!(await sessionToken())) return null;
  const res = await api<CurrentUser>('/auth/me');
  return res.status === 200 ? res.data : null;
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
