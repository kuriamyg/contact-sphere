/**
 * Contacts → vCard 3.0, the version every phone and address book imports.
 * Pure, so a round trip (write, then parse) is unit-tested.
 */
export interface ExportContact {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  organization: string | null;
  jobTitle: string | null;
  notes: string | null;
  birthday: string | null;
  /** Written as CATEGORIES, which phones import as groups or labels. */
  tags?: string[];
  phones: { raw: string; e164: string | null; label: string | null }[];
  emails: { address: string; label: string | null }[];
}

const escape = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

/** Folds at 75 characters (RFC 6350 §3.2), never splitting a character. */
function fold(line: string): string {
  const chars = [...line];
  if (chars.length <= 75) return line;
  const out: string[] = [chars.slice(0, 75).join('')];
  for (let i = 75; i < chars.length; i += 74) {
    out.push(' ' + chars.slice(i, i + 74).join(''));
  }
  return out.join('\r\n');
}

/** A TYPE parameter from a free-text label, reduced to safe characters. */
function typeParam(label: string | null): string {
  const t = label?.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!t) return '';
  return `;TYPE=${t === 'mobile' ? 'cell' : t}`;
}

export function writeVcard(c: ExportContact): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(
    `N:${escape(c.familyName ?? '')};${escape(c.givenName ?? '')};;;`,
    `FN:${escape(c.displayName)}`,
  );
  if (c.nickname) lines.push(`NICKNAME:${escape(c.nickname)}`);
  if (c.organization) lines.push(`ORG:${escape(c.organization)}`);
  if (c.jobTitle) lines.push(`TITLE:${escape(c.jobTitle)}`);
  c.phones.forEach((p, i) =>
    lines.push(
      `TEL${typeParam(p.label)}${i === 0 ? ';TYPE=pref' : ''}:${escape(p.e164 ?? p.raw)}`,
    ),
  );
  c.emails.forEach((e, i) =>
    lines.push(
      `EMAIL;TYPE=internet${typeParam(e.label)}${i === 0 ? ';TYPE=pref' : ''}:${escape(e.address)}`,
    ),
  );
  if (c.birthday) lines.push(`BDAY:${c.birthday}`);
  if (c.notes) lines.push(`NOTE:${escape(c.notes)}`);
  if (c.tags?.length) lines.push(`CATEGORIES:${c.tags.map(escape).join(',')}`);
  lines.push('END:VCARD');
  return lines.map(fold).join('\r\n') + '\r\n';
}
