/**
 * vCard (.vcf) reading — versions 2.1 (older Android), 3.0 (iPhone, Google)
 * and 4.0 — into plain contact data. Pure: no I/O, so it is unit-tested
 * with real-world shapes.
 *
 * Deliberately tolerant: phone exports are messy. What cannot be used is
 * dropped with a warning count, never a failure of the whole file.
 */

export interface ParsedCard {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  nickname?: string;
  organization?: string;
  jobTitle?: string;
  notes?: string;
  /** YYYY-MM-DD, only when the card has a full, plausible date. */
  birthday?: string;
  /** Group names from CATEGORIES, as written (system groups removed). */
  categories?: string[];
  phones: { raw: string; label?: string }[];
  emails: { address: string; label?: string }[];
}

export interface ParseResult {
  cards: ParsedCard[];
  /** Cards in the file (BEGIN:VCARD … END:VCARD). */
  cardCount: number;
  warnings: {
    /** Email values that are not addresses. */
    invalidEmails: number;
    /** Numbers/emails beyond the per-contact limit. */
    tooManyValues: number;
    /** Fields longer than their limit, shortened. */
    truncatedFields: number;
    /** Birthdays that are partial (no year) or not real dates. */
    unusableBirthdays: number;
  };
}

export const LIMITS = {
  name: 100,
  displayName: 200,
  organization: 200,
  jobTitle: 200,
  notes: 10_000,
  phoneRaw: 64,
  label: 40,
  email: 254,
  valuesPerContact: 20,
} as const;

interface Prop {
  group?: string;
  name: string;
  params: Map<string, string[]>;
  /** Bare parameters (vCard 2.1 "TEL;CELL;PREF:") and TYPE values. */
  types: string[];
  value: string;
}

/** Unfolds continuation lines: RFC folding and 2.1 quoted-printable soft breaks. */
function logicalLines(text: string): string[] {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    const prev = out.length - 1;
    if (prev >= 0 && (line.startsWith(' ') || line.startsWith('\t'))) {
      out[prev] += line.slice(1);
    } else if (
      prev >= 0 &&
      /QUOTED-PRINTABLE/i.test(out[prev].split(':')[0] ?? '') &&
      out[prev].endsWith('=')
    ) {
      out[prev] = out[prev].slice(0, -1) + line;
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Splits on `sep` outside double quotes. */
function splitOutsideQuotes(s: string, sep: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    if (ch === sep && !quoted) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

function parseProp(line: string): Prop | null {
  // The value starts after the first ':' that is not inside a quoted param.
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    if (line[i] === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 1) return null;
  const [head, ...paramParts] = splitOutsideQuotes(line.slice(0, colon), ';');
  const dot = head.lastIndexOf('.');
  const prop: Prop = {
    group: dot > 0 ? head.slice(0, dot).toLowerCase() : undefined,
    name: head.slice(dot + 1).toUpperCase(),
    params: new Map(),
    types: [],
    value: line.slice(colon + 1),
  };
  for (const p of paramParts) {
    const eq = p.indexOf('=');
    if (eq < 0) {
      prop.types.push(p.trim().toLowerCase());
      continue;
    }
    const key = p.slice(0, eq).trim().toUpperCase();
    const values = splitOutsideQuotes(p.slice(eq + 1), ',').map((v) =>
      v.trim().replace(/^"|"$/g, ''),
    );
    prop.params.set(key, [...(prop.params.get(key) ?? []), ...values]);
    // TYPE lists may be quoted as one value ("voice,cell"); types never
    // contain commas themselves.
    if (key === 'TYPE') {
      prop.types.push(
        ...values
          .flatMap((v) => v.split(','))
          .map((v) => v.trim().toLowerCase()),
      );
    }
  }
  return prop;
}

function decodeQuotedPrintable(value: string, charset: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const hex = value.slice(i + 1, i + 3);
    if (value[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      i += 2;
    } else {
      // Plain characters: encode as UTF-8 so non-ASCII text survives.
      bytes.push(...Buffer.from(value[i], 'utf8'));
    }
  }
  try {
    return new TextDecoder(charset || 'utf-8').decode(Uint8Array.from(bytes));
  } catch {
    return new TextDecoder('utf-8').decode(Uint8Array.from(bytes));
  }
}

/** vCard text escapes: \n, \, \; \\. */
function unescapeText(s: string): string {
  return s.replace(/\\([nN,;\\:])/g, (_, c: string) =>
    c === 'n' || c === 'N' ? '\n' : c,
  );
}

/**
 * Splits a structured value (N, ORG) on unescaped ';' — or a list value
 * (CATEGORIES) on unescaped ',' — then unescapes.
 */
function components(raw: string, sep = ';'): string[] {
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\' && i + 1 < raw.length) {
      cur += raw[i] + raw[i + 1];
      i++;
    } else if (raw[i] === sep) {
      parts.push(cur);
      cur = '';
    } else cur += raw[i];
  }
  parts.push(cur);
  return parts.map((p) => unescapeText(p).trim());
}

/**
 * Groups phones and Google add to every contact, which say nothing about
 * the person: "My Contacts", "Starred", "Imported on 3/5", …
 */
const SYSTEM_GROUPS = new Set([
  'mycontacts',
  'my contacts',
  'contacts',
  'starred',
  'starred in android',
  'favorites',
  'favourites',
]);
export function isSystemGroup(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    SYSTEM_GROUPS.has(n) ||
    n.startsWith('system group:') ||
    /^imported on\b/.test(n)
  );
}

/** The property value as text, decoded. Null for binary (photos, logos). */
function textValue(p: Prop): string | null {
  const encoding = (
    p.params.get('ENCODING')?.[0] ??
    p.types.find((t) => /^(quoted-printable|base64|b)$/.test(t)) ??
    ''
  ).toLowerCase();
  if (encoding === 'b' || encoding === 'base64') return null;
  if (encoding === 'quoted-printable') {
    return decodeQuotedPrintable(p.value, p.params.get('CHARSET')?.[0] ?? '');
  }
  return p.value;
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

const PHONE_LABELS: Record<string, string> = {
  cell: 'mobile',
  mobile: 'mobile',
  iphone: 'mobile',
  home: 'home',
  work: 'work',
  main: 'main',
  fax: 'fax',
  pager: 'pager',
  other: 'other',
};
const EMAIL_LABELS: Record<string, string> = {
  home: 'home',
  work: 'work',
  other: 'other',
};

function labelFrom(
  types: string[],
  known: Record<string, string>,
  groupLabel?: string,
): string | undefined {
  if (groupLabel) return groupLabel;
  for (const t of types) if (known[t]) return known[t];
  return undefined;
}

/** "1990-04-12", "19900412", "1990-04-12T00:00:00Z" → "1990-04-12". */
function parseBirthday(v: string): string | null {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(v.trim());
  if (!m) return null;
  const s = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${s}T00:00:00Z`);
  if (
    Number.isNaN(d.getTime()) ||
    d.toISOString().slice(0, 10) !== s ||
    d.getUTCFullYear() < 1900 ||
    d.getTime() > Date.now()
  ) {
    return null;
  }
  return s;
}

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseVcf(text: string): ParseResult {
  const result: ParseResult = {
    cards: [],
    cardCount: 0,
    warnings: {
      invalidEmails: 0,
      tooManyValues: 0,
      truncatedFields: 0,
      unusableBirthdays: 0,
    },
  };
  const w = result.warnings;
  const cap = (s: string | undefined, max: number): string | undefined => {
    if (!s) return undefined;
    if (s.length <= max) return s;
    w.truncatedFields++;
    return s.slice(0, max);
  };

  let props: Prop[] | null = null;
  for (const line of logicalLines(text.replace(/^\uFEFF/, ''))) {
    const trimmed = line.trim();
    if (/^BEGIN:VCARD$/i.test(trimmed)) {
      props = [];
      continue;
    }
    if (/^END:VCARD$/i.test(trimmed)) {
      if (props) {
        result.cardCount++;
        result.cards.push(toCard(props));
      }
      props = null;
      continue;
    }
    if (props && trimmed) {
      const p = parseProp(line);
      if (p) props.push(p);
    }
  }
  return result;

  function toCard(ps: Prop[]): ParsedCard {
    // Apple: "item1.TEL:…" with "item1.X-ABLabel:_$!<Mobile>!$_".
    const groupLabels = new Map<string, string>();
    for (const p of ps) {
      if (p.name === 'X-ABLABEL' && p.group) {
        const l = tidy(
          unescapeText(textValue(p) ?? '').replace(/^_\$!<(.*)>!\$_$/, '$1'),
        ).toLowerCase();
        if (l) groupLabels.set(p.group, l.slice(0, LIMITS.label));
      }
    }
    const card: ParsedCard = { phones: [], emails: [] };
    const seenDigits = new Set<string>();
    const seenEmails = new Set<string>();
    for (const p of ps) {
      const v = textValue(p);
      if (v === null) continue;
      switch (p.name) {
        case 'FN':
          card.displayName ??= cap(tidy(unescapeText(v)), LIMITS.displayName);
          break;
        case 'N': {
          const [family, given, additional] = components(v);
          const g = tidy([given, additional].filter(Boolean).join(' '));
          card.givenName ??= cap(g || undefined, LIMITS.name);
          card.familyName ??= cap(tidy(family ?? '') || undefined, LIMITS.name);
          break;
        }
        case 'NICKNAME':
          card.nickname ??= cap(
            tidy(unescapeText(v).split(',')[0] ?? '') || undefined,
            LIMITS.name,
          );
          break;
        case 'ORG':
          card.organization ??= cap(
            tidy(components(v)[0] ?? '') || undefined,
            LIMITS.organization,
          );
          break;
        case 'TITLE':
          card.jobTitle ??= cap(
            tidy(unescapeText(v)) || undefined,
            LIMITS.jobTitle,
          );
          break;
        case 'NOTE': {
          const note = unescapeText(v).trim();
          if (note) {
            card.notes = cap(
              card.notes ? `${card.notes}\n${note}` : note,
              LIMITS.notes,
            );
          }
          break;
        }
        case 'CATEGORIES': {
          const groups = components(v, ',')
            .map((g) => tidy(g.replace(/^\*\s*/, '')))
            .filter((g) => g && !isSystemGroup(g));
          if (groups.length) {
            card.categories = [...(card.categories ?? []), ...groups];
          }
          break;
        }
        case 'BDAY': {
          const b = parseBirthday(unescapeText(v));
          if (b) card.birthday ??= b;
          else if (v.trim()) w.unusableBirthdays++;
          break;
        }
        case 'TEL': {
          const raw = tidy(unescapeText(v).replace(/^tel:/i, ''));
          const digits = raw.replace(/\D/g, '');
          if (!raw || seenDigits.has(digits || raw)) break;
          if (card.phones.length >= LIMITS.valuesPerContact) {
            w.tooManyValues++;
            break;
          }
          seenDigits.add(digits || raw);
          card.phones.push({
            raw: cap(raw, LIMITS.phoneRaw)!,
            label: labelFrom(
              p.types,
              PHONE_LABELS,
              p.group && groupLabels.get(p.group),
            ),
          });
          break;
        }
        case 'EMAIL': {
          const address = unescapeText(v)
            .replace(/^mailto:/i, '')
            .trim()
            .toLowerCase();
          if (!address || seenEmails.has(address)) break;
          if (!EMAIL_SHAPE.test(address) || address.length > LIMITS.email) {
            w.invalidEmails++;
            break;
          }
          if (card.emails.length >= LIMITS.valuesPerContact) {
            w.tooManyValues++;
            break;
          }
          seenEmails.add(address);
          card.emails.push({
            address,
            label: labelFrom(
              p.types,
              EMAIL_LABELS,
              p.group && groupLabels.get(p.group),
            ),
          });
          break;
        }
      }
    }
    return card;
  }
}
