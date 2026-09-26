import 'server-only';

import { api } from './api';
import { failedLoad } from './auth';

/** Shapes returned by the API's /remember routes (apps/api remember). */
type Phone = { raw: string; e164: string | null } | null;

export interface TodayView {
  today: string;
  followUps: {
    id: string;
    contactId: string;
    displayName: string;
    note: string;
    dueOn: string;
    daysAway: number;
    phone: Phone;
  }[];
  keepInTouch: {
    contactId: string;
    displayName: string;
    everyDays: number;
    lastContactedAt: string | null;
    dueOn: string;
    overdueDays: number;
    phone: Phone;
  }[];
  birthdays: {
    contactId: string;
    displayName: string;
    on: string;
    daysAway: number;
    turning: number;
    phone: Phone;
  }[];
}

export interface ContactReminders {
  keepInTouchDays: number | null;
  lastContactedAt: string | null;
  due: { dueOn: string; overdueDays: number } | null;
  followUps: {
    id: string;
    dueOn: string;
    note: string;
    doneAt: string | null;
  }[];
}

export const CADENCES = [
  { days: 7, label: 'Every week' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Every month' },
  { days: 60, label: 'Every 2 months' },
  { days: 90, label: 'Every 3 months' },
  { days: 180, label: 'Every 6 months' },
  { days: 365, label: 'Every year' },
] as const;

export const cadenceLabel = (days: number) =>
  CADENCES.find((c) => c.days === days)?.label.toLowerCase() ??
  `every ${days} days`;

export async function getToday(): Promise<TodayView> {
  const res = await api<TodayView>('/remember/today');
  if (res.status !== 200 || !res.data) {
    failedLoad(res.status);
  }
  return res.data;
}

/** Best effort: null if unavailable, so the contact page still shows. */
export async function remindersFor(
  id: string,
): Promise<ContactReminders | null> {
  const res = await api<ContactReminders>(`/remember/contacts/${id}`);
  return res.status === 200 && res.data ? res.data : null;
}

/** "in 3 days", "today", "2 days late". */
export function relativeDay(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
