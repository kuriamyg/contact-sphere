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
    .set('x-client-ip', `198.18.7.${++ip % 250}`)
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
    .set('x-client-ip', `198.18.8.${++ip % 250}`)
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

const nairobi = (offsetDays = 0) =>
  new Date(Date.now() + 3 * 3600_000 + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
/** The same month and day, some years ago: a birthday `offset` days away. */
const birthdayIn = (offsetDays: number, yearsAgo = 30) => {
  const d = nairobi(offsetDays);
  return `${Number(d.slice(0, 4)) - yearsAgo}${d.slice(4)}`;
};
const mk = async (body: object) => (await create(body)).body.id as string;
type Today = {
  today: string;
  followUps: {
    id: string;
    displayName: string;
    daysAway: number;
    note: string;
  }[];
  keepInTouch: {
    displayName: string;
    overdueDays: number;
    everyDays: number;
  }[];
  birthdays: { displayName: string; daysAway: number; turning: number }[];
};
const today = async (as = token) =>
  (await api('get', '/remember/today', as).expect(200)).body as Today;

describe('remember: keep in touch, follow-ups, today (Phase 9)', () => {
  it('lists birthdays in the next 14 days, soonest first, with the age', async () => {
    await mk({ displayName: 'Today Tess', birthday: birthdayIn(0, 40) });
    await mk({ displayName: 'Soon Sam', birthday: birthdayIn(5) });
    await mk({ displayName: 'Later Liz', birthday: birthdayIn(20) });
    const archived = await mk({
      displayName: 'Archived Ann',
      birthday: birthdayIn(1),
    });
    await api('post', `/contacts/${archived}/archive`).expect(204);
    const t = await today();
    expect(t.today).toBe(nairobi());
    expect(
      t.birthdays.map((b) => [b.displayName, b.daysAway, b.turning]),
    ).toEqual([
      ['Today Tess', 0, 40],
      ['Soon Sam', 5, 30],
    ]);
  });

  it('keeps in touch: overdue first, "contacted" clears it, and it is not an edit', async () => {
    const mama = await mk({ displayName: 'Mama' });
    const bro = await mk({ displayName: 'Brother' });
    await api('put', `/remember/contacts/${mama}/keep-in-touch`)
      .send({ days: 7 })
      .expect(204);
    await api('put', `/remember/contacts/${bro}/keep-in-touch`)
      .send({ days: 30 })
      .expect(204);
    await api('put', `/remember/contacts/${bro}/keep-in-touch`)
      .send({ days: 10 })
      .expect(400);
    // New contacts count from the day they were saved: nothing due yet.
    expect((await today()).keepInTouch).toEqual([]);
    await owner.query(
      `UPDATE contacts SET created_at = now() - interval '60 days',
         last_contacted_at = now() - interval '40 days' WHERE id = $1`,
      [bro],
    );
    await owner.query(
      `UPDATE contacts SET created_at = now() - interval '60 days' WHERE id = $1`,
      [mama],
    );
    const edited = (await api('get', `/contacts/${mama}`).expect(200)).body
      .updatedAt as string;
    let t = await today();
    expect(t.keepInTouch.map((k) => [k.displayName, k.overdueDays])).toEqual([
      ['Mama', 53],
      ['Brother', 10],
    ]);
    await api('post', `/remember/contacts/${mama}/contacted`).expect(204);
    t = await today();
    expect(t.keepInTouch.map((k) => k.displayName)).toEqual(['Brother']);
    const r = (await api('get', `/remember/contacts/${mama}`).expect(200)).body;
    expect(r).toMatchObject({ keepInTouchDays: 7, due: { overdueDays: -7 } });
    expect(r.lastContactedAt).toBeTruthy();
    expect(
      (await api('get', `/contacts/${mama}`).expect(200)).body.updatedAt,
    ).toBe(edited);
    // Turning the reminder off.
    await api('put', `/remember/contacts/${bro}/keep-in-touch`)
      .send({})
      .expect(204);
    expect((await today()).keepInTouch).toEqual([]);
  });

  it('follow-ups: due within a week show on Today; done ones leave', async () => {
    const ann = await mk({ displayName: 'Ann' });
    const late = (
      await api('post', `/remember/contacts/${ann}/follow-ups`)
        .send({ dueOn: nairobi(-2), note: '  Ask about   the harambee ' })
        .expect(201)
    ).body.id as string;
    await api('post', `/remember/contacts/${ann}/follow-ups`)
      .send({ dueOn: nairobi(3), note: 'Send the minutes' })
      .expect(201);
    await api('post', `/remember/contacts/${ann}/follow-ups`)
      .send({ dueOn: nairobi(30), note: 'Next month' })
      .expect(201);
    let t = await today();
    expect(t.followUps.map((f) => [f.note, f.daysAway])).toEqual([
      ['Ask about the harambee', -2],
      ['Send the minutes', 3],
    ]);
    await api('post', `/remember/follow-ups/${late}/done`).expect(204);
    await api('post', `/remember/follow-ups/${late}/done`).expect(204);
    t = await today();
    expect(t.followUps.map((f) => f.note)).toEqual(['Send the minutes']);
    const r = (await api('get', `/remember/contacts/${ann}`).expect(200))
      .body as {
      followUps: { note: string; doneAt: string | null }[];
    };
    expect(r.followUps.map((f) => [f.note, Boolean(f.doneAt)])).toEqual([
      ['Send the minutes', false],
      ['Next month', false],
      ['Ask about the harambee', true],
    ]);
    await api('delete', `/remember/follow-ups/${late}`).expect(204);
    await api('delete', `/remember/follow-ups/${late}`).expect(404);
  });

  it('refuses bad dates, blank notes and trashed contacts', async () => {
    const ann = await mk({ displayName: 'Ann' });
    const post = (body: object) =>
      api('post', `/remember/contacts/${ann}/follow-ups`).send(body);
    await post({ dueOn: '2026-02-30', note: 'x' }).expect(400);
    await post({ dueOn: '26-01-01', note: 'x' }).expect(400);
    await post({ dueOn: nairobi(), note: '   ' }).expect(400);
    await api('delete', `/contacts/${ann}`).expect(204);
    await post({ dueOn: nairobi(), note: 'x' }).expect(409);
    await api('post', `/remember/contacts/${ann}/contacted`).expect(409);
  });

  it('trashed contacts drop off Today', async () => {
    const ann = await mk({ displayName: 'Ann', birthday: birthdayIn(1) });
    await api('post', `/remember/contacts/${ann}/follow-ups`)
      .send({ dueOn: nairobi(), note: 'Call' })
      .expect(201);
    await api('delete', `/contacts/${ann}`).expect(204);
    const t = await today();
    expect([t.birthdays, t.followUps]).toEqual([[], []]);
  });

  it('keeps owners apart and audits without notes', async () => {
    const ann = await mk({ displayName: 'Ann', birthday: birthdayIn(1) });
    const f = (
      await api('post', `/remember/contacts/${ann}/follow-ups`)
        .send({ dueOn: nairobi(), note: 'Secret plan' })
        .expect(201)
    ).body.id as string;
    const other = await secondUser();
    expect(await today(other)).toMatchObject({
      followUps: [],
      keepInTouch: [],
      birthdays: [],
    });
    await api('get', `/remember/contacts/${ann}`, other).expect(404);
    await api('post', `/remember/follow-ups/${f}/done`, other).expect(404);
    await api('delete', `/remember/follow-ups/${f}`, other).expect(404);
    await api('put', `/remember/contacts/${ann}/keep-in-touch`, other)
      .send({ days: 7 })
      .expect(404);
    const { rows } = await owner.query(
      `SELECT action, metadata FROM audit_logs WHERE action LIKE 'follow_up.%'`,
    );
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toMatch(/Secret/);
  });
});
