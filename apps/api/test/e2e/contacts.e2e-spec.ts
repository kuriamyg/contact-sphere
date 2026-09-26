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
    .set('x-client-ip', `198.18.1.${++ip % 250}`)
    .set('authorization', `Session ${as}`);

const create = (body: object, as = token) =>
  api('post', '/contacts', as).send(body).expect(201);

const list = (query = '', as = token) =>
  api('get', `/contacts${query}`, as).expect(200);

const names = (res: request.Response) =>
  (res.body.items as { displayName: string }[]).map((c) => c.displayName);

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
    .set('x-client-ip', `198.18.2.${++ip % 250}`)
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

describe('access', () => {
  it('needs a session', async () => {
    await request(server)
      .get('/contacts')
      .set('x-bff-secret', TEST_SECRET)
      .set('x-client-ip', '198.18.3.1')
      .expect(401);
  });

  it('needs the web server (BFF secret)', async () => {
    await request(server)
      .get('/contacts')
      .set('authorization', `Session ${token}`)
      .expect(403);
  });

  it('never shows or changes another owner’s contacts', async () => {
    const mine = await create({
      givenName: 'Ann',
      phones: [{ raw: '0712345678' }],
    });
    const other = await secondUser();
    expect((await list('', other)).body.total).toBe(0);
    expect((await list('?q=0712', other)).body.total).toBe(0);
    const id = mine.body.id as string;
    await api('get', `/contacts/${id}`, other).expect(404);
    await api('put', `/contacts/${id}`, other)
      .send({ givenName: 'X' })
      .expect(404);
    await api('delete', `/contacts/${id}`, other).expect(404);
    await api('post', `/contacts/${id}/archive`, other).expect(404);
    await api('post', `/contacts/${id}/used`, other).expect(404);
    await api('delete', '/contacts/trash', other).expect(200);
    // Still intact for its owner.
    const again = await api('get', `/contacts/${id}`).expect(200);
    expect(again.body).toMatchObject({ displayName: 'Ann', deletedAt: null });
  });

  it('rejects malformed ids and unknown fields', async () => {
    await api('get', '/contacts/not-a-uuid').expect(400);
    // A well-formed id of another UUID version is simply not found.
    await api('get', '/contacts/5c920f5f-e23e-4139-b39c-fca162b89f84').expect(
      404,
    );
    await api('post', '/contacts')
      .send({ givenName: 'A', isAdmin: true })
      .expect(400);
    await api('post', '/contacts')
      .send({ givenName: 'A', ownerId: 'x' })
      .expect(400);
  });
});

describe('creating and editing', () => {
  it('stores numbers as typed and as E.164, emails lower-case, in order', async () => {
    const res = await create({
      givenName: ' Ann ',
      familyName: 'Wanjiru',
      phones: [{ raw: '0712 345 678', label: 'mobile' }, { raw: '*144#' }],
      emails: [{ address: ' Ann@Example.COM ' }],
      birthday: '1990-04-12',
      notes: 'Met at church',
    });
    expect(res.body).toMatchObject({
      displayName: 'Ann Wanjiru',
      givenName: 'Ann',
      birthday: '1990-04-12',
      phones: [
        { raw: '0712 345 678', e164: '+254712345678', label: 'mobile' },
        { raw: '*144#', e164: null, label: null },
      ],
      emails: [{ address: 'ann@example.com', label: null }],
      lastUsedAt: null,
      archivedAt: null,
      deletedAt: null,
    });
  });

  it('derives the display name, and refuses a contact with nothing to show', async () => {
    expect((await create({ organization: 'Acme Ltd' })).body.displayName).toBe(
      'Acme Ltd',
    );
    expect(
      (await create({ phones: [{ raw: '0722 000 111' }] })).body.displayName,
    ).toBe('0722 000 111');
    await api('post', '/contacts').send({ givenName: '   ' }).expect(400);
    await api('post', '/contacts').send({}).expect(400);
  });

  it('validates input', async () => {
    const bad = [
      { givenName: 'A', birthday: '1990-02-30' },
      { givenName: 'A', birthday: '2999-01-01' },
      { givenName: 'A', birthday: '12/04/1990' },
      { givenName: 'A', emails: [{ address: 'not-an-email' }] },
      { givenName: 'A', phones: [{ raw: '' }] },
      { givenName: 'x'.repeat(101) },
      {
        givenName: 'A',
        phones: Array.from({ length: 21 }, () => ({ raw: '0712345678' })),
      },
    ];
    for (const body of bad) {
      await api('post', '/contacts').send(body).expect(400);
    }
  });

  it('saving replaces fields and lists, keeps created date, bumps updated', async () => {
    const c = (
      await create({
        givenName: 'Ann',
        phones: [{ raw: '0712345678' }, { raw: '0733000000' }],
        emails: [{ address: 'a@x.co' }],
      })
    ).body;
    const res = await api('put', `/contacts/${c.id}`)
      .send({
        givenName: 'Anne',
        phones: [{ raw: '0733000000', label: 'work' }],
      })
      .expect(200);
    expect(res.body).toMatchObject({
      displayName: 'Anne',
      createdAt: c.createdAt,
      phones: [{ raw: '0733000000', label: 'work' }],
      emails: [],
    });
    expect(res.body.updatedAt > c.updatedAt).toBe(true);
    const { rows } = await owner.query(
      'SELECT count(*)::int AS n FROM phone_numbers',
    );
    expect(rows[0].n).toBe(1);
  });

  it('cannot edit a contact in the trash', async () => {
    const c = (await create({ givenName: 'Ann' })).body;
    await api('delete', `/contacts/${c.id}`).expect(204);
    await api('put', `/contacts/${c.id}`).send({ givenName: 'B' }).expect(409);
  });
});

describe('search', () => {
  beforeEach(async () => {
    await create({
      givenName: 'Ann',
      familyName: 'Wanjiru',
      phones: [{ raw: '0712 345 678' }],
    });
    await create({
      givenName: 'Émile',
      organization: 'Acme Ltd',
      emails: [{ address: 'emile@acme.co' }],
    });
    await create({
      displayName: 'Brother Otieno',
      phones: [{ raw: '+254 733 111 222' }],
    });
    await create({
      nickname: 'Big 50%',
      phones: [{ raw: '+44 20 7946 0958' }],
    });
  });

  it.each([
    ['ann', ['Ann Wanjiru']],
    ['WANJ', ['Ann Wanjiru']],
    ['acme', ['Émile']],
    ['@acme.co', ['Émile']],
    ['0712', ['Ann Wanjiru']],
    ['712 345', ['Ann Wanjiru']],
    ['+254712', ['Ann Wanjiru']],
    ['0733', ['Brother Otieno']],
    ['+254733', ['Brother Otieno']],
    ['7946', ['Big 50%']],
    ['50%', ['Big 50%']],
    ['%', ['Big 50%']],
    ['nobody', []],
  ])('"%s" finds %j', async (q, expected) => {
    expect(names(await list(`?q=${encodeURIComponent(q)}`)).sort()).toEqual(
      [...expected].sort(),
    );
  });
});

describe('sorting and pagination', () => {
  it('sorts by name case- and accent-insensitively, both ways', async () => {
    for (const n of ['bob', 'Émile', 'alice', 'Zed', 'eve']) {
      await create({ displayName: n });
    }
    expect(names(await list())).toEqual([
      'alice',
      'bob',
      'Émile',
      'eve',
      'Zed',
    ]);
    expect(names(await list('?sort=name&order=desc'))).toEqual([
      'Zed',
      'eve',
      'Émile',
      'bob',
      'alice',
    ]);
  });

  it('sorts by date saved, newest first by default', async () => {
    for (const n of ['first', 'second', 'third'])
      await create({ displayName: n });
    expect(names(await list('?sort=created'))).toEqual([
      'third',
      'second',
      'first',
    ]);
    expect(names(await list('?sort=created&order=asc'))).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('sorts by last used, never-opened last, and throttles the write', async () => {
    const ids: Record<string, string> = {};
    for (const n of ['a', 'b', 'c'])
      ids[n] = (await create({ displayName: n })).body.id;
    await api('post', `/contacts/${ids.b}/used`).expect(204);
    await owner.query(
      "UPDATE contacts SET last_used_at = now() - interval '1 hour' WHERE id = $1",
      [ids.b],
    );
    await api('post', `/contacts/${ids.c}/used`).expect(204);
    expect(names(await list('?sort=lastUsed'))).toEqual(['c', 'b', 'a']);
    expect(names(await list('?sort=lastUsed&order=asc'))).toEqual([
      'b',
      'c',
      'a',
    ]);

    // A second open within a minute does not write; neither counts as an edit.
    const before = (await api('get', `/contacts/${ids.c}`).expect(200)).body;
    await api('post', `/contacts/${ids.c}/used`).expect(204);
    const after = (await api('get', `/contacts/${ids.c}`).expect(200)).body;
    expect(after.lastUsedAt).toBe(before.lastUsedAt);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it('pages through results with a total', async () => {
    for (let i = 0; i < 7; i++) await create({ displayName: `c${i}` });
    const p1 = await list('?pageSize=3');
    const p3 = await list('?pageSize=3&page=3');
    expect(p1.body).toMatchObject({ total: 7, page: 1, pageSize: 3 });
    expect(names(p1)).toEqual(['c0', 'c1', 'c2']);
    expect(names(p3)).toEqual(['c6']);
    await api('get', '/contacts?pageSize=101').expect(400);
    await api('get', '/contacts?page=0').expect(400);
    await api('get', '/contacts?sort=secret').expect(400);
  });

  it('lists the primary number and email with each contact', async () => {
    await create({
      displayName: 'Ann',
      phones: [{ raw: '0712345678' }, { raw: '0733000000' }],
      emails: [{ address: 'a@x.co' }],
    });
    expect((await list()).body.items[0]).toMatchObject({
      primaryPhone: { raw: '0712345678', e164: '+254712345678' },
      primaryEmail: 'a@x.co',
    });
  });
});

describe('archive, trash and delete (ADR 0005)', () => {
  it('archive hides from the main list and restores with one call', async () => {
    const c = (await create({ displayName: 'Ann' })).body;
    await api('post', `/contacts/${c.id}/archive`).expect(204);
    expect((await list()).body.total).toBe(0);
    expect(names(await list('?view=archived'))).toEqual(['Ann']);
    await api('post', `/contacts/${c.id}/unarchive`).expect(204);
    expect(names(await list())).toEqual(['Ann']);
  });

  it('trash is restorable, shows when it will be purged, and hides elsewhere', async () => {
    const c = (await create({ displayName: 'Ann' })).body;
    await api('delete', `/contacts/${c.id}`).expect(204);
    await api('delete', `/contacts/${c.id}`).expect(409);
    expect((await list()).body.total).toBe(0);
    expect((await list('?view=archived')).body.total).toBe(0);
    expect(names(await list('?view=trash'))).toEqual(['Ann']);
    const trashed = (await api('get', `/contacts/${c.id}`).expect(200))
      .body as { purgeAt: string; deletedAt: string };
    const days =
      (Date.parse(trashed.purgeAt) - Date.parse(trashed.deletedAt)) /
      86_400_000;
    expect(days).toBe(30);
    await api('post', `/contacts/${c.id}/restore`).expect(204);
    await api('post', `/contacts/${c.id}/restore`).expect(409);
    expect(names(await list())).toEqual(['Ann']);
  });

  it('permanent delete only from the trash, and takes numbers and emails with it', async () => {
    const c = (
      await create({
        displayName: 'Ann',
        phones: [{ raw: '0712345678' }],
        emails: [{ address: 'a@x.co' }],
      })
    ).body;
    await api('delete', `/contacts/${c.id}/permanent`).expect(409);
    await api('delete', `/contacts/${c.id}`).expect(204);
    await api('delete', `/contacts/${c.id}/permanent`).expect(204);
    await api('get', `/contacts/${c.id}`).expect(404);
    const { rows } = await owner.query(
      `SELECT (SELECT count(*) FROM phone_numbers)::int AS p,
              (SELECT count(*) FROM email_addresses)::int AS e`,
    );
    expect(rows[0]).toEqual({ p: 0, e: 0 });
  });

  it('empty trash deletes only trashed contacts', async () => {
    const a = (await create({ displayName: 'A' })).body;
    const b = (await create({ displayName: 'B' })).body;
    await create({ displayName: 'Keep' });
    await api('delete', `/contacts/${a.id}`).expect(204);
    await api('delete', `/contacts/${b.id}`).expect(204);
    expect((await api('delete', '/contacts/trash').expect(200)).body).toEqual({
      deleted: 2,
    });
    expect(names(await list())).toEqual(['Keep']);
  });

  it('contacts older than 30 days in the trash are purged on the next list', async () => {
    const old = (await create({ displayName: 'Old' })).body;
    const recent = (await create({ displayName: 'Recent' })).body;
    await api('delete', `/contacts/${old.id}`).expect(204);
    await api('delete', `/contacts/${recent.id}`).expect(204);
    await owner.query(
      `UPDATE contacts SET created_at = now() - interval '40 days',
                          deleted_at = now() - interval '31 days' WHERE id = $1`,
      [old.id],
    );
    // A fresh app: its purge is due immediately.
    const fresh = await createTestApp();
    try {
      const res = await request(fresh.app.getHttpServer())
        .get('/contacts?view=trash')
        .set('x-bff-secret', TEST_SECRET)
        .set('x-client-ip', '198.18.4.1')
        .set('authorization', `Session ${token}`)
        .expect(200);
      expect(names(res)).toEqual(['Recent']);
    } finally {
      await fresh.app.close();
    }
  });
});

describe('audit', () => {
  it('records each change by id only — never names, numbers or emails', async () => {
    const c = (
      await create({
        givenName: 'Secretname',
        phones: [{ raw: '0712345678' }],
        emails: [{ address: 'secret@example.com' }],
      })
    ).body;
    await api('put', `/contacts/${c.id}`)
      .send({ givenName: 'Othername' })
      .expect(200);
    await api('post', `/contacts/${c.id}/archive`).expect(204);
    await api('delete', `/contacts/${c.id}`).expect(204);
    await api('delete', '/contacts/trash').expect(200);
    const { rows } = await owner.query<{
      action: string;
      entity_id: string | null;
    }>(
      `SELECT action, entity_id FROM audit_logs
       WHERE action LIKE 'contact.%' ORDER BY created_at, id`,
    );
    expect(rows.map((r) => r.action)).toEqual([
      'contact.created',
      'contact.updated',
      'contact.archived',
      'contact.trashed',
      'contact.trash_emptied',
    ]);
    const all = JSON.stringify(
      (await owner.query('SELECT * FROM audit_logs')).rows,
    );
    for (const secret of [
      'Secretname',
      'Othername',
      '0712345678',
      '254712',
      'secret@example.com',
    ]) {
      expect(all).not.toContain(secret);
    }
  });
});

describe('.vcf import and export (Phase 5)', () => {
  const card = (fn: string, tel?: string, email?: string) =>
    [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fn}`,
      tel ? `TEL;TYPE=CELL:${tel}` : '',
      email ? `EMAIL:${email}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');

  const file = (...cards: string[]) => cards.join('\r\n') + '\r\n';

  it('previews without saving, then imports, skipping exact repeats', async () => {
    await create({
      displayName: 'Ann Wanjiru',
      phones: [{ raw: '+254712345678' }],
    });
    const vcf = file(
      card('Ann Wanjiru', '0712 345 678'), // already saved (same number, other format)
      card('Bob', '0733 111 222'),
      card('Bob', '0733111222'), // repeated in the file
      card('Bob', '0733 111 222', 'bob@example.com'), // has something new: imported
      card('Carol', undefined, 'Carol@Example.com'),
      'BEGIN:VCARD\r\nVERSION:3.0\r\nNOTE:nothing to identify\r\nEND:VCARD',
    );
    const preview = await api('post', '/contacts/import/preview')
      .send({ vcf })
      .expect(200);
    expect(preview.body).toMatchObject({
      cards: 6,
      toImport: 3,
      alreadySaved: 1,
      repeatedInFile: 1,
      empty: 1,
    });
    const previewed = preview.body.preview as { displayName: string }[];
    expect(previewed.map((p) => p.displayName)).toEqual([
      'Bob',
      'Bob',
      'Carol',
    ]);
    expect((await list()).body.total).toBe(1); // preview changed nothing

    const done = await api('post', '/contacts/import')
      .send({ vcf })
      .expect(201);
    expect(done.body.toImport).toBe(3);
    expect(names(await list())).toEqual(['Ann Wanjiru', 'Bob', 'Bob', 'Carol']);
    const bob = (await list('?q=bob%40')).body.items[0];
    expect(bob.primaryPhone).toMatchObject({
      raw: '0733 111 222',
      e164: '+254733111222',
    });
    expect(bob.primaryEmail).toBe('bob@example.com');

    // Importing the same file again adds nothing.
    const again = await api('post', '/contacts/import')
      .send({ vcf })
      .expect(201);
    expect(again.body).toMatchObject({
      toImport: 0,
      alreadySaved: 5,
      empty: 1,
    });
    expect((await list()).body.total).toBe(4);
  });

  it('imports 468 contacts in one go', async () => {
    const vcf = file(
      ...Array.from({ length: 468 }, (_, i) =>
        card(
          `Person ${String(i).padStart(3, '0')}`,
          `07${String(10_000_000 + i)}`,
        ),
      ),
    );
    const t0 = Date.now();
    const res = await api('post', '/contacts/import').send({ vcf }).expect(201);
    expect(res.body.toImport).toBe(468);
    expect(Date.now() - t0).toBeLessThan(15_000);
    expect((await list()).body.total).toBe(468);
    const { rows } = await owner.query(
      "SELECT count(*)::int AS n FROM contacts WHERE id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7'",
    );
    expect(rows[0].n).toBe(468); // UUIDv7 ids, like everything else
  });

  it('refuses files that are not vCards, and imports only for the signed-in owner', async () => {
    await api('post', '/contacts/import/preview')
      .send({ vcf: 'name,phone\nAnn,0712' })
      .expect(400);
    await api('post', '/contacts/import').send({}).expect(400);
    const other = await secondUser();
    await api('post', '/contacts/import', other)
      .send({ vcf: file(card('Theirs', '0799 000 000')) })
      .expect(201);
    expect((await list()).body.total).toBe(0);
    expect(names(await list('', other))).toEqual(['Theirs']);
  });

  it('exports every contact not in the trash as vCard 3.0, which imports back', async () => {
    await create({
      givenName: 'Ann',
      familyName: 'Wanjiru',
      phones: [{ raw: '0712 345 678', label: 'mobile' }],
      emails: [{ address: 'ann@example.com' }],
      notes: 'Line 1\nLine 2; with, punctuation',
      birthday: '1990-04-12',
    });
    const gone = await create({ displayName: 'Trashed' });
    await api('delete', `/contacts/${gone.body.id as string}`).expect(204);

    const res = await api('get', '/contacts/export').expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/vcard/);
    expect(res.headers['cache-control']).toBe('no-store');
    const text = res.text;
    expect(text.match(/BEGIN:VCARD/g)).toHaveLength(1);
    expect(text).toContain('TEL;TYPE=cell;TYPE=pref:+254712345678');
    expect(text).not.toContain('Trashed');

    // Into a fresh account: everything comes back.
    const other = await secondUser();
    await api('post', '/contacts/import', other)
      .send({ vcf: text })
      .expect(201);
    const id = (await list('', other)).body.items[0].id as string;
    const back = (await api('get', `/contacts/${id}`, other).expect(200)).body;
    expect(back).toMatchObject({
      displayName: 'Ann Wanjiru',
      givenName: 'Ann',
      familyName: 'Wanjiru',
      notes: 'Line 1\nLine 2; with, punctuation',
      birthday: '1990-04-12',
      phones: [{ e164: '+254712345678', label: 'mobile' }],
      emails: [{ address: 'ann@example.com' }],
    });
  });

  it('audits imports and exports with counts only', async () => {
    await api('post', '/contacts/import')
      .send({ vcf: file(card('Secretname', '0712 000 111')) })
      .expect(201);
    await api('get', '/contacts/export').expect(200);
    const { rows } = await owner.query<{ action: string; metadata: object }>(
      "SELECT action, metadata FROM audit_logs WHERE action IN ('contact.imported','contact.exported') ORDER BY created_at",
    );
    expect(rows).toEqual([
      {
        action: 'contact.imported',
        metadata: { imported: 1, alreadySaved: 0, repeatedInFile: 0, empty: 0 },
      },
      { action: 'contact.exported', metadata: { count: 1 } },
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/Secretname|0712/);
  });
});

describe('profile and counts (Phase 6a)', () => {
  it('sets, tidies and clears the display name; audits without it', async () => {
    const set = await api('post', '/auth/profile')
      .send({ displayName: '  Kuria   Mwangi ' })
      .expect(200);
    expect(set.body).toMatchObject({
      email: 'owner@example.com',
      displayName: 'Kuria Mwangi',
    });
    expect((await api('get', '/auth/me').expect(200)).body.displayName).toBe(
      'Kuria Mwangi',
    );
    const cleared = await api('post', '/auth/profile')
      .send({ displayName: '   ' })
      .expect(200);
    expect(cleared.body.displayName).toBeNull();
    await api('post', '/auth/profile')
      .send({ displayName: 'x'.repeat(101) })
      .expect(400);
    await api('post', '/auth/profile')
      .send({ displayName: 'A', email: 'evil@example.com' })
      .expect(400);
    const { rows } = await owner.query(
      "SELECT metadata FROM audit_logs WHERE action = 'auth.profile_updated'",
    );
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toContain('Kuria');
  });

  it('only changes the signed-in owner’s own profile', async () => {
    const other = await secondUser();
    await api('post', '/auth/profile', other)
      .send({ displayName: 'Other' })
      .expect(200);
    expect(
      (await api('get', '/auth/me').expect(200)).body.displayName,
    ).toBeNull();
  });

  it('counts contacts in each list, per owner', async () => {
    const a = (await create({ displayName: 'A' })).body.id as string;
    const b = (await create({ displayName: 'B' })).body.id as string;
    await create({ displayName: 'C' });
    await api('post', `/contacts/${a}/archive`).expect(204);
    await api('delete', `/contacts/${b}`).expect(204);
    expect((await api('get', '/contacts/stats').expect(200)).body).toEqual({
      active: 1,
      archived: 1,
      trash: 1,
    });
    const other = await secondUser();
    expect(
      (await api('get', '/contacts/stats', other).expect(200)).body,
    ).toEqual({
      active: 0,
      archived: 0,
      trash: 0,
    });
  });
});
