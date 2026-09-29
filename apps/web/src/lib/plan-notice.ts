/**
 * When to remind someone that Plus is ending or has ended (C1). Pure, so
 * it is unit-tested. Days are Nairobi calendar days (UTC+3 all year).
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const NAIROBI_MS = 3 * 60 * 60 * 1000;

/** Warn this many days ahead; mention the end for this many days after. */
export const WARN_DAYS = 5;
export const AFTER_DAYS = 14;

export type PlanNotice =
  | { kind: 'ending'; daysLeft: number; until: string; paid: boolean }
  | { kind: 'ended'; until: string; paid: boolean };

const nairobiDay = (ms: number) => Math.floor((ms + NAIROBI_MS) / DAY_MS);

export function planNotice(
  user: {
    operator?: boolean;
    plusUntil?: string | null;
    paidPlus?: boolean;
  },
  now: number = Date.now(),
): PlanNotice | null {
  if (user.operator || !user.plusUntil) return null;
  const end = Date.parse(user.plusUntil);
  if (Number.isNaN(end)) return null;
  const paid = user.paidPlus ?? false;
  const daysLeft = nairobiDay(end) - nairobiDay(now);
  if (end > now) {
    return daysLeft <= WARN_DAYS
      ? { kind: 'ending', daysLeft, until: user.plusUntil, paid }
      : null;
  }
  return now - end <= AFTER_DAYS * DAY_MS
    ? { kind: 'ended', until: user.plusUntil, paid }
    : null;
}

/** Dismissed for the rest of this Nairobi day, for this notice only. */
export function dismissKey(
  userId: string,
  n: PlanNotice,
  now: number = Date.now(),
): string {
  return `cs-plan-notice:${userId}:${n.kind}:${n.until}:${nairobiDay(now)}`;
}

/** The notice for a page, with the moment it was worked out. */
export function planNoticeNow(user: Parameters<typeof planNotice>[0]): {
  notice: PlanNotice | null;
  now: number;
} {
  const now = Date.now();
  return { notice: planNotice(user, now), now };
}
