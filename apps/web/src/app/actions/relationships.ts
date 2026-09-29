'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import { UUID } from '@/lib/contacts';
import { isRole } from '@/lib/relationships';

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v.trim() : '';
};

/** Only ever back to one of the owner's own pages, never elsewhere. */
const backTo = (form: FormData, fallback: string) => {
  const b = str(form, 'back');
  return /^\/contacts(\/[0-9a-f-]{36}|\/links)?$/.test(b) ? b : fallback;
};

const withDone = (url: string, done: string) =>
  `${url}${url.includes('?') ? '&' : '?'}done=${done}`;

/** "otherId is contactId's <role>", from a contact's page or a suggestion. */
export async function addRelationship(form: FormData): Promise<void> {
  const contactId = str(form, 'contactId');
  const otherId = str(form, 'otherId');
  const role = str(form, 'role');
  if (!UUID.test(contactId)) redirect('/contacts');
  const back = backTo(form, `/contacts/${contactId}`);
  if (!UUID.test(otherId) || !isRole(role)) {
    redirect(`/contacts/${contactId}/link?done=link_pick`);
  }
  const label = str(form, 'label').slice(0, 40);
  const res = await api(`/relationships/for-contact/${contactId}`, {
    method: 'POST',
    body: { otherId, role, ...(label ? { label } : {}) },
  });
  revalidatePath('/contacts', 'layout');
  redirect(
    withDone(
      back,
      res.status === 201
        ? 'link_added'
        : res.status === 409
          ? 'link_exists'
          : 'failed',
    ),
  );
}

export async function removeRelationship(form: FormData): Promise<void> {
  const id = str(form, 'id');
  const contactId = str(form, 'contactId');
  if (!UUID.test(contactId)) redirect('/contacts');
  const back = `/contacts/${contactId}`;
  if (!UUID.test(id)) redirect(withDone(back, 'failed'));
  const res = await api(`/relationships/${id}`, { method: 'DELETE' });
  revalidatePath('/contacts', 'layout');
  redirect(withDone(back, res.status === 204 ? 'link_removed' : 'failed'));
}

/** "Not related": that suggestion is not made again. */
export async function dismissSuggestion(form: FormData): Promise<void> {
  const kind = str(form, 'kind');
  const aId = str(form, 'aId');
  const bId = str(form, 'bId');
  if (
    (kind !== 'relative' && kind !== 'introduced') ||
    !UUID.test(aId) ||
    !UUID.test(bId)
  ) {
    redirect('/contacts/links?done=failed');
  }
  const res = await api('/relationships/suggestions/dismiss', {
    method: 'POST',
    body: { kind, aId, bId },
  });
  redirect(
    `/contacts/links?done=${res.status === 204 ? 'link_dismissed' : 'failed'}`,
  );
}
