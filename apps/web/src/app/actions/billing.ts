'use server';

import { revalidatePath } from 'next/cache';

import { apiError, getMessages } from '@/i18n/server';
import { api } from '@/lib/api';
import type { PaymentView } from '@/lib/billing';

export interface PayState {
  error?: string;
  paymentId?: string;
  amountKes?: number;
}

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
};

const failure = apiError;

/** Sends the M-Pesa prompt to the phone (B9). */
export async function payWithMpesa(
  _: PayState,
  form: FormData,
): Promise<PayState> {
  const months = field(form, 'months') === '12' ? 12 : 1;
  const res = await api<{ paymentId: string }>('/billing/mpesa', {
    method: 'POST',
    body: { months, phone: field(form, 'phone') },
  });
  if (res.status !== 201 || !res.data) {
    return { error: await failure(res.status, res.message) };
  }
  return { paymentId: res.data.paymentId, amountKes: months === 12 ? 990 : 99 };
}

/** Polled by the Plan section while the customer enters their PIN. */
export async function checkPayment(id: string): Promise<PaymentView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await api<PaymentView>(`/billing/payments/${id}`);
  if (res.status !== 200 || !res.data) return null;
  if (res.data.status === 'paid') revalidatePath('/', 'layout');
  return res.data;
}

export interface OperatorState {
  error?: string;
  success?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function grantMonths(
  _: OperatorState,
  form: FormData,
): Promise<OperatorState> {
  const id = field(form, 'accountId');
  if (!UUID.test(id)) return { error: (await getMessages()).errors.generic };
  const res = await api(`/operator/accounts/${id}/grant`, {
    method: 'POST',
    body: { months: Number(field(form, 'months')) },
  });
  if (res.status !== 204)
    return { error: await failure(res.status, res.message) };
  revalidatePath('/operator');
  return { success: (await getMessages()).client.operator.done };
}

export async function recordPayment(
  _: OperatorState,
  form: FormData,
): Promise<OperatorState> {
  const id = field(form, 'accountId');
  if (!UUID.test(id)) return { error: (await getMessages()).errors.generic };
  const res = await api(`/operator/accounts/${id}/payments`, {
    method: 'POST',
    body: {
      receipt: field(form, 'receipt'),
      amountKes: Number(field(form, 'amountKes')),
      months: Number(field(form, 'months')),
    },
  });
  if (res.status !== 204)
    return { error: await failure(res.status, res.message) };
  revalidatePath('/operator');
  return { success: (await getMessages()).client.operator.done };
}
