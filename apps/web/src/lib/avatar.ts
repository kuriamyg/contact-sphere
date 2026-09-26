/**
 * Initials and a stable colour for a person, so lists are easy to scan.
 * Pure (no React), so it is unit-tested.
 */
export function initials(name: string): string {
  // For an email, only the part before @ is a name.
  const words = name
    .split('@')[0]
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[\s@._-]+/)
    .filter((w) => /^\p{L}/u.test(w));
  if (words.length === 0) return /\d/.test(name) ? '#' : '?';
  const first = words[0][0];
  const second = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + second).toUpperCase();
}

/** Tailwind classes for eight calm colours, light and dark. */
export const AVATAR_COLOURS = [
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
  'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
] as const;

/** The same person always gets the same colour. */
export function avatarColour(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

/** The letter a name is listed under: A–Z, or # for anything else. */
export function indexLetter(name: string): string {
  const c = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}
