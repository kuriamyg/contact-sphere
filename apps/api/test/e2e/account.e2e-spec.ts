import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { hashToken, newSessionToken } from '../../src/auth/tokens';
import { TOTP_PERIOD, totpCodeAt } from '../../src/auth/totp';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
  TEST_SETUP_TOKEN,
} from '../support/test-app';

const EMAIL = 'owner@example.com';
const PASSWORD = 'orange piano window cloud';

let app: NestExpressApplication;
let server: App;
let owner: Client;
let ip = 0;

type Method = 'get' | 'post' | 'put' | 'delete';
const api = (method: Method, url: string, token?: string) => {
  const r = request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.7.${++ip % 250}`);
  return token ? r.set('authorization', `Session ${token}`) : r;
};

const code = (secret: string, steps = 0) =>
  totpCodeAt(secret, Date.now() + steps * TOTP_PERIOD * 1000);

async function setupOwner(): Promise<string> {
  const res = await api('post', '/auth/setup')
    .send({ setupToken: TEST_SETUP_TOKEN, email: EMAIL, password: PASSWORD })
    .expect(201);
  return res.body.token as string;
}

/** A second account with a live session, made directly in the database. */
async function secondUser(): Promise<{ id: string; token: string }> {
  const { rows } = await owner.query<{ id: string }>(
    `INSERT INTO users (id, email, password_hash, updated_at)
     VALUES (gen_random_uuid(), 'other@example.com', '$argon2id$v=19$x', now())
     RETURNING id`,
  );
  const token = newSessionToken();
  await owner.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (gen_random_uuid(), $1, $2, now() + interval '1 day')`,
    [rows[0].id, hashToken(token)],
  );
  return { id: rows[0].id, token };
}

/** Rows in every table that holds an owner's data, for one user. */
async function rowsFor(userId: string): Promise<Record<string, number>> {
  const q = async (sql: string) =>
    (await owner.query<{ n: number }>(sql, [userId])).rows[0].n;
  return {
    users: await q('SELECT count(*)::int n FROM users WHERE id = $1'),
    sessions: await q(
      'SELECT count(*)::int n FROM sessions WHERE user_id = $1',
    ),
    contacts: await q(
      'SELECT count(*)::int n FROM contacts WHERE owner_id = $1',
    ),
    phones: await q(
      'SELECT count(*)::int n FROM phone_numbers WHERE owner_id = $1',
    ),
    emails: await q(
      'SELECT count(*)::int n FROM email_addresses WHERE owner_id = $1',
    ),
    groups: await q('SELECT count(*)::int n FROM groups WHERE owner_id = $1'),
    members: await q(
      'SELECT count(*)::int n FROM group_members WHERE owner_id = $1',
    ),
    followUps: await q(
      'SELECT count(*)::int n FROM follow_ups WHERE owner_id = $1',
    ),
    searches: await q(
      'SELECT count(*)::int n FROM saved_searches WHERE owner_id = $1',
    ),
    recoveryCodes: await q(
      'SELECT count(*)::int n FROM recovery_codes WHERE user_id = $1',
    ),
  };
}

async function fill(token: string): Promise<void> {
  const c = await api('post', '/contacts', token)
    .send({
      givenName: 'Wanjiru',
      notes: 'Owes 5000',
      phones: [{ raw: '0712 000 101' }],
      emails: [{ address: 'w@example.com' }],
    })
    .expect(201);
  const g = await api('post', '/groups', token)
    .send({ name: 'Kasarani Chama', kind: 'chama' })
    .expect(201);
  await api('post', `/groups/${g.body.id}/members`, token)
    .send({ contactIds: [c.body.id] })
    .expect((r) => expect(r.status).toBeLessThan(300));
  await api('post', `/remember/contacts/${c.body.id}/follow-ups`, token)
    .send({ dueOn: '2026-10-01', note: 'Call' })
    .expect(201);
  await api('post', '/contacts/searches', token)
    .send({ name: 'Chama', query: 'chama' })
    .expect(201);
}

beforeAll(async () => {
  ({ app } = await createTestApp());
  server = app.getHttpServer();
  owner = ownerClient();
  await owner.connect();
});
beforeEach(() => resetDatabase(owner));
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('deleting the account (B7)', () => {
  it('refuses a wrong password, a missing confirmation, and no session', async () => {
    const token = await setupOwner();
    await api('post', '/auth/account/delete', token)
      .send({ password: 'not my password', confirm: 'DELETE' })
      .expect(401);
    await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD })
      .expect(400);
    await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD, confirm: 'delete' })
      .expect(400);
    await api('post', '/auth/account/delete')
      .send({ password: PASSWORD, confirm: 'DELETE' })
      .expect(401);
    await api('get', '/auth/me', token).expect(200);
  });

  it('removes every row of the owner’s data, and only theirs', async () => {
    const token = await setupOwner();
    const me = (await api('get', '/auth/me', token).expect(200)).body as {
      id: string;
    };
    await fill(token);
    const other = await secondUser();
    await fill(other.token);
    const before = await rowsFor(me.id);
    expect(before.contacts).toBe(1);
    expect(before.groups).toBe(1);
    expect(before.searches).toBe(1);
    const otherBefore = await rowsFor(other.id);

    await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD, confirm: 'DELETE' })
      .expect(204);

    expect(Object.values(await rowsFor(me.id)).every((n) => n === 0)).toBe(
      true,
    );
    expect(await rowsFor(other.id)).toEqual(otherBefore);
    await api('get', '/auth/me', token).expect(401);
    await api('get', '/contacts', other.token).expect(200);
  });

  it('keeps an audit entry with counts only, its actor gone with the account', async () => {
    const token = await setupOwner();
    const me = (await api('get', '/auth/me', token).expect(200)).body as {
      id: string;
    };
    await fill(token);
    await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD, confirm: 'DELETE' })
      .expect(204);
    const { rows } = await owner.query<{
      actor_user_id: string | null;
      entity_id: string;
      metadata: object;
    }>(
      `SELECT actor_user_id, entity_id, metadata FROM audit_logs
       WHERE action = 'auth.account_deleted'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      actor_user_id: null,
      entity_id: me.id,
      metadata: { contacts: 1, groups: 1 },
    });
    const all = (
      await owner.query<{ m: string }>(
        'SELECT metadata::text AS m FROM audit_logs',
      )
    ).rows
      .map((r) => r.m)
      .join(' ');
    expect(all).not.toMatch(/Wanjiru|0712|owner@example|w@example|5000/);
  });

  it('with two-factor on, also needs a code — a recovery code works', async () => {
    const token = await setupOwner();
    const setup = await api('post', '/auth/totp/setup', token).expect(200);
    const secret = setup.body.secret as string;
    const enabled = await api('post', '/auth/totp/enable', token)
      .send({ code: code(secret) })
      .expect(200);
    const recovery = (enabled.body.recoveryCodes as string[])[0];

    const noCode = await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD, confirm: 'DELETE' })
      .expect(400);
    expect(noCode.body.message).toBe(
      'Enter a code from your authenticator app.',
    );
    await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD, code: '000000', confirm: 'DELETE' })
      .expect(401);
    await api('post', '/auth/account/delete', token)
      .send({ password: PASSWORD, code: recovery, confirm: 'DELETE' })
      .expect(204);
    const { rows } = await owner.query<{ n: number }>(
      'SELECT count(*)::int n FROM users',
    );
    expect(rows[0].n).toBe(0);
  });
});
