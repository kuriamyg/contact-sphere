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
  | { opId: string; type: 'followup.done'; followUpId: string };

export interface OpResult {
  opId: string;
  /** ok: done; rejected: will never work (dropped, shown to the owner);
   *  retry: try again later (network, server busy). */
  status: 'ok' | 'rejected' | 'retry';
  message?: string;
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
      default:
        throw new Error('type');
    }
  });
}

type ApiFn = (
  path: string,
  init?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown },
) => Promise<{ status: number; message?: string }>;

/** Sends one change. 401 → the owner is signed out: stop everything. */
export async function applyOp(
  op: Op,
  api: ApiFn,
): Promise<OpResult | { opId: string; status: 'signed-out' }> {
  let res: { status: number; message?: string };
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
  }
  if (res.status === 401) return { opId: op.opId, status: 'signed-out' };
  if (res.status >= 200 && res.status < 300) {
    return { opId: op.opId, status: 'ok' };
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
