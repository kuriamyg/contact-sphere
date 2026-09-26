/**
 * Calendar arithmetic for reminders (Phase 9). Days are Nairobi days
 * (UTC+3 all year, no daylight saving). Pure, so it is unit-tested.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

export const KEEP_IN_TOUCH_DAYS = [7, 14, 30, 60, 90, 180, 365] as const;

/** Today's date in Nairobi, "YYYY-MM-DD". */
export function nairobiToday(now: Date = new Date()): string {
  return new Date(now.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Days from a to b ("YYYY-MM-DD"); negative when b is earlier. */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS,
  );
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * The next time a birthday comes round, from `today` (today counts). A
 * 29 February birthday falls on 28 February in other years.
 */
export function nextBirthday(
  birthday: string,
  today: string,
): { on: string; daysAway: number; turning: number } {
  const [by, bm, bd] = birthday.split('-').map(Number);
  const ty = Number(today.slice(0, 4));
  const onIn = (y: number) => {
    const d = bm === 2 && bd === 29 && !isLeap(y) ? 28 : bd;
    return `${y}-${String(bm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  let y = ty;
  let on = onIn(y);
  if (on < today) on = onIn(++y);
  return { on, daysAway: daysBetween(today, on), turning: y - by };
}

/**
 * When the owner should next be in touch, and by how many days that is
 * overdue (0 = due today, negative = not yet). Never contacted counts from
 * the day the reminder was added… which we do not store, so from `since`
 * (the contact's creation day).
 */
export function keepInTouchDue(
  everyDays: number,
  lastContacted: string | null,
  since: string,
  today: string,
): { dueOn: string; overdueDays: number } {
  const from = lastContacted ?? since;
  const dueOn = addDays(from, everyDays);
  return { dueOn, overdueDays: daysBetween(dueOn, today) };
}
