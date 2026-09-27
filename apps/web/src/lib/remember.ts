import 'server-only';

import type { Messages } from '@/i18n/en';
import { fmt } from '@/i18n/format';

import { api } from './api';
import { failedLoad } from './auth';

/** Shapes returned by the API's /remember routes (apps/api remember). */
type Phone = { raw: string; e164: string | null } | null;

export interface TodayView {
  today: string;
  /** Missing from an older API while it deploys. */
  setup?: { contacts: number; birthdays: number; keepInTouch: number };
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

/** Keep-in-touch choices, in days (the API accepts exactly these). */
export const CADENCE_DAYS = [7, 14, 30, 60, 90, 180, 365] as const;

type RememberText = Messages['remember'];

/** "every month" — the cadence as a phrase, lower-case. */
export const cadenceLabel = (days: number, t: RememberText) => {
  const label = (t.cadences as Record<string, string>)[String(days)];
  return label ? label.toLowerCase() : fmt(t.everyNDays, { n: days });
};

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

/** "in 3 days", "today", "yesterday". */
export function relativeDay(days: number, t: RememberText): string {
  if (days === 0) return t.today;
  if (days === 1) return t.tomorrow;
  if (days === -1) return t.yesterday;
  return days > 0 ? fmt(t.inDays, { n: days }) : fmt(t.daysAgo, { n: -days });
}
