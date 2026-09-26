/**
 * A small vCard 3.0 for a QR code: name, work and ways to reach them —
 * never notes, birthday, tags or anything else the owner keeps private.
 * Every phone camera (Android, iPhone) offers to save it as a contact.
 */
export interface CardInput {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  organization: string | null;
  jobTitle: string | null;
  phones: { raw: string; e164: string | null; label: string | null }[];
  emails: { address: string; label: string | null }[];
}

const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

/** vCard TYPE for the labels the app uses; anything else is left out. */
const TYPES: Record<string, string> = {
  mobile: 'CELL',
  cell: 'CELL',
  work: 'WORK',
  home: 'HOME',
};
const typeOf = (label: string | null) => {
  const t = label ? TYPES[label.toLowerCase()] : undefined;
  return t ? `;TYPE=${t}` : '';
};

/** QR codes get hard to scan past a few hundred bytes. */
const MAX_PHONES = 3;
const MAX_EMAILS = 2;

export function cardVcf(c: CardInput): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(c.familyName ?? '')};${esc(c.givenName ?? (c.familyName ? '' : c.displayName))};;;`,
    `FN:${esc(c.displayName)}`,
  ];
  if (c.organization) lines.push(`ORG:${esc(c.organization)}`);
  if (c.jobTitle) lines.push(`TITLE:${esc(c.jobTitle)}`);
  for (const p of c.phones.slice(0, MAX_PHONES)) {
    lines.push(
      `TEL${typeOf(p.label)}:${p.e164 ?? p.raw.replace(/[^\d+]/g, '')}`,
    );
  }
  for (const e of c.emails.slice(0, MAX_EMAILS)) {
    lines.push(`EMAIL${typeOf(e.label)}:${e.address}`);
  }
  lines.push('END:VCARD');
  return lines.join('\r\n');
}
