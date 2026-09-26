'use server';

import { redirect } from 'next/navigation';

import { api } from '@/lib/api';
import { UUID } from '@/lib/contacts';
import type { SmsQuote } from '@/lib/reach';

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v.trim() : '';
};

export interface PushDeviceInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Called from the browser after it subscribed; true when saved. */
export async function savePushDevice(d: PushDeviceInput): Promise<boolean> {
  if (
    typeof d?.endpoint !== 'string' ||
    typeof d.p256dh !== 'string' ||
    typeof d.auth !== 'string'
  ) {
    return false;
  }
  const res = await api('/reach/push/devices', {
    method: 'POST',
    body: { endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth },
  });
  return res.status === 204;
}

export async function removePushDevice(endpoint: string): Promise<boolean> {
  if (typeof endpoint !== 'string') return false;
  const res = await api('/reach/push/devices/remove', {
    method: 'POST',
    body: { endpoint },
  });
  return res.status === 204;
}

export async function sendTestPush(): Promise<number | null> {
  const res = await api<{ sent: number }>('/reach/push/test', {
    method: 'POST',
  });
  return res.status === 200 && res.data ? res.data.sent : null;
}

/** "This is me": the contact shown as the owner's QR card. */
export async function setCard(form: FormData): Promise<void> {
  const id = str(form, 'contactId');
  if (!UUID.test(id)) redirect('/contacts');
  const res = await api('/reach/card', {
    method: 'PUT',
    body: { contactId: id },
  });
  redirect(res.status === 204 ? '/card' : `/contacts/${id}?done=failed`);
}

export async function clearCard(): Promise<void> {
  await api('/reach/card', { method: 'PUT', body: { contactId: null } });
  redirect('/card');
}

export async function quoteGroupSms(
  groupId: string,
  message: string,
): Promise<SmsQuote | null> {
  if (!UUID.test(groupId) || typeof message !== 'string' || !message.trim()) {
    return null;
  }
  const res = await api<SmsQuote>(`/reach/groups/${groupId}/sms/quote`, {
    method: 'POST',
    body: { message: message.slice(0, 900) },
  });
  return res.status === 200 ? res.data : null;
}

export interface SendResult {
  ok: boolean;
  message: string;
}

export async function sendGroupSms(
  groupId: string,
  message: string,
): Promise<SendResult> {
  if (!UUID.test(groupId) || typeof message !== 'string' || !message.trim()) {
    return { ok: false, message: 'Write a message first.' };
  }
  const res = await api<{ recipients: number; accepted: number }>(
    `/reach/groups/${groupId}/sms`,
    { method: 'POST', body: { message: message.slice(0, 900) } },
  );
  if (res.status === 200 && res.data) {
    const { accepted, recipients } = res.data;
    return {
      ok: true,
      message:
        accepted === recipients
          ? `Sent to ${accepted} ${accepted === 1 ? 'person' : 'people'}.`
          : `Sent to ${accepted} of ${recipients}. The rest could not be delivered.`,
    };
  }
  return {
    ok: false,
    message:
      res.message ??
      (res.status === 0
        ? 'Could not reach Contact Sphere. Try again.'
        : 'Could not send. Try again.'),
  };
}
