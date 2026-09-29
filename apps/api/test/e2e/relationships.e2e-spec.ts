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
    .set('x-client-ip', `198.18.15.${++ip % 250}`)
    .set('authorization', `Session ${as}`);

type Body = Record<string, unknown>;
const mk = async (body: object, as = token): Promise<string> =>
  (await api('post', '/contacts', as).send(body).expect(201)).body.id as string;
const links = async (id: string, as = token) =>
  (await api('get', `/relationships/for-contact/${id}`, as).expect(200))
    .body as Body[];

async function member(email: string): Promise<string> {
  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO users (id, email, password_hash, updated_at, plus_until)
     VALUES (gen_random_uuid(), $1, '$argon2id$v=19$x', now(), now() + interval '30 days')
     RETURNING id`,
    [email],
  );
  const t = newSessionToken();
  await owner.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (gen_random_uuid(), $1, $2, now() + interval '1 day')`,
    [rows[0].id, hashToken(t)],
  );
  return t;
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
    .set('x-client-ip', `198.18.16.${++ip % 250}`)
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

describe('relationships (P6, ADR 0023)', () => {
  it('links two contacts and reads right from each side', async () => {
    const mama = await mk({ givenName: 'Mama', familyName: 'Njeri' });
    const son = await mk({ givenName: 'Kamau' });
    // On Kamau's page: "Mama Njeri is Kamau's parent".
    const added = await api('post', `/relationships/for-contact/${son}`)
      .send({ otherId: mama, role: 'parent', label: '  Mother ' })
      .expect(201);
    expect(added.body).toMatchObject({
      role: 'parent',
      label: 'mother',
      other: { id: mama, displayName: 'Mama Njeri' },
    });
    expect(await links(son)).toEqual([
      expect.objectContaining({
        role: 'parent',
        other: expect.objectContaining({ id: mama }),
      }),
    ]);
    expect(await links(mama)).toEqual([
      expect.objectContaining({
        role: 'child',
        other: expect.objectContaining({ id: son }),
      }),
    ]);

    // Two-way kinds are stored once, whichever side adds them.
    const bro = await mk({ givenName: 'Otieno' });
    await api('post', `/relationships/for-contact/${bro}`)
      .send({ otherId: son, role: 'sibling' })
      .expect(201);
    await api('post', `/relationships/for-contact/${son}`)
      .send({ otherId: bro, role: 'sibling' })
      .expect(409);
    expect((await links(bro))[0]).toMatchObject({ role: 'sibling' });
  });

  it('refuses a link to itself, to nobody, or to another account’s contact', async () => {
    const a = await mk({ givenName: 'Achieng' });
    await api('post', `/relationships/for-contact/${a}`)
      .send({ otherId: a, role: 'friend' })
      .expect(400);
    await api('post', `/relationships/for-contact/${a}`)
      .send({ otherId: a, role: 'boss' })
      .expect(400);
    const other = await member('other@example.com');
    const theirs = await mk({ givenName: 'Theirs' }, other);
    await api('post', `/relationships/for-contact/${a}`)
      .send({ otherId: theirs, role: 'friend' })
      .expect(404);
    await api('get', `/relationships/for-contact/${a}`, other).expect(404);
  });

  it('hides links to trashed contacts, brings them back on restore, and removes them', async () => {
    const a = await mk({ givenName: 'Achieng' });
    const b = await mk({ givenName: 'Baraka' });
    const link = (
      await api('post', `/relationships/for-contact/${a}`)
        .send({ otherId: b, role: 'colleague' })
        .expect(201)
    ).body as Body;
    await api('delete', `/contacts/${b}`).expect(204);
    expect(await links(a)).toEqual([]);
    await api('post', `/contacts/${b}/restore`).expect(204);
    expect(await links(a)).toHaveLength(1);
    await api('delete', `/relationships/${link.id as string}`).expect(204);
    expect(await links(a)).toEqual([]);
    await api('delete', `/relationships/${link.id as string}`).expect(404);
    // Audited by id and kind only.
    const { rows } = await owner.query<{ m: string }>(
      "SELECT action || metadata::text AS m FROM audit_logs WHERE action LIKE 'relationship.%'",
    );
    expect(rows.map((r) => r.m).join(' ')).not.toMatch(/Achieng|Baraka/);
  });

  it('suggests "introduced" from met-through and relatives by uncommon surname — only suggests', async () => {
    const w = await mk({ givenName: 'Wanjiru', familyName: 'Kamau' });
    const n = await mk({ givenName: 'Njeri', metThrough: 'wanjiru  KAMAU' });
    const o1 = await mk({ givenName: 'Otieno', familyName: 'Odhiambo-Were' });
    const o2 = await mk({ givenName: 'Akinyi', familyName: 'Odhiambo-Were' });
    // A surname seven people share is too common to mean family.
    for (let i = 0; i < 7; i++) {
      await mk({ givenName: `M${i}`, familyName: 'Mwangi' });
    }
    const s = (await api('get', '/relationships/suggestions').expect(200))
      .body as Body[];
    expect(s).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'introduced',
          reason: 'met_through',
          from: expect.objectContaining({ id: w }),
          to: expect.objectContaining({ id: n }),
        }),
        expect.objectContaining({ kind: 'relative', reason: 'same_surname' }),
      ]),
    );
    expect(s).toHaveLength(2);
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM relationships',
    );
    expect(rows[0].n).toBe(0);

    // Dismissed, or linked: not suggested again.
    await api('post', '/relationships/suggestions/dismiss')
      .send({ kind: 'relative', aId: o2, bId: o1 })
      .expect(204);
    await api('post', `/relationships/for-contact/${n}`)
      .send({ otherId: w, role: 'introducedBy' })
      .expect(201);
    expect(
      (await api('get', '/relationships/suggestions').expect(200)).body,
    ).toEqual([]);
  });

  it('go into a backup and come back on restore into another account', async () => {
    const a = await mk({
      givenName: 'Achieng',
      phones: [{ raw: '0712 000 001' }],
    });
    const b = await mk({
      givenName: 'Baraka',
      phones: [{ raw: '0712 000 002' }],
    });
    await api('post', `/relationships/for-contact/${a}`)
      .send({ otherId: b, role: 'mentor' })
      .expect(201);
    const archive = (await api('get', '/backup').expect(200)).body as Body;
    expect(archive.relationships).toEqual([
      { fromId: b, toId: a, kind: 'mentor', label: null },
    ]);
    const other = await member('new@example.com');
    const plan = (
      await api('post', '/backup/restore', other).send({ archive }).expect(200)
    ).body as Body;
    expect(plan).toMatchObject({ relationships: 1 });
    const again = (await api('get', '/backup', other).expect(200)).body as Body;
    const names = new Map(
      (again.contacts as Body[]).map((c) => [c.id, c.displayName]),
    );
    const rel = (again.relationships as Body[])[0];
    expect([names.get(rel.fromId), rel.kind, names.get(rel.toId)]).toEqual([
      'Baraka',
      'mentor',
      'Achieng',
    ]);
    // Twice adds nothing.
    const twice = (
      await api('post', '/backup/restore', other).send({ archive }).expect(200)
    ).body as Body;
    expect(twice).toMatchObject({ relationships: 0 });
  });
});
