import 'server-only';

import { api } from './api';
import { failedLoad } from './auth';
import { UUID } from './contacts';

/** Shapes returned by the API's /groups routes (apps/api groups.service). */
export const GROUP_KINDS = [
  { value: 'chama', label: 'Chama' },
  { value: 'church', label: 'Church' },
  { value: 'family', label: 'Family' },
  { value: 'work', label: 'Work' },
  { value: 'estate', label: 'Estate' },
  { value: 'school', label: 'School / alumni' },
  { value: 'other', label: 'Other' },
] as const;
export type GroupKind = (typeof GROUP_KINDS)[number]['value'];
export const kindLabel = (k: string) =>
  GROUP_KINDS.find((x) => x.value === k)?.label ?? 'Other';

/** Suggestions for the role field; any text is allowed. */
export const ROLE_SUGGESTIONS = [
  'chair',
  'vice chair',
  'secretary',
  'treasurer',
  'member',
  'pastor',
  'elder',
  'organiser',
];

export interface GroupSummary {
  id: string;
  name: string;
  kind: GroupKind;
  description: string | null;
  memberCount: number;
}

export interface GroupMember {
  contactId: string;
  displayName: string;
  organization: string | null;
  role: string | null;
  phone: { raw: string; e164: string | null } | null;
}

export interface GroupDetail extends GroupSummary {
  createdAt: string;
  members: GroupMember[];
}

export interface ContactGroup {
  id: string;
  name: string;
  kind: GroupKind;
  role: string | null;
}

export async function listGroups(): Promise<GroupSummary[]> {
  const res = await api<GroupSummary[]>('/groups');
  if (res.status !== 200 || !res.data) {
    failedLoad(res.status);
  }
  return res.data;
}

/** The group, or null if it does not exist (or is not the owner's). */
export async function getGroup(id: string): Promise<GroupDetail | null> {
  if (!UUID.test(id)) return null;
  const res = await api<GroupDetail>(`/groups/${id}`);
  if (res.status === 404 || res.status === 400) return null;
  if (res.status !== 200 || !res.data) {
    failedLoad(res.status);
  }
  return res.data;
}

/** Best effort: [] if unavailable, so the contact page still shows. */
export async function groupsForContact(id: string): Promise<ContactGroup[]> {
  const res = await api<ContactGroup[]>(`/groups/for-contact/${id}`);
  return res.status === 200 && Array.isArray(res.data) ? res.data : [];
}

/** Best effort list for pickers. */
export async function listGroupsQuietly(): Promise<GroupSummary[]> {
  const res = await api<GroupSummary[]>('/groups');
  return res.status === 200 && Array.isArray(res.data) ? res.data : [];
}
