import { KEEP_IN_TOUCH_DAYS } from '../remember/dates';
import { GROUP_KINDS, type GroupKind } from '../groups/groups.dto';

/**
 * The backup archive (ADR 0009): everything the owner keeps, as plain JSON.
 * The browser encrypts it before it ever becomes a file; the API only
 * produces it for the signed-in owner and reads it back on restore.
 *
 * Restoring reads a file that may be old, edited or made by another
 * version, so every field is checked and trimmed to what the database
 * accepts. Anything unreadable is counted and left out, never guessed.
 */
export const ARCHIVE_FORMAT = 'contact-sphere-archive';
export const ARCHIVE_VERSION = 1;

export const MAX_CONTACTS = 5_000;
export const MAX_GROUPS = 500;
export const MAX_FOLLOW_UPS = 10_000;
const MAX_PHONES = 50;
const MAX_EMAILS = 50;
const MAX_MEMBERS = 2_000;

export interface ArchiveContact {
  id: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  organization: string | null;
  jobTitle: string | null;
  notes: string | null;
  /** "YYYY-MM-DD" */
  birthday: string | null;
  area: string | null;
  metThrough: string | null;
  tags: string[];
  keepInTouchDays: number | null;
  lastContactedAt: string | null;
  archived: boolean;
  phones: { raw: string; label: string | null }[];
  emails: { address: string; label: string | null }[];
}

export interface ArchiveGroup {
  name: string;
  kind: GroupKind;
  description: string | null;
  members: { contactId: string; role: string | null }[];
}

export interface ArchiveFollowUp {
  contactId: string;
  /** "YYYY-MM-DD" */
  dueOn: string;
  note: string;
  done: boolean;
}

export interface Archive {
  format: typeof ARCHIVE_FORMAT;
  version: typeof ARCHIVE_VERSION;
  exportedAt: string;
  contacts: ArchiveContact[];
  groups: ArchiveGroup[];
  followUps: ArchiveFollowUp[];
}

export class ArchiveError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Trimmed text within the column's length, or null. */
function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** Text squeezed to single spaces (names, labels). */
function tidy(v: unknown, max: number): string | null {
  const t = text(v, max * 4);
  return t ? t.replace(/\s+/g, ' ').slice(0, max) : null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
function day(v: unknown, min = '1900-01-01'): string | null {
  if (typeof v !== 'string' || !DAY.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    return null;
  }
  return v >= min ? v : null;
}

function instant(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+$/;

function contact(v: unknown): ArchiveContact | null {
  if (!isObj(v) || typeof v.id !== 'string' || !UUID.test(v.id)) return null;
  const phones = (Array.isArray(v.phones) ? v.phones : [])
    .slice(0, MAX_PHONES)
    .flatMap((p) => {
      const raw = isObj(p) ? text(p.raw, 64) : null;
      return raw ? [{ raw, label: isObj(p) ? tidy(p.label, 40) : null }] : [];
    });
  const emails = (Array.isArray(v.emails) ? v.emails : [])
    .slice(0, MAX_EMAILS)
    .flatMap((e) => {
      const address = isObj(e) ? text(e.address, 254)?.toLowerCase() : null;
      return address && EMAIL.test(address)
        ? [{ address, label: isObj(e) ? tidy(e.label, 40) : null }]
        : [];
    });
  const displayName = tidy(v.displayName, 200);
  if (!displayName) return null;
  const cadence =
    typeof v.keepInTouchDays === 'number' &&
    (KEEP_IN_TOUCH_DAYS as readonly number[]).includes(v.keepInTouchDays)
      ? v.keepInTouchDays
      : null;
  return {
    id: v.id.toLowerCase(),
    displayName,
    givenName: tidy(v.givenName, 100),
    familyName: tidy(v.familyName, 100),
    nickname: tidy(v.nickname, 100),
    organization: tidy(v.organization, 200),
    jobTitle: tidy(v.jobTitle, 200),
    notes: text(v.notes, 10_000),
    birthday: day(v.birthday),
    area: tidy(v.area, 100),
    metThrough: tidy(v.metThrough, 200),
    tags: Array.isArray(v.tags)
      ? v.tags.filter((t): t is string => typeof t === 'string')
      : [],
    keepInTouchDays: cadence,
    lastContactedAt: instant(v.lastContactedAt),
    archived: v.archived === true,
    phones,
    emails,
  };
}

function group(v: unknown): ArchiveGroup | null {
  if (!isObj(v)) return null;
  const name = tidy(v.name, 80);
  if (!name) return null;
  const kind = (GROUP_KINDS as readonly string[]).includes(v.kind as string)
    ? (v.kind as GroupKind)
    : 'other';
  const members = (Array.isArray(v.members) ? v.members : [])
    .slice(0, MAX_MEMBERS)
    .flatMap((m) =>
      isObj(m) && typeof m.contactId === 'string' && UUID.test(m.contactId)
        ? [
            {
              contactId: m.contactId.toLowerCase(),
              role: tidy(m.role, 40)?.toLowerCase() ?? null,
            },
          ]
        : [],
    );
  return { name, kind, description: text(v.description, 500), members };
}

function followUp(v: unknown): ArchiveFollowUp | null {
  if (!isObj(v) || typeof v.contactId !== 'string' || !UUID.test(v.contactId))
    return null;
  const dueOn = day(v.dueOn, '2000-01-01');
  const note = tidy(v.note, 200);
  if (!dueOn || !note) return null;
  return {
    contactId: v.contactId.toLowerCase(),
    dueOn,
    note,
    done: v.done === true,
  };
}

/**
 * Reads an archive the owner is restoring. Throws ArchiveError when it is
 * not an archive at all (or too big); otherwise returns what can be used
 * and how many entries could not be read.
 */
export function readArchive(input: unknown): {
  archive: Archive;
  unreadable: number;
} {
  if (!isObj(input) || input.format !== ARCHIVE_FORMAT) {
    throw new ArchiveError('This is not a Contact Sphere backup.');
  }
  if (input.version !== ARCHIVE_VERSION) {
    throw new ArchiveError(
      'This backup was made by a newer version of Contact Sphere.',
    );
  }
  const list = (v: unknown, max: number): unknown[] => {
    if (!Array.isArray(v)) return [];
    if (v.length > max) {
      throw new ArchiveError('This backup is too large to restore at once.');
    }
    return v as unknown[];
  };
  const rawContacts = list(input.contacts, MAX_CONTACTS);
  const rawGroups = list(input.groups, MAX_GROUPS);
  const rawFollowUps = list(input.followUps, MAX_FOLLOW_UPS);
  const contacts = rawContacts.map(contact);
  const groups = rawGroups.map(group);
  const followUps = rawFollowUps.map(followUp);
  const ok = <T>(x: T | null): x is T => x !== null;
  const unreadable =
    contacts.filter((c) => !c).length +
    groups.filter((g) => !g).length +
    followUps.filter((f) => !f).length;
  return {
    archive: {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_VERSION,
      exportedAt: instant(input.exportedAt) ?? new Date(0).toISOString(),
      contacts: contacts.filter(ok),
      groups: groups.filter(ok),
      followUps: followUps.filter(ok),
    },
    unreadable,
  };
}
