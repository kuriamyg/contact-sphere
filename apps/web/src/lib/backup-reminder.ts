/**
 * When Today suggests a backup (C2). Pure, so it is unit-tested: only once
 * there is something worth keeping (10 contacts), not in the first three
 * days, and then when there has never been one or the last is a month old.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
export const REMIND_MIN_CONTACTS = 10;
export const REMIND_AFTER_DAYS = 30;
/** "Not now" hides it this long. */
export const SNOOZE_DAYS = 30;

export function backupDue(
  user: { createdAt?: string; lastBackupAt?: string | null },
  contacts: number,
  now: number,
): 'never' | 'old' | null {
  if (contacts < REMIND_MIN_CONTACTS) return null;
  if (!user.lastBackupAt) {
    const created = user.createdAt ? Date.parse(user.createdAt) : now;
    return now - created >= 3 * DAY_MS ? 'never' : null;
  }
  return now - Date.parse(user.lastBackupAt) >= REMIND_AFTER_DAYS * DAY_MS
    ? 'old'
    : null;
}

export const snoozeKey = (userId: string) => `cs-backup-snooze:${userId}`;

/** Snoozed if "Not now" was pressed within SNOOZE_DAYS of `now`. */
export function snoozed(stored: string | null, now: number): boolean {
  const at = stored ? Number(stored) : NaN;
  return Number.isFinite(at) && now - at < SNOOZE_DAYS * DAY_MS;
}

/** The reminder for a page, with the moment it was worked out. */
export function backupDueNow(
  user: Parameters<typeof backupDue>[0],
  contacts: number,
): { due: ReturnType<typeof backupDue>; now: number } {
  const now = Date.now();
  return { due: backupDue(user, contacts, now), now };
}
