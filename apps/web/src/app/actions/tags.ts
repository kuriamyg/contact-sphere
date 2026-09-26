'use server';

import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import { UUID } from '@/lib/contacts';

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v.trim() : '';
};

const MANAGE = '/contacts/tags';

/** Renames a skill on every contact that has it. */
export async function renameTag(form: FormData): Promise<void> {
  const from = str(form, 'from');
  const to = str(form, 'to');
  if (!from || !to || to.length > 40) redirect(`${MANAGE}?done=failed`);
  const res = await api('/contacts/tags/rename', {
    method: 'POST',
    body: { from, to },
  });
  redirect(`${MANAGE}?done=${res.status === 200 ? 'tag_renamed' : 'failed'}`);
}

/** Removes a skill from every contact; the contacts stay. */
export async function deleteTag(form: FormData): Promise<void> {
  const tag = str(form, 'tag');
  if (!tag) redirect(`${MANAGE}?done=failed`);
  const res = await api('/contacts/tags/delete', {
    method: 'POST',
    body: { tag },
  });
  redirect(`${MANAGE}?done=${res.status === 200 ? 'tag_deleted' : 'failed'}`);
}

/** Keeps the current search (words and/or tag) under a name. */
export async function saveSearch(form: FormData): Promise<void> {
  const name = str(form, 'name').slice(0, 60);
  const query = str(form, 'q').slice(0, 100);
  const tag = str(form, 'tag').slice(0, 40);
  const back = new URLSearchParams();
  if (query) back.set('q', query);
  if (tag) back.set('tag', tag);
  const to = (done: string) => {
    back.set('done', done);
    return `/contacts?${back.toString()}`;
  };
  if (!name || (!query && !tag)) redirect(to('failed'));
  const res = await api('/contacts/searches', {
    method: 'POST',
    body: { name, ...(query ? { query } : {}), ...(tag ? { tag } : {}) },
  });
  redirect(
    to(
      res.status === 201
        ? 'search_saved'
        : res.status === 409
          ? /\b50\b/.test(res.message ?? '')
            ? 'search_full'
            : 'search_exists'
          : 'failed',
    ),
  );
}

export async function deleteSearch(form: FormData): Promise<void> {
  const id = str(form, 'id');
  if (!UUID.test(id)) redirect(`${MANAGE}?done=failed`);
  const res = await api(`/contacts/searches/${id}`, { method: 'DELETE' });
  redirect(
    `${MANAGE}?done=${res.status === 204 ? 'search_deleted' : 'failed'}`,
  );
}
