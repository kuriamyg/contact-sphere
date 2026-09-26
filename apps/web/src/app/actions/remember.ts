'use server';

import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import { UUID } from '@/lib/contacts';

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v.trim() : '';
};

/** Where to go back to: Today, or a contact's page. Nothing else. */
function back(form: FormData, done: string): string {
  const b = str(form, 'back');
  const path =
    b === '/today' || /^\/contacts\/[0-9a-f-]{36}$/i.test(b) ? b : '/today';
  return `${path}?done=${done}`;
}

export async function setKeepInTouch(form: FormData): Promise<void> {
  const id = str(form, 'contactId');
  if (!UUID.test(id)) redirect('/contacts');
  const days = Number.parseInt(str(form, 'days'), 10);
  const res = await api(`/remember/contacts/${id}/keep-in-touch`, {
    method: 'PUT',
    body: Number.isFinite(days) && days > 0 ? { days } : {},
  });
  redirect(
    `/contacts/${id}?done=${res.status === 204 ? 'cadence_saved' : 'failed'}`,
  );
}

export async function markContacted(form: FormData): Promise<void> {
  const id = str(form, 'contactId');
  if (!UUID.test(id)) redirect('/today');
  const res = await api(`/remember/contacts/${id}/contacted`, {
    method: 'POST',
  });
  redirect(back(form, res.status === 204 ? 'contacted' : 'failed'));
}

export async function addFollowUp(form: FormData): Promise<void> {
  const id = str(form, 'contactId');
  if (!UUID.test(id)) redirect('/contacts');
  const dueOn = str(form, 'dueOn');
  const note = str(form, 'note').slice(0, 200);
  if (!note || !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
    redirect(`/contacts/${id}?done=follow_up_invalid`);
  }
  const res = await api(`/remember/contacts/${id}/follow-ups`, {
    method: 'POST',
    body: { dueOn, note },
  });
  redirect(
    `/contacts/${id}?done=${res.status === 201 ? 'follow_up_added' : res.status === 400 ? 'follow_up_invalid' : 'failed'}`,
  );
}

export async function followUpDone(form: FormData): Promise<void> {
  const id = str(form, 'id');
  if (!UUID.test(id)) redirect('/today');
  const res = await api(`/remember/follow-ups/${id}/done`, { method: 'POST' });
  redirect(back(form, res.status === 204 ? 'follow_up_done' : 'failed'));
}

export async function deleteFollowUp(form: FormData): Promise<void> {
  const id = str(form, 'id');
  if (!UUID.test(id)) redirect('/today');
  const res = await api(`/remember/follow-ups/${id}`, { method: 'DELETE' });
  redirect(back(form, res.status === 204 ? 'follow_up_deleted' : 'failed'));
}
