'use server';

import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import { UUID } from '@/lib/contacts';

const FIELDS = [
  'displayName',
  'givenName',
  'familyName',
  'nickname',
  'organization',
  'jobTitle',
  'birthday',
] as const;

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
};

function pair(form: FormData): { keepId: string; mergeId: string } {
  const keepId = str(form, 'keepId');
  const mergeId = str(form, 'mergeId');
  if (!UUID.test(keepId) || !UUID.test(mergeId) || keepId === mergeId) {
    redirect('/contacts/duplicates?done=failed');
  }
  return { keepId, mergeId };
}

/** Merges the second contact into the first, with the owner's choices. */
export async function mergePair(form: FormData): Promise<void> {
  const { keepId, mergeId } = pair(form);
  const choices: Record<string, 'keep' | 'merge'> = {};
  for (const f of FIELDS) {
    const v = str(form, `choice_${f}`);
    if (v === 'keep' || v === 'merge') choices[f] = v;
  }
  const res = await api('/contacts/merge', {
    method: 'POST',
    body: { keepId, mergeId, choices },
  });
  redirect(
    res.status === 201
      ? `/contacts/${keepId}?done=merged`
      : `/contacts/duplicates?done=failed`,
  );
}

/** "Not the same person": the pair is not suggested again. */
export async function dismissPair(form: FormData): Promise<void> {
  const { keepId, mergeId } = pair(form);
  const res = await api('/contacts/duplicates/dismiss', {
    method: 'POST',
    body: { keepId, mergeId },
  });
  redirect(
    res.status === 204
      ? '/contacts/duplicates?done=dismissed'
      : '/contacts/duplicates?done=failed',
  );
}

export async function undoMerge(form: FormData): Promise<void> {
  const id = str(form, 'mergeRecordId');
  const back = str(form, 'contactId');
  if (!UUID.test(id) || !UUID.test(back)) redirect('/contacts');
  const res = await api(`/contacts/merges/${id}/undo`, { method: 'POST' });
  redirect(
    res.status === 200
      ? `/contacts/${back}?done=merge_undone`
      : `/contacts/${back}?done=undo_failed`,
  );
}
