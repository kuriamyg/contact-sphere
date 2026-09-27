/**
 * Changes made in the offline app, and how each becomes an API call.
 * Pure apart from the `api` function passed in, so it is unit-tested.
 */
export type Op =
  | {
      opId: string;
      type: 'contact.create';
      contactId: string;
      name: string;
      phone?: string;
      note?: string;
    }
  | { opId: string; type: 'contacted'; contactId: string; at: string }
  | {
      opId: string;
      type: 'followup.add';
      followUpId: string;
      contactId: string;
      dueOn: string;
      note: string;
    }
  | { opId: string; type: 'followup.done'; followUpId: string }
  | {
      opId: string;
      type: 'contact.edit';
      contactId: string;
      /** Per field: what the phone showed before the edit, and the edit. */
      changes: EditChanges;
    };

/** The details that can be edited without data. */
export const EDIT_FIELDS = [
  'name',
  'nickname',
  'organization',
  'jobTitle',
  'area',
  'metThrough',
  'birthday',
  'notes',
  'tags',
  'phones',
  'emails',
] as const;
export type EditField = (typeof EDIT_FIELDS)[number];

export interface EditValues {
  name: string;
  nickname: string;
  organization: string;
  jobTitle: string;
  area: string;
  metThrough: string;
  /** YYYY-MM-DD or ''. */
  birthday: string;
  notes: string;
  tags: string[];
  phones: { raw: string; label: string }[];
  emails: { address: string; label: string }[];
}

export type EditChanges = {
  [F in EditField]?: { from: EditValues[F]; to: EditValues[F] };
};

/** A field that changed both here and elsewhere: the other change was kept. */
export interface FieldConflict<F extends EditField = EditField> {
  field: F;
  mine: EditValues[F];
  theirs: EditValues[F];
}

export interface EditConflict {
  contactId: string;
  name: string;
  fields: FieldConflict[];
}

export interface OpResult {
  opId: string;
  /** ok: done; rejected: will never work (dropped, shown to the owner);
   *  retry: try again later (network, server busy). */
  status: 'ok' | 'rejected' | 'retry';
  message?: string;
  /** contact.edit only: fields left as they were because they clashed. */
  conflict?: EditConflict;
}

export const MAX_OPS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null;

/** Validates what the phone sent; anything malformed rejects the batch. */
export function parseOps(body: unknown): Op[] {
  const list = (body as { ops?: unknown })?.ops;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_OPS) {
    throw new Error('ops');
  }
  return list.map((raw) => {
    const o = raw as Record<string, unknown>;
    const id = (k: string) => {
      const v = o[k];
      if (typeof v !== 'string' || !UUID.test(v)) throw new Error(k);
      return v;
    };
    const opId = id('opId');
    switch (o.type) {
      case 'contact.create': {
        const name = str(o.name, 200);
        if (!name) throw new Error('name');
        const phone = o.phone === undefined ? undefined : str(o.phone, 64);
        const note = o.note === undefined ? undefined : str(o.note, 10_000);
        return {
          opId,
          type: 'contact.create',
          contactId: id('contactId'),
          name,
          ...(phone ? { phone } : {}),
          ...(note ? { note } : {}),
        };
      }
      case 'contacted': {
        const at = typeof o.at === 'string' ? o.at : '';
        if (Number.isNaN(Date.parse(at))) throw new Error('at');
        return { opId, type: 'contacted', contactId: id('contactId'), at };
      }
      case 'followup.add': {
        const note = str(o.note, 200);
        const dueOn = typeof o.dueOn === 'string' ? o.dueOn : '';
        if (!note || !DAY.test(dueOn)) throw new Error('followup');
        return {
          opId,
          type: 'followup.add',
          followUpId: id('followUpId'),
          contactId: id('contactId'),
          dueOn,
          note,
        };
      }
      case 'followup.done':
        return { opId, type: 'followup.done', followUpId: id('followUpId') };
      case 'contact.edit':
        return {
          opId,
          type: 'contact.edit',
          contactId: id('contactId'),
          changes: parseChanges(o.changes),
        };
      default:
        throw new Error('type');
    }
  });
}

const TEXT_MAX: Record<string, number> = {
  name: 200,
  nickname: 200,
  organization: 200,
  jobTitle: 200,
  area: 100,
  metThrough: 200,
  notes: 10_000,
};

/** Text: trimmed, '' allowed (a cleared field) except for the name. */
function text(v: unknown, max: number): string {
  if (typeof v !== 'string' || v.length > max) throw new Error('text');
  return v.trim();
}

function rows<K extends 'raw' | 'address'>(
  v: unknown,
  key: K,
  max: number,
): ({ label: string } & Record<K, string>)[] {
  if (!Array.isArray(v) || v.length > 20) throw new Error(key);
  return v.map((r) => {
    const o = r as Record<string, unknown>;
    const value = text(o?.[key], max);
    if (!value) throw new Error(key);
    const label = o.label === undefined ? '' : text(o.label, 50);
    return { [key]: value, label } as { label: string } & Record<K, string>;
  });
}

function editValue<F extends EditField>(f: F, v: unknown): EditValues[F] {
  let out: unknown;
  if (f === 'tags') {
    if (!Array.isArray(v) || v.length > 50) throw new Error('tags');
    out = v.map((t) => {
      const s = text(t, 50);
      if (!s) throw new Error('tags');
      return s;
    });
  } else if (f === 'phones') out = rows(v, 'raw', 64);
  else if (f === 'emails') out = rows(v, 'address', 254);
  else if (f === 'birthday') {
    const d = text(v, 10);
    if (d && !DAY.test(d)) throw new Error('birthday');
    out = d;
  } else out = text(v, TEXT_MAX[f]);
  return out as EditValues[F];
}

function parseChanges(v: unknown): EditChanges {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new Error('changes');
  }
  const out: EditChanges = {};
  const keys = Object.keys(v);
  if (keys.length === 0) throw new Error('changes');
  for (const k of keys) {
    if (!(EDIT_FIELDS as readonly string[]).includes(k)) throw new Error(k);
    const f = k as EditField;
    const c = (v as Record<string, { from?: unknown; to?: unknown }>)[k];
    const to = editValue(f, c?.to);
    if (f === 'name' && !to) throw new Error('name');
    (out as Record<string, unknown>)[f] = { from: editValue(f, c?.from), to };
  }
  return out;
}

/** The contact as GET /contacts/:id returns it (the parts used here). */
export interface ContactNow {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  nickname: string | null;
  organization: string | null;
  jobTitle: string | null;
  birthday: string | null;
  notes: string | null;
  area: string | null;
  metThrough: string | null;
  tags: string[];
  phones: { raw: string; label: string | null }[];
  emails: { address: string; label: string | null }[];
  updatedAt: string;
}

/** The editable values of a contact as the server has it now. */
export function valuesOf(c: ContactNow): EditValues {
  return {
    name: c.displayName,
    nickname: c.nickname ?? '',
    organization: c.organization ?? '',
    jobTitle: c.jobTitle ?? '',
    area: c.area ?? '',
    metThrough: c.metThrough ?? '',
    birthday: c.birthday ?? '',
    notes: c.notes ?? '',
    tags: c.tags,
    phones: c.phones.map((p) => ({ raw: p.raw, label: p.label ?? '' })),
    emails: c.emails.map((e) => ({ address: e.address, label: e.label ?? '' })),
  };
}

/**
 * Same value, as the API would store it: text trimmed, tags and emails in
 * lower case, blank labels and blank rows ignored.
 */
export function sameValue<F extends EditField>(
  f: F,
  a: EditValues[F],
  b: EditValues[F],
): boolean {
  const norm = (v: EditValues[F]): string => {
    if (f === 'tags') {
      return JSON.stringify(
        (v as string[]).map((t) => t.trim().replace(/\s+/g, ' ').toLowerCase()),
      );
    }
    if (f === 'phones' || f === 'emails') {
      return JSON.stringify(
        (v as { raw?: string; address?: string; label: string }[])
          .map((r) => [
            f === 'emails'
              ? (r.address ?? '').trim().toLowerCase()
              : (r.raw ?? '').trim(),
            r.label.trim(),
          ])
          .filter(([x]) => x),
      );
    }
    return (v as string).trim();
  };
  return norm(a) === norm(b);
}

/**
 * Three-way merge, field by field. A field nobody else touched takes the
 * edit; one already equal to the edit needs nothing; one changed elsewhere
 * in a different way is a conflict — the newer server value stays, and the
 * owner is shown both. Edits to other fields still apply.
 */
export function mergeEdit(
  now: EditValues,
  changes: EditChanges,
): { apply: Partial<EditValues>; conflicts: FieldConflict[] } {
  const apply: Partial<EditValues> = {};
  const conflicts: FieldConflict[] = [];
  for (const f of EDIT_FIELDS) {
    const c = changes[f] as { from: never; to: never } | undefined;
    if (!c) continue;
    const theirs = now[f] as never;
    if (sameValue(f, theirs, c.to)) continue;
    if (sameValue(f, theirs, c.from)) {
      (apply as Record<string, unknown>)[f] = c.to;
    } else {
      conflicts.push({ field: f, mine: c.to, theirs } as FieldConflict);
    }
  }
  return { apply, conflicts };
}

/** The full PUT body: the contact as it is now, with `apply` laid over. */
export function editBody(
  c: ContactNow,
  apply: Partial<EditValues>,
): Record<string, unknown> {
  const derived = [c.givenName, c.familyName].filter(Boolean).join(' ');
  const v = { ...valuesOf(c), ...apply };
  const opt = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);
  const body: Record<string, unknown> = {
    givenName: opt(c.givenName),
    familyName: opt(c.familyName),
    // A name the API derived stays derived unless the owner renamed it.
    displayName:
      apply.name !== undefined || c.displayName !== derived
        ? opt(v.name)
        : null,
    nickname: opt(v.nickname),
    organization: opt(v.organization),
    jobTitle: opt(v.jobTitle),
    birthday: opt(v.birthday),
    notes: opt(v.notes),
    area: opt(v.area),
    metThrough: opt(v.metThrough),
    tags: v.tags,
    phones: v.phones.map((p) => ({
      raw: p.raw,
      ...(p.label.trim() ? { label: p.label.trim() } : {}),
    })),
    emails: v.emails.map((e) => ({
      address: e.address,
      ...(e.label.trim() ? { label: e.label.trim() } : {}),
    })),
  };
  for (const k of Object.keys(body)) if (body[k] === null) delete body[k];
  return body;
}

type ApiFn = (
  path: string,
  init?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
  },
) => Promise<{ status: number; message?: string; data?: unknown }>;

/** Tries this many times when the contact keeps changing mid-save. */
const EDIT_TRIES = 3;

async function applyEdit(
  op: Extract<Op, { type: 'contact.edit' }>,
  api: ApiFn,
): Promise<{ status: number; message?: string; conflict?: EditConflict }> {
  for (let i = 0; i < EDIT_TRIES; i++) {
    const got = await api(`/contacts/${op.contactId}`);
    if (got.status !== 200) return got;
    const now = got.data as ContactNow & { deletedAt?: string | null };
    if (now.deletedAt) return { status: 409 };
    const { apply, conflicts } = mergeEdit(valuesOf(now), op.changes);
    const conflict = conflicts.length
      ? {
          contactId: op.contactId,
          name: apply.name ?? now.displayName,
          fields: conflicts,
        }
      : undefined;
    if (Object.keys(apply).length === 0) return { status: 200, conflict };
    const put = await api(`/contacts/${op.contactId}`, {
      method: 'PUT',
      body: editBody(now, apply),
      headers: { 'if-match': `"${now.updatedAt}"` },
    });
    if (put.status !== 412) return { ...put, conflict };
  }
  return { status: 503 };
}

/** Sends one change. 401 → the owner is signed out: stop everything. */
export async function applyOp(
  op: Op,
  api: ApiFn,
): Promise<OpResult | { opId: string; status: 'signed-out' }> {
  let res: { status: number; message?: string; conflict?: EditConflict };
  switch (op.type) {
    case 'contact.create':
      res = await api('/contacts', {
        method: 'POST',
        body: {
          id: op.contactId,
          displayName: op.name,
          ...(op.phone ? { phones: [{ raw: op.phone }] } : {}),
          ...(op.note ? { notes: op.note } : {}),
        },
      });
      break;
    case 'contacted':
      res = await api(`/remember/contacts/${op.contactId}/contacted`, {
        method: 'POST',
        body: { at: op.at },
      });
      break;
    case 'followup.add':
      res = await api(`/remember/contacts/${op.contactId}/follow-ups`, {
        method: 'POST',
        body: { id: op.followUpId, dueOn: op.dueOn, note: op.note },
      });
      break;
    case 'followup.done':
      res = await api(`/remember/follow-ups/${op.followUpId}/done`, {
        method: 'POST',
      });
      break;
    case 'contact.edit':
      res = await applyEdit(op, api);
      break;
  }
  if (res.status === 401) return { opId: op.opId, status: 'signed-out' };
  if (res.status >= 200 && res.status < 300) {
    const conflict = (res as { conflict?: EditConflict }).conflict;
    return { opId: op.opId, status: 'ok', ...(conflict ? { conflict } : {}) };
  }
  if (res.status === 0 || res.status === 429 || res.status >= 500) {
    return { opId: op.opId, status: 'retry' };
  }
  return {
    opId: op.opId,
    status: 'rejected',
    message:
      res.status === 404
        ? 'That contact no longer exists (deleted or in the trash).'
        : res.status === 409
          ? 'That contact is in the trash, or the change clashes with another.'
          : (res.message ?? 'The change was not accepted.'),
  };
}
