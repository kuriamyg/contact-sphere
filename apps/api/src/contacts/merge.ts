/**
 * How two contacts become one (handoff §5 "safe merge"). Pure, so every rule
 * is unit-tested. Nothing is lost: numbers and emails are combined, notes
 * are joined, and where both contacts hold a different value for the same
 * field the owner chooses which one stays.
 */
export const MERGE_FIELDS = [
  'displayName',
  'givenName',
  'familyName',
  'nickname',
  'organization',
  'jobTitle',
  'birthday',
  'area',
  'metThrough',
] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
export type MergeChoices = Partial<Record<MergeField, 'keep' | 'merge'>>;

export interface MergeSide {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  organization: string | null;
  jobTitle: string | null;
  birthday: string | null;
  area: string | null;
  metThrough: string | null;
  notes: string | null;
  /** Normalised (lower-case); merged as a union, keep's first. */
  tags: string[];
  phones: {
    raw: string;
    e164: string | null;
    digits: string;
    label: string | null;
  }[];
  emails: { address: string; label: string | null }[];
}

export interface Conflict {
  field: MergeField;
  keep: string;
  merge: string;
}

export const MAX_VALUES = 20;
const MAX_NOTES = 10_000;

export function conflicts(keep: MergeSide, other: MergeSide): Conflict[] {
  const out: Conflict[] = [];
  for (const f of MERGE_FIELDS) {
    const a = keep[f];
    const b = other[f];
    if (a && b && a !== b) out.push({ field: f, keep: a, merge: b });
  }
  return out;
}

const phoneKey = (p: MergeSide['phones'][number]) =>
  p.e164 ?? `raw:${p.digits || p.raw}`;

/** The survivor after the merge. `keep` wins unless a choice says otherwise. */
export function mergeContacts(
  keep: MergeSide,
  other: MergeSide,
  choices: MergeChoices = {},
): MergeSide {
  const result = { ...keep };
  for (const f of MERGE_FIELDS) {
    const a = keep[f];
    const b = other[f];
    if (!a && b) result[f] = b;
    else if (a && b && a !== b && choices[f] === 'merge') {
      result[f] = b;
    }
  }

  // Notes are never chosen between: both are kept.
  const notes = [keep.notes, other.notes]
    .map((n) => n?.trim())
    .filter((n): n is string => Boolean(n));
  const uniqueNotes = [...new Set(notes)];
  result.notes = uniqueNotes.length
    ? uniqueNotes.join('\n\n').slice(0, MAX_NOTES)
    : null;

  result.tags = [...new Set([...keep.tags, ...other.tags])].slice(
    0,
    MAX_VALUES,
  );

  const seenPhones = new Set(keep.phones.map(phoneKey));
  result.phones = [
    ...keep.phones,
    ...other.phones.filter((p) => {
      const k = phoneKey(p);
      if (seenPhones.has(k)) return false;
      seenPhones.add(k);
      return true;
    }),
  ].slice(0, MAX_VALUES);

  const seenEmails = new Set(keep.emails.map((e) => e.address));
  result.emails = [
    ...keep.emails,
    ...other.emails.filter((e) => {
      if (seenEmails.has(e.address)) return false;
      seenEmails.add(e.address);
      return true;
    }),
  ].slice(0, MAX_VALUES);
  return result;
}
