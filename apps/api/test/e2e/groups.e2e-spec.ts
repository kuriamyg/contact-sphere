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
    .set('x-client-ip', `198.18.5.${++ip % 250}`)
    .set('authorization', `Session ${as}`);

const create = (body: object, as = token) =>
  api('post', '/contacts', as).send(body).expect(201);

const list = (query = '', as = token) =>
  api('get', `/contacts${query}`, as).expect(200);

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
    .set('x-client-ip', `198.18.6.${++ip % 250}`)
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

type Member = {
  contactId: string;
  displayName: string;
  role: string | null;
  phone: { raw: string; e164: string | null } | null;
};
const mk = async (displayName: string, phone?: string) =>
  (
    await create({
      displayName,
      ...(phone ? { phones: [{ raw: phone }] } : {}),
    })
  ).body.id as string;
const newGroup = async (body: object, as = token) =>
  (await api('post', '/groups', as).send(body).expect(201)).body as {
    id: string;
  };
const members = async (id: string) =>
  (
    (await api('get', `/groups/${id}`).expect(200)).body.members as Member[]
  ).map((m) => `${m.displayName}${m.role ? ` (${m.role})` : ''}`);

describe('groups (Phase 8)', () => {
  it('creates, lists, renames and deletes a group; contacts stay', async () => {
    const g = await newGroup({
      name: '  Kasarani   Chama ',
      kind: 'chama',
      description: 'Monthly, first Sunday',
    });
    const ann = await mk('Ann');
    await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann] })
      .expect(200);
    const listed = (await api('get', '/groups').expect(200)).body;
    expect(listed).toEqual([
      {
        id: g.id,
        name: 'Kasarani Chama',
        kind: 'chama',
        description: 'Monthly, first Sunday',
        memberCount: 1,
      },
    ]);
    await api('put', `/groups/${g.id}`)
      .send({ name: 'Mwangaza Chama', kind: 'chama' })
      .expect(200);
    expect(
      (await api('get', `/groups/${g.id}`).expect(200)).body,
    ).toMatchObject({ name: 'Mwangaza Chama', description: null });
    await api('delete', `/groups/${g.id}`).expect(204);
    await api('get', `/groups/${g.id}`).expect(404);
    expect((await list()).body.total).toBe(1);
  });

  it('refuses a second group with the same name, an unknown kind, or no name', async () => {
    await newGroup({ name: 'Church' });
    await api('post', '/groups').send({ name: 'church' }).expect(409);
    await api('post', '/groups').send({ name: 'X', kind: 'cult' }).expect(400);
    await api('post', '/groups').send({ name: '   ' }).expect(400);
  });

  it('adds members with roles, officials first, and never twice', async () => {
    const g = await newGroup({ name: 'Chama', kind: 'chama' });
    const [ann, bob, cate, dan] = [
      await mk('Ann', '0712 345 678'),
      await mk('Bob'),
      await mk('Cate'),
      await mk('Dan'),
    ];
    let r = await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann, bob, cate, dan, ann] })
      .expect(200);
    expect(r.body).toEqual({ added: 4 });
    r = await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann] })
      .expect(200);
    expect(r.body).toEqual({ added: 0 });
    await api('put', `/groups/${g.id}/members/${dan}`)
      .send({ role: ' Treasurer ' })
      .expect(204);
    await api('put', `/groups/${g.id}/members/${cate}`)
      .send({ role: 'Chair' })
      .expect(204);
    await api('put', `/groups/${g.id}/members/${bob}`)
      .send({ role: 'welfare' })
      .expect(204);
    expect(await members(g.id)).toEqual([
      'Cate (chair)',
      'Dan (treasurer)',
      'Bob (welfare)',
      'Ann',
    ]);
    const detail = (await api('get', `/groups/${g.id}`).expect(200)).body as {
      members: Member[];
    };
    expect(detail.members.find((m) => m.displayName === 'Ann')?.phone).toEqual({
      raw: '0712 345 678',
      e164: '+254712345678',
    });
    // Clearing a role, removing a member.
    await api('put', `/groups/${g.id}/members/${cate}`).send({}).expect(204);
    await api('delete', `/groups/${g.id}/members/${bob}`).expect(204);
    await api('delete', `/groups/${g.id}/members/${bob}`).expect(404);
    expect(await members(g.id)).toEqual(['Dan (treasurer)', 'Ann', 'Cate']);
  });

  it('hides trashed contacts from the group, and brings them back on restore', async () => {
    const g = await newGroup({ name: 'Church', kind: 'church' });
    const ann = await mk('Ann');
    await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann], role: 'elder' })
      .expect(200);
    await api('delete', `/contacts/${ann}`).expect(204);
    expect(await members(g.id)).toEqual([]);
    expect((await api('get', '/groups').expect(200)).body[0].memberCount).toBe(
      0,
    );
    await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann] })
      .expect(404);
    await api('post', `/contacts/${ann}/restore`).expect(204);
    expect(await members(g.id)).toEqual(['Ann (elder)']);
  });

  it('lists a contact’s groups with roles', async () => {
    const a = await newGroup({ name: 'Family', kind: 'family' });
    const b = await newGroup({ name: 'Chama', kind: 'chama' });
    const ann = await mk('Ann');
    await api('post', `/groups/${a.id}/members`).send({ contactIds: [ann] });
    await api('post', `/groups/${b.id}/members`)
      .send({ contactIds: [ann], role: 'secretary' })
      .expect(200);
    const { body } = await api('get', `/groups/for-contact/${ann}`).expect(200);
    expect(body).toEqual([
      { id: b.id, name: 'Chama', kind: 'chama', role: 'secretary' },
      { id: a.id, name: 'Family', kind: 'family', role: null },
    ]);
  });

  it('exports the members as a .vcf', async () => {
    const g = await newGroup({ name: 'Kasarani Chama!' });
    const ann = await mk('Ann', '0712 345 678');
    await mk('Not a member');
    await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann] })
      .expect(200);
    const res = await api('get', `/groups/${g.id}/export`).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/vcard/);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="Kasarani Chama.vcf"',
    );
    expect(res.text.match(/BEGIN:VCARD/g)).toHaveLength(1);
    expect(res.text).toContain('FN:Ann');
  });

  it('keeps each owner’s groups and contacts apart', async () => {
    const g = await newGroup({ name: 'Chama' });
    const ann = await mk('Ann');
    const other = await secondUser();
    await api('get', `/groups/${g.id}`, other).expect(404);
    await api('delete', `/groups/${g.id}`, other).expect(404);
    expect((await api('get', '/groups', other).expect(200)).body).toEqual([]);
    const theirs = await newGroup({ name: 'Chama' }, other);
    // Their group cannot take my contact; mine cannot be changed by them.
    await api('post', `/groups/${theirs.id}/members`, other)
      .send({ contactIds: [ann] })
      .expect(404);
    await api('post', `/groups/${g.id}/members`, other)
      .send({ contactIds: [ann] })
      .expect(404);
    await api('get', `/groups/for-contact/${ann}`, other).expect(200, []);
  });

  it('audits by id and count only', async () => {
    const g = await newGroup({ name: 'Secret Society' });
    const ann = await mk('Secretname');
    await api('post', `/groups/${g.id}/members`)
      .send({ contactIds: [ann], role: 'treasurer' })
      .expect(200);
    await api('get', `/groups/${g.id}/export`).expect(200);
    const { rows } = await owner.query(
      `SELECT action, metadata FROM audit_logs WHERE action LIKE 'group.%' ORDER BY created_at`,
    );
    expect(rows.map((r: { action: string }) => r.action)).toEqual([
      'group.created',
      'group.members_added',
      'group.exported',
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/Secret|treasurer/);
  });
});
