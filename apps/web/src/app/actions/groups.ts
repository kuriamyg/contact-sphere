'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import { UUID } from '@/lib/contacts';

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v.trim() : '';
};

function groupFields(form: FormData) {
  const description = str(form, 'description').slice(0, 500);
  return {
    name: str(form, 'name').slice(0, 80),
    kind: str(form, 'kind') || 'other',
    ...(description ? { description } : {}),
  };
}

/**
 * Every group change ends here: the laptop's group pane lives in the
 * groups layout, which a redirect alone does not re-render.
 */
function go(url: string): never {
  revalidatePath('/groups', 'layout');
  redirect(url);
}

const outcome = (status: number, ok: number, done: string) =>
  status === ok ? done : status === 409 ? 'group_exists' : 'failed';

export async function createGroup(form: FormData): Promise<void> {
  const body = groupFields(form);
  if (!body.name) go('/groups?done=failed');
  const res = await api<{ id: string }>('/groups', { method: 'POST', body });
  if (res.status === 201 && res.data) {
    go(`/groups/${res.data.id}?done=group_created`);
  }
  go(`/groups?done=${outcome(res.status, 201, 'group_created')}`);
}

export async function updateGroup(form: FormData): Promise<void> {
  const id = str(form, 'id');
  if (!UUID.test(id)) go('/groups');
  const res = await api(`/groups/${id}`, {
    method: 'PUT',
    body: groupFields(form),
  });
  go(
    res.status === 200
      ? `/groups/${id}?done=group_saved`
      : `/groups/${id}/edit?done=${outcome(res.status, 200, 'group_saved')}`,
  );
}

export async function deleteGroup(form: FormData): Promise<void> {
  const id = str(form, 'id');
  if (!UUID.test(id)) go('/groups');
  const res = await api(`/groups/${id}`, { method: 'DELETE' });
  go(`/groups?done=${res.status === 204 ? 'group_deleted' : 'failed'}`);
}

/** From the member picker: the ticked contacts, with one optional role. */
export async function addMembers(form: FormData): Promise<void> {
  const id = str(form, 'id');
  if (!UUID.test(id)) go('/groups');
  const contactIds = form
    .getAll('contactId')
    .filter((v): v is string => typeof v === 'string' && UUID.test(v))
    .slice(0, 500);
  if (contactIds.length === 0) go(`/groups/${id}/add?done=none_picked`);
  const role = str(form, 'role').slice(0, 40);
  const res = await api(`/groups/${id}/members`, {
    method: 'POST',
    body: { contactIds, ...(role ? { role } : {}) },
  });
  go(`/groups/${id}?done=${res.status === 200 ? 'members_added' : 'failed'}`);
}

export async function setRole(form: FormData): Promise<void> {
  const id = str(form, 'id');
  const contactId = str(form, 'contactId');
  if (!UUID.test(id) || !UUID.test(contactId)) go('/groups');
  const role = str(form, 'role').slice(0, 40);
  const res = await api(`/groups/${id}/members/${contactId}`, {
    method: 'PUT',
    body: role ? { role } : {},
  });
  go(`/groups/${id}?done=${res.status === 204 ? 'role_saved' : 'failed'}`);
}

export async function removeMember(form: FormData): Promise<void> {
  const id = str(form, 'id');
  const contactId = str(form, 'contactId');
  if (!UUID.test(id) || !UUID.test(contactId)) go('/groups');
  const res = await api(`/groups/${id}/members/${contactId}`, {
    method: 'DELETE',
  });
  go(`/groups/${id}?done=${res.status === 204 ? 'member_removed' : 'failed'}`);
}

/** From a contact's page: put this contact in one group. */
export async function addToGroup(form: FormData): Promise<void> {
  const groupId = str(form, 'groupId');
  const contactId = str(form, 'contactId');
  if (!UUID.test(contactId)) go('/contacts');
  if (!UUID.test(groupId)) go(`/contacts/${contactId}?done=failed`);
  const role = str(form, 'role').slice(0, 40);
  const res = await api(`/groups/${groupId}/members`, {
    method: 'POST',
    body: { contactIds: [contactId], ...(role ? { role } : {}) },
  });
  go(
    `/contacts/${contactId}?done=${res.status === 200 ? 'added_to_group' : 'failed'}`,
  );
}
