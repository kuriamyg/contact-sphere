'use server';

import { api } from '@/lib/api';
import type { PhoneCopyContact } from '@/lib/phone-copy';
import { apiError } from '@/i18n/server';

/** The owner's active contacts, for the Android app to put on the phone. */
export async function contactsForPhone(): Promise<
  { contacts: PhoneCopyContact[] } | { error: string }
> {
  const res = await api<PhoneCopyContact[]>('/contacts/phone-copy');
  if (res.status !== 200 || !Array.isArray(res.data)) {
    return { error: await apiError(res.status, res.message) };
  }
  return { contacts: res.data };
}
