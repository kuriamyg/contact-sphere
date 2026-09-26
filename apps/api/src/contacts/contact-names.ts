/** The fields a display name can be derived from, in order of preference. */
export interface NameSources {
  displayName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
  organization?: string | null;
  firstPhone?: string | null;
  firstEmail?: string | null;
}

const clean = (s?: string | null) => s?.trim().replace(/\s+/g, ' ') ?? '';

/**
 * What lists show for a contact. An explicit display name wins; otherwise
 * "Given Family", then nickname, organisation, first number, first email.
 * Returns "" only when there is nothing at all to identify the contact.
 */
export function deriveDisplayName(src: NameSources): string {
  const explicit = clean(src.displayName);
  if (explicit) return explicit;
  const full = [clean(src.givenName), clean(src.familyName)]
    .filter(Boolean)
    .join(' ');
  return (
    full ||
    clean(src.nickname) ||
    clean(src.organization) ||
    clean(src.firstPhone) ||
    clean(src.firstEmail)
  );
}

/**
 * Sort key: lower-case with accents removed, so "Émile" sorts with "emile"
 * and "Ann" with "ann". Stored in `contacts.sort_name`.
 */
export function sortKey(displayName: string): string {
  return displayName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .slice(0, 200);
}

/** Lower-case with accents removed: "Émilie" and "emilie" match. */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;

/**
 * Tags as stored: trimmed, single-spaced, lower-case, without repeats, in
 * the order given. "Plumber", " plumber " and "PLUMBER" are one tag.
 */
export function normaliseTags(tags: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const t of tags ?? []) {
    const tag = t.trim().replace(/\s+/g, ' ').toLowerCase();
    if (tag && tag.length <= MAX_TAG_LENGTH && !out.includes(tag))
      out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

export interface SearchSources {
  displayName: string;
  givenName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  area?: string | null;
  metThrough?: string | null;
  tags?: readonly string[];
  notes?: string | null;
}

/**
 * Everything a word search looks through, folded, in one column
 * (`contacts.search_text`), so "plumber kasarani" can require each word
 * to appear somewhere on the contact. Maintained by the API, like sort_name.
 */
export function searchText(s: SearchSources): string {
  return fold(
    [
      s.displayName,
      s.givenName,
      s.familyName,
      s.nickname,
      s.organization,
      s.jobTitle,
      s.area,
      s.metThrough,
      ...(s.tags ?? []),
      s.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' '),
  ).slice(0, 12_000);
}

/** The words of a search, folded; at most six. */
export function searchWords(q: string): string[] {
  return fold(q).split(/\s+/).filter(Boolean).slice(0, 6);
}
