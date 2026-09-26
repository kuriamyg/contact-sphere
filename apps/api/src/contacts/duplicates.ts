/**
 * Possible duplicates, with the reasons shown to the owner (handoff §5:
 * explainable signals, never automatic merges). Pure, so it is unit-tested.
 */
export type DuplicateReason =
  'same_phone' | 'same_email' | 'same_name' | 'similar_name';

export interface DuplicateInput {
  id: string;
  sortName: string;
  phones: { e164: string | null; digits: string }[];
  emails: string[];
}

export interface DuplicatePair {
  /** The two ids, smaller first. */
  aId: string;
  bId: string;
  reasons: DuplicateReason[];
  /** high: a number or email matches; medium: names only. */
  confidence: 'high' | 'medium';
}

/**
 * A value shared by more than this many contacts is a shared line (an
 * office or church number), not evidence that they are the same person.
 */
const MAX_BUCKET = 8;
/** Enough to review; the owner merges, and the next ones appear. */
export const MAX_PAIRS = 200;

export const pairKey = (a: string, b: string) =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

/** Name words in a fixed order: "wanjiru ann" and "ann wanjiru" match. */
function nameTokens(sortName: string): string | null {
  const words = sortName
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length >= 2 ? [...words].sort().join(' ') : null;
}

export function findDuplicates(
  contacts: DuplicateInput[],
  dismissed: Set<string>,
): DuplicatePair[] {
  const buckets = new Map<string, string[]>();
  const add = (key: string, id: string) => {
    const b = buckets.get(key);
    if (!b) buckets.set(key, [id]);
    else if (!b.includes(id)) b.push(id);
  };
  for (const c of contacts) {
    for (const p of c.phones) {
      const key = p.e164 ?? (p.digits.length >= 7 ? p.digits : null);
      if (key) add(`same_phone:${key}`, c.id);
    }
    for (const e of c.emails) add(`same_email:${e}`, c.id);
    if (c.sortName.trim()) add(`same_name:${c.sortName.trim()}`, c.id);
    const t = nameTokens(c.sortName);
    if (t) add(`similar_name:${t}`, c.id);
  }

  const pairs = new Map<string, Set<DuplicateReason>>();
  for (const [key, ids] of buckets) {
    if (ids.length < 2 || ids.length > MAX_BUCKET) continue;
    const reason = key.slice(0, key.indexOf(':')) as DuplicateReason;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = pairKey(ids[i], ids[j]);
        if (dismissed.has(k)) continue;
        const set = pairs.get(k) ?? new Set<DuplicateReason>();
        set.add(reason);
        pairs.set(k, set);
      }
    }
  }

  const out: DuplicatePair[] = [];
  for (const [k, set] of pairs) {
    // "Same name" already says everything "similar name" would.
    if (set.has('same_name')) set.delete('similar_name');
    const reasons = (
      ['same_phone', 'same_email', 'same_name', 'similar_name'] as const
    ).filter((r) => set.has(r));
    const [aId, bId] = k.split('|');
    out.push({
      aId,
      bId,
      reasons,
      confidence:
        set.has('same_phone') || set.has('same_email') ? 'high' : 'medium',
    });
  }
  const rank = (p: DuplicatePair) =>
    (p.confidence === 'high' ? 10 : 0) + p.reasons.length;
  return out
    .sort((x, y) => rank(y) - rank(x) || x.aId.localeCompare(y.aId))
    .slice(0, MAX_PAIRS);
}
