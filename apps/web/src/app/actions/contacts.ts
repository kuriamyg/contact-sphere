'use server';

import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import {
  type ContactFormValues,
  readContactForm,
  toContactInput,
} from '@/lib/contact-form';
import { UUID } from '@/lib/contacts';

/**
 * Server Actions for contacts. Each calls the API as the signed-in owner
 * (the API enforces ownership); the browser never talks to the API.
 */
export interface ContactFormState {
  error?: string;
  /** What was submitted, so a refused form comes back filled in. */
  values?: ContactFormValues;
  /** Changes on every submit, to re-mount the form with `values`. */
  attempt?: number;
}

function message(status: number, apiMessage?: string): string {
  if (status === 0 || status >= 500) {
    return 'The service is unavailable. Try again shortly.';
  }
  if (status === 401) return 'Your session has ended. Sign in again.';
  if (status === 404) return 'That contact no longer exists.';
  if (status === 429) return 'Too many requests. Wait a minute and try again.';
  return apiMessage ?? 'Something went wrong. Try again.';
}

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
};

/** A contact id from a form, refusing anything that is not one. */
function idFrom(form: FormData): string {
  const id = field(form, 'id');
  if (!UUID.test(id)) redirect('/contacts');
  return id;
}

export async function createContact(
  prev: ContactFormState,
  form: FormData,
): Promise<ContactFormState> {
  const values = readContactForm(form);
  const res = await api<{ id: string }>('/contacts', {
    method: 'POST',
    body: toContactInput(values),
  });
  if (res.status !== 201 || !res.data) {
    return {
      error: message(res.status, res.message),
      values,
      attempt: (prev.attempt ?? 0) + 1,
    };
  }
  redirect(`/contacts/${res.data.id}?done=created`);
}

export async function updateContact(
  prev: ContactFormState,
  form: FormData,
): Promise<ContactFormState> {
  const id = idFrom(form);
  const values = readContactForm(form);
  const res = await api(`/contacts/${id}`, {
    method: 'PUT',
    body: toContactInput(values),
  });
  if (res.status !== 200) {
    return {
      error: message(res.status, res.message),
      values,
      attempt: (prev.attempt ?? 0) + 1,
    };
  }
  redirect(`/contacts/${id}?done=saved`);
}

/**
 * The simple state changes: one API call, then back to a page with a notice.
 * On failure the notice says so instead (no half-states: the API does each
 * change in one transaction).
 */
async function change(
  path: string,
  method: 'POST' | 'DELETE',
  ok: string,
  fail: string,
): Promise<never> {
  const res = await api(path, { method });
  redirect(res.status >= 200 && res.status < 300 ? ok : fail);
}

export async function archiveContact(form: FormData): Promise<void> {
  const id = idFrom(form);
  await change(
    `/contacts/${id}/archive`,
    'POST',
    `/contacts/${id}?done=archived`,
    `/contacts/${id}?done=failed`,
  );
}

export async function unarchiveContact(form: FormData): Promise<void> {
  const id = idFrom(form);
  await change(
    `/contacts/${id}/unarchive`,
    'POST',
    `/contacts/${id}?done=unarchived`,
    `/contacts/${id}?done=failed`,
  );
}

export async function trashContact(form: FormData): Promise<void> {
  const id = idFrom(form);
  await change(
    `/contacts/${id}`,
    'DELETE',
    '/contacts?done=trashed',
    `/contacts/${id}?done=failed`,
  );
}

export async function restoreContact(form: FormData): Promise<void> {
  const id = idFrom(form);
  await change(
    `/contacts/${id}/restore`,
    'POST',
    `/contacts/${id}?done=restored`,
    `/contacts/${id}?done=failed`,
  );
}

export async function deleteContactForGood(form: FormData): Promise<void> {
  const id = idFrom(form);
  await change(
    `/contacts/${id}/permanent`,
    'DELETE',
    '/contacts?view=trash&done=deleted',
    `/contacts/${id}?done=failed`,
  );
}

export async function emptyTrash(): Promise<void> {
  await change(
    '/contacts/trash',
    'DELETE',
    '/contacts?view=trash&done=emptied',
    '/contacts?view=trash&done=failed',
  );
}
