import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { hashToken, newSessionToken } from '../../src/auth/tokens';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
  TEST_SETUP_TOKEN,
} from '../support/test-app';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let token: string;
let ip = 0;

type Method = 'get' | 'post' | 'put' | 'delete';
const api = (method: Method, url: string, as = token) =>
  request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.12.${++ip % 250}`)
    .set('authorization', `Session ${as}`);

type Body = Record<string, unknown>;
const body = (r: { body: unknown }) => r.body as Body;

/** A second account, on Plus unless `free`. */
async function member(email: string, free = false): Promise<string> {
  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO users (id, email, password_hash, updated_at, plus_until)
     VALUES (gen_random_uuid(), $1, '$argon2id$v=19$x', now(), $2)
     RETURNING id`,
    [email, free ? null : new Date(Date.now() + 30 * 86_400_000)],
  );
  const t = newSessionToken();
  await owner.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (gen_random_uuid(), $1, $2, now() + interval '1 day')`,
    [rows[0].id, hashToken(t)],
  );
  return t;
}

/** Wanjiru (numbers, email, tags, cadence), Otieno (archived), a trashed one,
 * a group with both, and two follow-ups. */
async function fillOwner(): Promise<void> {
  const w = body(
    await api('post', '/contacts')
      .send({
        givenName: 'Wanjiru',
        familyName: 'Kamau',
        phones: [{ raw: '0712 345 678', label: 'mobile' }],
        emails: [{ address: 'wanjiru@example.com' }],
        tags: ['Plumber'],
        area: 'Kasarani',
        birthday: '1990-02-14',
        notes: 'Met at the harambee',
      })
      .expect(201),
  );
  const o = body(
    await api('post', '/contacts')
      .send({ givenName: 'Otieno', phones: [{ raw: '0722 000 111' }] })
      .expect(201),
  );
  await api('post', `/contacts/${o.id as string}/archive`).expect(204);
  const gone = body(
    await api('post', '/contacts').send({ givenName: 'Trashed' }).expect(201),
  );
  await api('delete', `/contacts/${gone.id as string}`).expect(204);
  await api('put', `/remember/contacts/${w.id as string}/keep-in-touch`)
    .send({ days: 30 })
    .expect((r) => expect([200, 204]).toContain(r.status));
  const g = body(
    await api('post', '/groups')
      .send({ name: 'Kasarani Chama', kind: 'chama' })
      .expect(201),
  );
  await api('post', `/groups/${g.id as string}/members`)
    .send({ contactIds: [w.id, o.id] })
    .expect(200);
  await api('post', `/remember/contacts/${w.id as string}/follow-ups`)
    .send({ dueOn: '2030-01-10', note: 'Ask about the harambee' })
    .expect(201);
}

beforeAll(async () => {
  ({ app } = await createTestApp());
  server = app.getHttpServer();
  owner = ownerClient();
  await owner.connect();
});
beforeEach(async () => {
  await resetDatabase(owner);
  const res = await request(server)
    .post('/auth/setup')
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.13.${++ip % 250}`)
    .send({
      setupToken: TEST_SETUP_TOKEN,
      email: 'owner@example.com',
      password: 'orange piano window cloud',
    })
    .expect(201);
  token = res.body.token as string;
});
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('backup export (ADR 0009, C2)', () => {
  it('holds everything not in the trash, and records when', async () => {
    await fillOwner();
    const a = body(await api('get', '/backup').expect(200));
    expect(a).toMatchObject({
      format: 'contact-sphere-archive',
      version: 1,
    });
    const contacts = a.contacts as Body[];
    expect(contacts.map((c) => c.displayName).sort()).toEqual([
      'Otieno',
      'Wanjiru Kamau',
    ]);
    expect(contacts.find((c) => c.displayName === 'Otieno')).toMatchObject({
      archived: true,
    });
    expect(
      contacts.find((c) => c.displayName === 'Wanjiru Kamau'),
    ).toMatchObject({
      tags: ['plumber'],
      area: 'Kasarani',
      birthday: '1990-02-14',
      keepInTouchDays: 30,
      phones: [{ raw: '0712 345 678', label: 'mobile' }],
      emails: [{ address: 'wanjiru@example.com', label: null }],
    });
    expect(a.groups).toEqual([
      expect.objectContaining({
        name: 'Kasarani Chama',
        kind: 'chama',
        members: expect.arrayContaining([
          expect.objectContaining({ contactId: expect.any(String) }),
        ]) as unknown,
      }),
    ]);
    expect((a.followUps as Body[])[0]).toMatchObject({
      dueOn: '2030-01-10',
      note: 'Ask about the harambee',
      done: false,
    });

    const me = body(await api('get', '/auth/me').expect(200));
    expect(typeof me.lastBackupAt).toBe('string');
    // The audit log has counts, never names.
    const { rows } = await owner.query<{ m: string }>(
      "SELECT metadata::text AS m FROM audit_logs WHERE action = 'backup.exported'",
    );
    expect(rows[0].m).toContain('"contacts": 2');
    expect(rows[0].m).not.toMatch(/Wanjiru|Kasarani/);
  });

  it('is only ever the signed-in owner’s own data', async () => {
    await fillOwner();
    const other = await member('other@example.com');
    const a = body(await api('get', '/backup', other).expect(200));
    expect(a.contacts).toEqual([]);
    expect(a.groups).toEqual([]);
  });
});

describe('restore', () => {
  it('into the same account adds nothing, and says so', async () => {
    await fillOwner();
    const archive = body(await api('get', '/backup').expect(200));
    const plan = body(
      await api('post', '/backup/restore').send({ archive }).expect(200),
    );
    expect(plan).toMatchObject({
      contacts: { inBackup: 2, toAdd: 0, alreadySaved: 2 },
      groups: { toAdd: 0, toUpdate: 0 },
      followUps: 0,
    });
  });

  it('into a new account brings back contacts, groups, members and follow-ups — once', async () => {
    await fillOwner();
    const archive = body(await api('get', '/backup').expect(200));
    const other = await member('new@example.com');

    const preview = body(
      await api('post', '/backup/restore/preview', other)
        .send({ archive })
        .expect(200),
    );
    expect(preview).toMatchObject({
      contacts: { toAdd: 2, alreadySaved: 0 },
      groups: { toAdd: 1 },
      memberships: 2,
      followUps: 1,
    });
    // A preview writes nothing.
    expect(body(await api('get', '/contacts', other)).total).toBe(0);

    await api('post', '/backup/restore', other).send({ archive }).expect(200);
    const again = body(await api('get', '/backup', other).expect(200));
    const names = (again.contacts as Body[]).map((c) => c.displayName).sort();
    expect(names).toEqual(['Otieno', 'Wanjiru Kamau']);
    const w = (again.contacts as Body[]).find(
      (c) => c.displayName === 'Wanjiru Kamau',
    )!;
    expect(w).toMatchObject({ tags: ['plumber'], keepInTouchDays: 30 });
    // New ids: the other account's contacts are never reused or touched.
    const originals = (archive.contacts as Body[]).map((c) => c.id);
    expect(originals).not.toContain(w.id);
    expect((again.groups as Body[])[0].members).toHaveLength(2);
    expect(again.followUps).toHaveLength(1);
    // Search works on restored contacts.
    const found = body(await api('get', '/contacts?q=plumber', other));
    expect(found.total).toBe(1);

    // Restoring twice adds nothing more.
    const twice = body(
      await api('post', '/backup/restore', other).send({ archive }).expect(200),
    );
    expect(twice).toMatchObject({
      contacts: { toAdd: 0, alreadySaved: 2 },
      groups: { toAdd: 0, toUpdate: 0 },
      followUps: 0,
    });
  });

  it('keeps to the free plan’s 3 groups', async () => {
    const archive = {
      format: 'contact-sphere-archive',
      version: 1,
      exportedAt: new Date().toISOString(),
      contacts: [],
      groups: ['One', 'Two', 'Three', 'Four'].map((name) => ({
        name,
        kind: 'other',
        members: [],
      })),
      followUps: [],
    };
    const free = await member('free@example.com', true);
    const plan = body(
      await api('post', '/backup/restore', free).send({ archive }).expect(200),
    );
    expect(plan).toMatchObject({ groups: { toAdd: 3, overLimit: 1 } });
  });

  it('refuses what is not a backup, and counts entries it cannot read', async () => {
    await api('post', '/backup/restore')
      .send({ archive: { hello: 'world' } })
      .expect(400);
    await api('post', '/backup/restore').send({}).expect(400);
    const plan = body(
      await api('post', '/backup/restore/preview')
        .send({
          archive: {
            format: 'contact-sphere-archive',
            version: 1,
            contacts: [
              { id: 'not-a-uuid', displayName: 'X' },
              {
                id: '0191f000-0000-7000-8000-000000000001',
                displayName: '  Achieng  ',
                phones: [{ raw: '0733 000 222' }],
              },
            ],
            groups: [{ kind: 'chama' }],
            followUps: [],
          },
        })
        .expect(200),
    );
    expect(plan).toMatchObject({ contacts: { toAdd: 1 }, unreadable: 2 });
    const newer = await api('post', '/backup/restore')
      .send({ archive: { format: 'contact-sphere-archive', version: 2 } })
      .expect(400);
    expect(body(newer).message).toMatch(/newer version/);
  });
});
