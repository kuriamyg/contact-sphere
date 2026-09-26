import 'server-only';

import { api } from './api';
import { ServiceUnavailableError } from './auth';
import { type ListParams, toApiQuery } from './contact-params';

/** Shapes returned by the API's /contacts routes (apps/api contacts.service). */
export interface Phone {
  label: string | null;
  raw: string;
  e164: string | null;
}

export interface Email {
  label: string | null;
  address: string;
}

export interface ContactSummary {
  id: string;
  displayName: string;
  organization: string | null;
  primaryPhone: Phone | null;
  primaryEmail: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface ContactDetail extends Omit<
  ContactSummary,
  'primaryPhone' | 'primaryEmail'
> {
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  jobTitle: string | null;
  notes: string | null;
  birthday: string | null;
  updatedAt: string;
  purgeAt: string | null;
  phones: Phone[];
  emails: Email[];
}

export interface ContactPage {
  items: ContactSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listContacts(p: ListParams): Promise<ContactPage> {
  const res = await api<ContactPage>(`/contacts?${toApiQuery(p)}`);
  if (res.status !== 200 || !res.data) {
    throw new ServiceUnavailableError(res.status);
  }
  return res.data;
}

/** The contact, or null if it does not exist (or is not the owner's). */
export async function getContact(id: string): Promise<ContactDetail | null> {
  if (!UUID.test(id)) return null;
  const res = await api<ContactDetail>(`/contacts/${id}`);
  // 400 (an id the API will not accept) is as good as absent.
  if (res.status === 404 || res.status === 400) return null;
  if (res.status !== 200 || !res.data) {
    throw new ServiceUnavailableError(res.status);
  }
  return res.data;
}

/**
 * "Last used" (ADR 0007). Best effort: a failure here must never stop the
 * page from showing the contact.
 */
export async function markUsed(id: string): Promise<void> {
  await api(`/contacts/${id}/used`, { method: 'POST' });
}

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ContactStats {
  active: number;
  archived: number;
  trash: number;
}

/** How many contacts are in each list, or null if the API cannot say. */
export async function getContactStats(): Promise<ContactStats | null> {
  const res = await api<ContactStats>('/contacts/stats');
  return res.status === 200 ? res.data : null;
}
