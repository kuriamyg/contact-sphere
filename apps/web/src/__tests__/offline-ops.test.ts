import { describe, expect, it } from 'vitest';

import { applyOp, type Op, parseOps } from '@/lib/offline-ops';

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
