/**
 * "Import from this phone" (P5a, ADR 0025). Inside the Android app the
 * native bridge (window.Capacitor) reads the phone's address book; the
 * contacts are turned into vCard text and go through the same preview and
 * "skip what you already have" as a .vcf file. In a browser this is absent.
 */

export interface PhoneContact {
  displayName: string;
  givenName?: string;
  familyName?: string;
  organization?: string;
  jobTitle?: string;
  phones: { number: string; label?: string }[];
  emails: { address: string }[];
}

interface Bridge {
  isNativePlatform?: () => boolean;
  nativePromise?: (
    plugin: string,
    method: string,
    options: object,
  ) => Promise<unknown>;
}

const bridge = (): Bridge | undefined =>
  (globalThis as { Capacitor?: Bridge }).Capacitor;

/** True only inside the Android app. */
export function canReadPhoneContacts(): boolean {
  const b = bridge();
  return !!b?.isNativePlatform?.() && typeof b.nativePromise === 'function';
}

export class PhoneContactsDenied extends Error {}

/** Asks Android for permission (once) and reads every contact. */
export async function readPhoneContacts(): Promise<PhoneContact[]> {
  const b = bridge();
  if (!b?.nativePromise) throw new Error('Not in the app');
  try {
    const res = (await b.nativePromise('PhoneContacts', 'readAll', {})) as {
      contacts?: PhoneContact[];
    };
    return Array.isArray(res?.contacts) ? res.contacts : [];
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'PERMISSION_DENIED') throw new PhoneContactsDenied();
    throw e;
  }
}

/** vCard 3.0 text escaping: backslash, comma, semicolon, new lines. */
const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\;')
    .replace(/\r?\n/g, '\\n');

const TYPES: Record<string, string> = {
  mobile: 'CELL',
  home: 'HOME',
  work: 'WORK',
};

/** One vCard per contact that has a name, a number or an email. */
export function toVcf(list: readonly PhoneContact[]): string {
  const cards: string[] = [];
  for (const c of list) {
    const phones = (c.phones ?? []).filter((p) => p.number?.trim());
    const emails = (c.emails ?? []).filter((e) => e.address?.trim());
    const fn =
      c.displayName?.trim() ||
      [c.givenName, c.familyName].filter(Boolean).join(' ').trim();
    if (!fn && phones.length === 0 && emails.length === 0) continue;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${esc(fn || phones[0]?.number || emails[0]?.address || '')}`,
      `N:${esc(c.familyName ?? '')};${esc(c.givenName ?? '')};;;`,
    ];
    if (c.organization?.trim()) lines.push(`ORG:${esc(c.organization.trim())}`);
    if (c.jobTitle?.trim()) lines.push(`TITLE:${esc(c.jobTitle.trim())}`);
    for (const p of phones) {
      const type = p.label ? TYPES[p.label] : undefined;
      lines.push(`TEL${type ? `;TYPE=${type}` : ''}:${esc(p.number.trim())}`);
    }
    for (const e of emails) lines.push(`EMAIL:${esc(e.address.trim())}`);
    lines.push('END:VCARD');
    cards.push(lines.join('\r\n'));
  }
  return cards.join('\r\n');
}
