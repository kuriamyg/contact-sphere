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
