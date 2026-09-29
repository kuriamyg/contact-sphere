import 'server-only';

import type { Messages } from '@/i18n/en';
import { fmt } from '@/i18n/format';

import { api } from './api';
import { failedLoad } from './auth';
import { UUID } from './contacts';

/** Mirrors apps/api/src/relationships/kinds.ts (P6, ADR 0023). */
export const ROLE_GROUPS = {
  family: ['parent', 'child', 'spouse', 'sibling', 'cousin', 'relative'],
  met: ['introducedBy', 'introduced'],
  life: ['friend', 'neighbour', 'church', 'chama'],
  work: ['colleague', 'client', 'supplier', 'mentor', 'mentee', 'other'],
} as const;
export type Role = (typeof ROLE_GROUPS)[keyof typeof ROLE_GROUPS][number];
export const ROLES: readonly Role[] = Object.values(ROLE_GROUPS).flat();
/** What "relatives?" can be confirmed as. */
export const FAMILY_ROLES = ROLE_GROUPS.family;

export const isRole = (v: string): v is Role =>
  (ROLES as readonly string[]).includes(v);

/** "Parent", or "Introduced you to Wanjiru" — {name} is this contact. */
export const roleName = (
  role: string,
  name: string,
  roles: Messages['relationships']['roles'],
) => (isRole(role) ? fmt(roles[role], { name }) : roles.other);

export interface Relationship {
  id: string;
  role: Role;
  label: string | null;
  other: { id: string; displayName: string };
}

export interface Suggestion {
  kind: 'relative' | 'introduced';
  from: { id: string; displayName: string };
  to: { id: string; displayName: string };
  reason: 'same_surname' | 'met_through';
}

/** Best effort: [] if unavailable, so the contact page still shows. */
export async function relationshipsFor(id: string): Promise<Relationship[]> {
  if (!UUID.test(id)) return [];
  const res = await api<Relationship[]>(`/relationships/for-contact/${id}`);
  return res.status === 200 && res.data ? res.data : [];
}

export async function listSuggestions(): Promise<Suggestion[]> {
  const res = await api<Suggestion[]>('/relationships/suggestions');
  if (res.status !== 200 || !res.data) failedLoad(res.status);
  return res.data;
}
