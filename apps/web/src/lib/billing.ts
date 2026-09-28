import 'server-only';

import { api } from './api';

/** Shapes returned by the API's /billing and /operator routes (B9). */
export interface PaymentView {
  id: string;
  method: 'mpesa_stk' | 'manual' | 'grant';
  months: number;
  amountKes: number;
  status: 'pending' | 'paid' | 'failed';
  receipt: string | null;
  resultDesc: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface BillingStatus {
  plan: 'plus' | 'free';
  plusUntil: string | null;
  operator: boolean;
  prices: { months: number; amountKes: number }[];
  mpesa: boolean;
  payTo: string | null;
  payments: PaymentView[];
}

export interface AccountRow {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  operator: boolean;
  createdAt: string;
  plan: 'plus' | 'free';
  plusUntil: string | null;
  contacts: number;
  groups: number;
  lastSeenAt: string | null;
  paidKes: number;
}

/** Null while an older API is still deploying, or on failure. */
export async function getBilling(): Promise<BillingStatus | null> {
  const res = await api<BillingStatus>('/billing');
  return res.status === 200 && res.data ? res.data : null;
}

export async function getAccounts(): Promise<AccountRow[] | null> {
  const res = await api<AccountRow[]>('/operator/accounts');
  return res.status === 200 && res.data ? res.data : null;
}

/** An M-Pesa prompt paid in the last 10 minutes. */
export function paidRecently(payments: PaymentView[], now = Date.now()) {
  return payments.some(
    (p) =>
      p.method === 'mpesa_stk' &&
      p.paidAt !== null &&
      now - Date.parse(p.paidAt) < 10 * 60_000,
  );
}
