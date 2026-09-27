import { describe, expect, it } from 'vitest';

import {
  applyOp,
  type ContactNow,
  editBody,
  mergeEdit,
  type Op,
  parseOps,
  valuesOf,
} from '@/lib/offline-ops';

const u = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('offline changes', () => {
  it('accepts the four kinds of change and tidies text', () => {
    const ops = parseOps({
      ops: [
        {
          opId: u(1),
          type: 'contact.create',
          contactId: u(2),
          name: '  Ann ',
          phone: '0712 345 678',
        },
        {
          opId: u(3),
          type: 'contacted',
          contactId: u(2),
          at: '2026-09-26T10:00:00.000Z',
        },
        {
          opId: u(4),
          type: 'followup.add',
          followUpId: u(5),
          contactId: u(2),
          dueOn: '2026-10-01',
          note: 'Call',
        },
        { opId: u(6), type: 'followup.done', followUpId: u(5) },
      ],
    });
    expect(ops.map((o) => o.type)).toEqual([
      'contact.create',
      'contacted',
      'followup.add',
      'followup.done',
    ]);
    expect(ops[0]).toMatchObject({ name: 'Ann' });
  });

  it('refuses anything malformed or unknown', () => {
    expect(() => parseOps({ ops: [] })).toThrow();
    expect(() =>
      parseOps({ ops: [{ opId: 'x', type: 'contacted' }] }),
    ).toThrow();
    expect(() =>
      parseOps({
        ops: [{ opId: u(1), type: 'contact.delete', contactId: u(2) }],
      }),
    ).toThrow();
    expect(() =>
      parseOps({
        ops: [
          { opId: u(1), type: 'contact.create', contactId: u(2), name: '   ' },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseOps({
        ops: Array.from({ length: 101 }, (_, i) => ({
          opId: u(i),
          type: 'followup.done',
          followUpId: u(i),
        })),
      }),
    ).toThrow();
  });

  it('maps API answers to ok / retry / rejected / signed out', async () => {
    const op: Op = { opId: u(1), type: 'followup.done', followUpId: u(2) };
    const at = (status: number) => applyOp(op, async () => ({ status }));
    expect((await at(204)).status).toBe('ok');
    expect((await at(0)).status).toBe('retry');
    expect((await at(503)).status).toBe('retry');
    expect((await at(429)).status).toBe('retry');
    expect((await at(404)).status).toBe('rejected');
    expect((await at(401)).status).toBe('signed-out');
  });

  it('creates contacts with the id made on the phone', async () => {
    const calls: unknown[] = [];
    await applyOp(
      {
        opId: u(1),
        type: 'contact.create',
        contactId: u(2),
        name: 'Ann',
        phone: '0712',
      },
      async (path, init) => {
        calls.push({ path, body: init?.body });
        return { status: 201 };
      },
    );
    expect(calls).toEqual([
      {
        path: '/contacts',
        body: { id: u(2), displayName: 'Ann', phones: [{ raw: '0712' }] },
      },
    ]);
  });
});

const contact = (over: Partial<ContactNow> = {}): ContactNow => ({
  displayName: 'Ann Njeri',
  givenName: 'Ann',
  familyName: 'Njeri',
  nickname: null,
  organization: 'Acme',
  jobTitle: null,
  birthday: null,
  notes: 'Old note',
  area: 'Thika',
  metThrough: null,
  tags: ['plumber'],
  phones: [{ raw: '0712 345 678', label: null }],
  emails: [],
  updatedAt: '2026-09-27T10:00:00.000Z',
  ...over,
});

describe('editing offline (A4)', () => {
  it('accepts an edit and refuses bad fields, blank names and empty edits', () => {
    const [op] = parseOps({
      ops: [
        {
          opId: u(1),
          type: 'contact.edit',
          contactId: u(2),
          changes: {
            notes: { from: 'Old note', to: ' New note ' },
            phones: {
              from: [{ raw: '0712 345 678', label: '' }],
              to: [{ raw: '0799', label: 'work' }],
            },
          },
        },
      ],
    });
    expect(op).toMatchObject({
      changes: { notes: { to: 'New note' } },
    });
    const bad = (changes: unknown) => () =>
      parseOps({
        ops: [{ opId: u(1), type: 'contact.edit', contactId: u(2), changes }],
      });
    expect(bad({})).toThrow();
    expect(bad({ displayName: { from: 'a', to: 'b' } })).toThrow();
    expect(bad({ name: { from: 'Ann', to: '  ' } })).toThrow();
    expect(bad({ birthday: { from: '', to: 'soon' } })).toThrow();
    expect(bad({ tags: { from: [], to: 'plumber' } })).toThrow();
    expect(bad({ phones: { from: [], to: [{ raw: '' }] } })).toThrow();
    expect(bad({ notes: { from: '', to: 'x'.repeat(10_001) } })).toThrow();
  });

  it('merges field by field: untouched fields take the edit, clashes keep theirs', () => {
    const now = valuesOf(
      contact({ notes: 'Changed on laptop', organization: 'Acme' }),
    );
    const { apply, conflicts } = mergeEdit(now, {
      notes: { from: 'Old note', to: 'Changed on phone' },
      organization: { from: 'Acme', to: 'Beta Ltd' },
      area: { from: 'Nairobi', to: 'Thika' }, // already what they have
    });
    expect(apply).toEqual({ organization: 'Beta Ltd' });
    expect(conflicts).toEqual([
      { field: 'notes', mine: 'Changed on phone', theirs: 'Changed on laptop' },
    ]);
  });

  it('compares as the API stores: trimmed, lower-case tags and emails, blank labels', () => {
    const now = valuesOf(
      contact({
        tags: ['boda boda'],
        emails: [{ address: 'ann@x.co', label: null }],
      }),
    );
    const { apply, conflicts } = mergeEdit(now, {
      tags: { from: ['Boda  Boda'], to: ['mechanic'] },
      emails: {
        from: [{ address: 'ANN@x.co ', label: '' }],
        to: [{ address: 'ann@y.co', label: '' }],
      },
    });
    expect(conflicts).toEqual([]);
    expect(Object.keys(apply)).toEqual(['tags', 'emails']);
  });

  it('keeps a derived name derived and every other field as it is', () => {
    const c = contact();
    expect(editBody(c, { notes: 'New' })).toEqual({
      givenName: 'Ann',
      familyName: 'Njeri',
      organization: 'Acme',
      notes: 'New',
      area: 'Thika',
      tags: ['plumber'],
      phones: [{ raw: '0712 345 678' }],
      emails: [],
    });
    expect(editBody(c, { name: 'Mama Njeri' })).toMatchObject({
      displayName: 'Mama Njeri',
      givenName: 'Ann',
    });
    expect(editBody(c, { notes: '' })).not.toHaveProperty('notes');
  });

  it('saves with If-Match, reports clashes, and re-merges when the contact moved on', async () => {
    const calls: { method: string; headers?: Record<string, string> }[] = [];
    let version = 0;
    const op: Op = {
      opId: u(1),
      type: 'contact.edit',
      contactId: u(2),
      changes: {
        organization: { from: 'Acme', to: 'Beta' },
        notes: { from: 'Old note', to: 'Mine' },
      },
    };
    const r = await applyOp(op, async (_path, init) => {
      calls.push({ method: init?.method ?? 'GET', headers: init?.headers });
      if (!init?.method) {
        return {
          status: 200,
          data: contact({
            notes: 'Theirs',
            updatedAt: `2026-09-27T10:00:0${version}.000Z`,
          }),
        };
      }
      // The first save loses a race with another edit.
      return { status: version++ === 0 ? 412 : 200 };
    });
    expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT', 'GET', 'PUT']);
    expect(calls[3].headers).toEqual({
      'if-match': '"2026-09-27T10:00:01.000Z"',
    });
    expect(r).toEqual({
      opId: u(1),
      status: 'ok',
      conflict: {
        contactId: u(2),
        name: 'Ann Njeri',
        fields: [{ field: 'notes', mine: 'Mine', theirs: 'Theirs' }],
      },
    });
  });

  it('does not save when nothing is left to apply; a trashed contact is refused', async () => {
    const op: Op = {
      opId: u(1),
      type: 'contact.edit',
      contactId: u(2),
      changes: { area: { from: 'Nairobi', to: 'Thika' } },
    };
    let puts = 0;
    const ok = await applyOp(op, async (_p, init) => {
      if (init?.method) puts++;
      return { status: 200, data: contact() };
    });
    expect(ok).toEqual({ opId: u(1), status: 'ok' });
    expect(puts).toBe(0);
    const trashed = await applyOp(op, async () => ({
      status: 200,
      data: { ...contact(), deletedAt: '2026-09-27T09:00:00.000Z' },
    }));
    expect(trashed.status).toBe('rejected');
    const gone = await applyOp(op, async () => ({ status: 404 }));
    expect(gone.status).toBe('rejected');
  });
});
