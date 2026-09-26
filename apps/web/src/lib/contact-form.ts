/**
 * The contact form's fields, as the browser submits them and as the API
 * wants them. Pure: no server or browser APIs, so it is unit-tested.
 */
export interface ContactFormValues {
  displayName: string;
  givenName: string;
  familyName: string;
  nickname: string;
  organization: string;
  jobTitle: string;
  birthday: string;
  notes: string;
  area: string;
  metThrough: string;
  /** As typed: comma-separated ("plumber, boda boda"). */
  tags: string;
  phones: { raw: string; label: string }[];
  emails: { address: string; label: string }[];
}

export const EMPTY_CONTACT: ContactFormValues = {
  displayName: '',
  givenName: '',
  familyName: '',
  nickname: '',
  organization: '',
  jobTitle: '',
  birthday: '',
  notes: '',
  area: '',
  metThrough: '',
  tags: '',
  phones: [{ raw: '', label: '' }],
  emails: [{ address: '', label: '' }],
};

const TEXT_FIELDS = [
  'displayName',
  'givenName',
  'familyName',
  'nickname',
  'organization',
  'jobTitle',
  'birthday',
  'notes',
  'area',
  'metThrough',
] as const;

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

/**
 * Reads the form. Phone and email rows arrive as parallel lists
 * (phoneRaw[i] with phoneLabel[i]).
 */
export function readContactForm(form: FormData): ContactFormValues {
  const v = { ...EMPTY_CONTACT } as ContactFormValues;
  for (const f of TEXT_FIELDS) v[f] = str(form.get(f));
  v.tags = str(form.get('tags'));
  const labels = form.getAll('phoneLabel').map(str);
  v.phones = form
    .getAll('phoneRaw')
    .map((raw, i) => ({ raw: str(raw), label: labels[i] ?? '' }));
  const emailLabels = form.getAll('emailLabel').map(str);
  v.emails = form
    .getAll('emailAddress')
    .map((a, i) => ({ address: str(a), label: emailLabels[i] ?? '' }));
  return v;
}

/**
 * The API request body: blank fields and blank rows left out (the API
 * treats absent as empty), labels only when given.
 */
export function toContactInput(v: ContactFormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    const t = v[f].trim();
    if (t) body[f] = t;
  }
  body.tags = splitTags(v.tags);
  body.phones = v.phones
    .filter((p) => p.raw.trim())
    .map((p) => ({
      raw: p.raw.trim(),
      ...(p.label.trim() ? { label: p.label.trim() } : {}),
    }));
  body.emails = v.emails
    .filter((e) => e.address.trim())
    .map((e) => ({
      address: e.address.trim(),
      ...(e.label.trim() ? { label: e.label.trim() } : {}),
    }));
  return body;
}

/** "Plumber, boda  boda,, plumber" → ["plumber", "boda boda"]. */
export function splitTags(typed: string): string[] {
  const out: string[] = [];
  for (const part of typed.split(',')) {
    const t = part.trim().replace(/\s+/g, ' ').toLowerCase();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Form values for editing an existing contact (one blank row if none). */
export function fromContact(c: {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  organization: string | null;
  jobTitle: string | null;
  birthday: string | null;
  notes: string | null;
  area?: string | null;
  metThrough?: string | null;
  tags?: string[];
  phones: { raw: string; label: string | null }[];
  emails: { address: string; label: string | null }[];
}): ContactFormValues {
  const derived = [c.givenName, c.familyName].filter(Boolean).join(' ');
  return {
    // Only keep a display name the owner chose, not one the API derived.
    displayName: c.displayName === derived ? '' : c.displayName,
    givenName: c.givenName ?? '',
    familyName: c.familyName ?? '',
    nickname: c.nickname ?? '',
    organization: c.organization ?? '',
    jobTitle: c.jobTitle ?? '',
    birthday: c.birthday ?? '',
    notes: c.notes ?? '',
    area: c.area ?? '',
    metThrough: c.metThrough ?? '',
    tags: (c.tags ?? []).join(', '),
    phones: c.phones.length
      ? c.phones.map((p) => ({ raw: p.raw, label: p.label ?? '' }))
      : [{ raw: '', label: '' }],
    emails: c.emails.length
      ? c.emails.map((e) => ({ address: e.address, label: e.label ?? '' }))
      : [{ address: '', label: '' }],
  };
}
