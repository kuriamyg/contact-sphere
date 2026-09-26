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
/** A request as the web server makes it, signed in as `as`. */
const api = (method: Method, url: string, as = token) =>
  request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.9.${++ip % 250}`)
    .set('authorization', `Session ${as}`);

const create = (body: object, as = token) =>
  api('post', '/contacts', as).send(body).expect(201);

/** A second account with a live session, made directly in the database. */
async function secondUser(): Promise<string> {
  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO users (id, email, password_hash, updated_at)
     VALUES (gen_random_uuid(), 'other@example.com', '$argon2id$v=19$x', now())
     RETURNING id`,
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
    .set('x-client-ip', `198.18.10.${++ip % 250}`)
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

type Snap = {
  version: number;
  ownerId: string;
  contacts: {
    id: string;
    name: string;
    tags: string[];
    phones: [string, string | null, string | null][];
    emails: [string, string | null][];
    keepInTouchDays: number | null;
  }[];
  groups: { name: string; members: [string, string | null][] }[];
  followUps: { contactId: string; note: string }[];
};
const snap = async (as = token) =>
  (await api('get', '/sync/snapshot', as).expect(200)).body as Snap;
const mk = async (body: object) => (await create(body)).body.id as string;

describe('offline copy (Phase 10b)', () => {
  it('holds the contacts in the list — not archived, not trashed — with what the phone needs', async () => {
    const ann = await mk({
      displayName: 'Ann',
      tags: ['Plumber'],
      area: 'Kasarani',
      phones: [{ raw: '0712 345 678', label: 'mobile' }],
      emails: [{ address: 'ann@x.co' }],
    });
    const gone = await mk({ displayName: 'Trashed' });
    const hidden = await mk({ displayName: 'Archived' });
    await api('delete', `/contacts/${gone}`).expect(204);
    await api('post', `/contacts/${hidden}/archive`).expect(204);
    const s = await snap();
    expect(s.version).toBe(1);
    expect(s.contacts.map((c) => c.name)).toEqual(['Ann']);
    expect(s.contacts[0]).toMatchObject({
      id: ann,
      tags: ['plumber'],
      phones: [['0712 345 678', '+254712345678', 'mobile']],
      emails: [['ann@x.co', null]],
      keepInTouchDays: null,
    });
  });

  it('includes groups with live members and open follow-ups only', async () => {
    const ann = await mk({ displayName: 'Ann' });
    const bob = await mk({ displayName: 'Bob' });
    const g = (await api('post', '/groups').send({ name: 'Chama' }).expect(201))
      .body.id as string;
    await api('post', `/groups/${g}/members`)
      .send({ contactIds: [ann, bob], role: 'member' })
      .expect(200);
    await api('delete', `/contacts/${bob}`).expect(204);
    const day = new Date().toISOString().slice(0, 10);
    const f = (
      await api('post', `/remember/contacts/${ann}/follow-ups`)
        .send({ dueOn: day, note: 'Call back' })
        .expect(201)
    ).body.id as string;
    await api('post', `/remember/contacts/${ann}/follow-ups`)
      .send({ dueOn: day, note: 'Already done' })
      .expect(201)
      .then((r) => api('post', `/remember/follow-ups/${r.body.id}/done`));
    const s = await snap();
    expect(s.groups).toEqual([
      expect.objectContaining({ name: 'Chama', members: [[ann, 'member']] }),
    ]);
    expect(s.followUps.map((x) => x.note)).toEqual(['Call back']);
    expect(f).toBeTruthy();
  });

  it('is the owner’s alone, and needs a session', async () => {
    await mk({ displayName: 'Ann' });
    const other = await secondUser();
    const s = await snap(other);
    expect(s.contacts).toEqual([]);
    expect(s.ownerId).not.toBe((await snap()).ownerId);
    await request(server)
      .get('/sync/snapshot')
      .set('x-bff-secret', TEST_SECRET)
      .set('x-client-ip', '198.18.9.250')
      .expect(401);
  });
});

describe('changes made offline, sent later (Phase 10b+)', () => {
  const uuid = () => crypto.randomUUID();

  it('creating a contact with a device-made id twice makes one contact', async () => {
    const id = uuid();
    const body = {
      id,
      displayName: 'Offline Ann',
      phones: [{ raw: '0712 345 678' }],
    };
    const a = await api('post', '/contacts').send(body).expect(201);
    const b = await api('post', '/contacts').send(body).expect(201);
    expect(a.body.id).toBe(id);
    expect(b.body.id).toBe(id);
    expect(
      (await api('get', '/contacts?q=offline').expect(200)).body.total,
    ).toBe(1);
    const audit = await owner.query(
      `SELECT count(*)::int AS n FROM audit_logs WHERE action = 'contact.created' AND entity_id = $1`,
      [id],
    );
    expect(audit.rows[0].n).toBe(1);
  });

  it('never lets one owner reuse another owner’s id, and edits ignore ids', async () => {
    const id = uuid();
    await api('post', '/contacts')
      .send({ id, displayName: 'Mine' })
      .expect(201);
    const other = await secondUser();
    await api('post', '/contacts', other)
      .send({ id, displayName: 'Theirs' })
      .expect(409);
    await api('put', `/contacts/${id}`)
      .send({ id: uuid(), displayName: 'Mine' })
      .expect(400);
  });

  it('follow-ups with a device-made id are made once', async () => {
    const c = (await create({ displayName: 'Ann' })).body.id as string;
    const id = uuid();
    const body = { id, dueOn: '2026-10-01', note: 'Call back' };
    await api('post', `/remember/contacts/${c}/follow-ups`)
      .send(body)
      .expect(201);
    await api('post', `/remember/contacts/${c}/follow-ups`)
      .send(body)
      .expect(201);
    const r = (await api('get', `/remember/contacts/${c}`).expect(200))
      .body as {
      followUps: { id: string }[];
    };
    expect(r.followUps.map((f) => f.id)).toEqual([id]);
  });

  it('"in touch" recorded offline keeps when it happened; the latest wins', async () => {
    const c = (await create({ displayName: 'Ann' })).body.id as string;
    await owner.query(
      `UPDATE contacts SET created_at = now() - interval '20 days' WHERE id = $1`,
      [c],
    );
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const at = async (when?: string) =>
      api('post', `/remember/contacts/${c}/contacted`).send(
        when ? { at: when } : {},
      );
    await at(threeDaysAgo);
    await at(tenDaysAgo);
    const r = (await api('get', `/remember/contacts/${c}`).expect(200))
      .body as {
      lastContactedAt: string;
    };
    expect(r.lastContactedAt).toBe(threeDaysAgo);
    expect(
      (await at(new Date(Date.now() - 40 * 86_400_000).toISOString())).status,
    ).toBe(400);
    expect((await at('yesterday')).status).toBe(400);
  });
});
