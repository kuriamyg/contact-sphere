import { Client, DatabaseError } from 'pg';

import { requireLocalDatabaseUrl } from '../support/local-database';

/**
 * Database-level guarantees (ADR 0012), proven against real Postgres.
 *
 * `owner` connects as the migration owner (DIRECT_URL). `app` connects as the
 * least-privilege login role the API uses in production (DATABASE_URL, a
 * member of app_runtime). A mock cannot prove any of this: the point is that
 * Postgres itself refuses, whatever the application code does.
 */
const PERMISSION_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

const owner = new Client({
  connectionString: requireLocalDatabaseUrl('DIRECT_URL'),
});
const app = new Client({
  connectionString: requireLocalDatabaseUrl('DATABASE_URL'),
});

async function sqlState(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof DatabaseError && error.code) return error.code;
    throw error;
  }
  throw new Error('expected the statement to be refused, but it succeeded');
}

// A syntactically valid argon2id PHC string; the database checks the
// prefix, not the maths.
const HASH = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$aGFzaGhhc2hoYXNo';
const TOKEN_HASH = 'a'.repeat(64);

async function insertUser(
  client: Client,
  email: string,
  passwordHash = HASH,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (id, email, password_hash, updated_at)
     VALUES (gen_random_uuid(), $1, $2, now()) RETURNING id`,
    [email, passwordHash],
  );
  return rows[0].id;
}

async function insertSession(
  client: Client,
  userId: string,
  tokenHash = TOKEN_HASH,
  expiresIn = "interval '30 days'",
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (gen_random_uuid(), $1, $2, now() + ${expiresIn}) RETURNING id`,
    [userId, tokenHash],
  );
  return rows[0].id;
}

async function insertAudit(client: Client, actorId: string | null) {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO audit_logs (id, actor_user_id, action)
     VALUES (gen_random_uuid(), $1, 'test.action') RETURNING id`,
    [actorId],
  );
  return rows[0].id;
}

beforeAll(async () => {
  await owner.connect();
  await app.connect();
  // Sanity: the two connections really are different roles, or every
  // "refused" assertion below would be meaningless.
  const who = await app.query<{ current_user: string }>('SELECT current_user');
  const own = await owner.query<{ current_user: string }>(
    'SELECT current_user',
  );
  expect(who.rows[0].current_user).not.toBe(own.rows[0].current_user);
});

beforeEach(async () => {
  await owner.query(
    'TRUNCATE follow_ups, group_members, groups, saved_searches, contact_merges, duplicate_dismissals, email_addresses, phone_numbers, contacts, mfa_challenges, recovery_codes, sessions, audit_logs, users',
  );
});

afterAll(async () => {
  await app.end();
  await owner.end();
});

describe('the app role (least privilege)', () => {
  it('can read and write users', async () => {
    await insertUser(app, 'ann@example.com');
    const { rows } = await app.query('SELECT email FROM users');
    expect(rows).toEqual([{ email: 'ann@example.com' }]);
  });

  it('cannot change the schema', async () => {
    expect(await sqlState(app.query('CREATE TABLE sneaky (id int)'))).toBe(
      PERMISSION_DENIED,
    );
    expect(
      await sqlState(app.query('ALTER TABLE users ADD COLUMN sneaky int')),
    ).toBe(PERMISSION_DENIED);
    expect(await sqlState(app.query('DROP TABLE users'))).toBe(
      PERMISSION_DENIED,
    );
  });

  it("cannot read or edit Prisma's migration history", async () => {
    expect(await sqlState(app.query('SELECT * FROM _prisma_migrations'))).toBe(
      PERMISSION_DENIED,
    );
  });
});

describe('audit_logs is append-only for the app', () => {
  it('allows INSERT and SELECT', async () => {
    const id = await insertAudit(app, null);
    const { rows } = await app.query('SELECT id FROM audit_logs');
    expect(rows).toEqual([{ id }]);
  });

  it('refuses UPDATE', async () => {
    await insertAudit(app, null);
    expect(
      await sqlState(app.query(`UPDATE audit_logs SET action = 'x.y'`)),
    ).toBe(PERMISSION_DENIED);
  });

  it('refuses DELETE', async () => {
    await insertAudit(app, null);
    expect(await sqlState(app.query('DELETE FROM audit_logs'))).toBe(
      PERMISSION_DENIED,
    );
  });

  it('refuses TRUNCATE', async () => {
    expect(await sqlState(app.query('TRUNCATE audit_logs'))).toBe(
      PERMISSION_DENIED,
    );
  });

  it('refuses free-text actions, where personal data would leak', async () => {
    expect(
      await sqlState(
        app.query(
          `INSERT INTO audit_logs (id, action) VALUES (gen_random_uuid(), 'Called Ann about her surgery')`,
        ),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it('refuses metadata that is not a JSON object', async () => {
    expect(
      await sqlState(
        app.query(
          `INSERT INTO audit_logs (id, action, metadata) VALUES (gen_random_uuid(), 'a.b', '[1]')`,
        ),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it('keeps the entry, without the actor, when an account is deleted', async () => {
    const userId = await insertUser(app, 'bo@example.com');
    const auditId = await insertAudit(app, userId);
    await app.query('DELETE FROM users WHERE id = $1', [userId]);
    const { rows } = await app.query(
      'SELECT actor_user_id FROM audit_logs WHERE id = $1',
      [auditId],
    );
    expect(rows).toEqual([{ actor_user_id: null }]);
  });
});

describe('users', () => {
  it('stores email lower-case only', async () => {
    expect(await sqlState(insertUser(app, 'Ann@Example.com'))).toBe(
      CHECK_VIOLATION,
    );
  });

  it('refuses something that is not an email', async () => {
    expect(await sqlState(insertUser(app, 'not an email'))).toBe(
      CHECK_VIOLATION,
    );
  });

  it('refuses a password that is not an argon2id hash', async () => {
    expect(
      await sqlState(insertUser(app, 'ann@example.com', 'hunter2hunter2')),
    ).toBe(CHECK_VIOLATION);
    expect(
      await sqlState(
        insertUser(app, 'ann@example.com', '$2b$10$bcryptbcryptbcrypt'),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it('refuses a duplicate email', async () => {
    await insertUser(app, 'ann@example.com');
    expect(await sqlState(insertUser(app, 'ann@example.com'))).toBe(
      UNIQUE_VIOLATION,
    );
  });
});

describe('sessions', () => {
  it('the app can create, read, refresh and delete them', async () => {
    const userId = await insertUser(app, 'ann@example.com');
    const id = await insertSession(app, userId);
    await app.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [
      id,
    ]);
    await app.query('DELETE FROM sessions WHERE id = $1', [id]);
    const { rows } = await app.query('SELECT id FROM sessions');
    expect(rows).toEqual([]);
  });

  it('stores only a SHA-256 hex digest, never a raw token', async () => {
    const userId = await insertUser(app, 'ann@example.com');
    expect(await sqlState(insertSession(app, userId, 'raw-token-value'))).toBe(
      CHECK_VIOLATION,
    );
  });

  it('refuses a duplicate token hash', async () => {
    const userId = await insertUser(app, 'ann@example.com');
    await insertSession(app, userId);
    expect(await sqlState(insertSession(app, userId))).toBe(UNIQUE_VIOLATION);
  });

  it('refuses an expiry that is not after creation', async () => {
    const userId = await insertUser(app, 'ann@example.com');
    expect(
      await sqlState(
        insertSession(app, userId, TOKEN_HASH, "interval '-1 second'"),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it('are deleted with their account', async () => {
    const userId = await insertUser(app, 'ann@example.com');
    await insertSession(app, userId);
    await app.query('DELETE FROM users WHERE id = $1', [userId]);
    const { rows } = await app.query('SELECT id FROM sessions');
    expect(rows).toEqual([]);
  });
});

describe('two-factor columns and tables', () => {
  it('store a TOTP secret only in encrypted (v1:) form', async () => {
    const id = await insertUser(app, 'ann@example.com');
    expect(
      await sqlState(
        app.query(
          `UPDATE users SET totp_secret = 'JBSWY3DPEHPK3PXP' WHERE id = $1`,
          [id],
        ),
      ),
    ).toBe(CHECK_VIOLATION);
    await app.query(`UPDATE users SET totp_secret = 'v1:abc' WHERE id = $1`, [
      id,
    ]);
  });

  it('cannot mark two-factor on without a secret', async () => {
    const id = await insertUser(app, 'ann@example.com');
    expect(
      await sqlState(
        app.query('UPDATE users SET totp_enabled_at = now() WHERE id = $1', [
          id,
        ]),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it('store recovery codes and challenges only as SHA-256 digests', async () => {
    const id = await insertUser(app, 'ann@example.com');
    expect(
      await sqlState(
        app.query(
          `INSERT INTO recovery_codes (id, user_id, code_hash) VALUES (gen_random_uuid(), $1, 'K7QM-2XPA-9TRD')`,
          [id],
        ),
      ),
    ).toBe(CHECK_VIOLATION);
    expect(
      await sqlState(
        app.query(
          `INSERT INTO mfa_challenges (id, user_id, token_hash, expires_at) VALUES (gen_random_uuid(), $1, 'raw', now() + interval '5 minutes')`,
          [id],
        ),
      ),
    ).toBe(CHECK_VIOLATION);
  });
});

describe('contacts (ADRs 0004, 0005, 0010)', () => {
  async function insertContact(
    client: Client,
    ownerId: string,
    displayName = 'Ann',
    sortName = displayName.toLowerCase(),
  ): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO contacts (id, owner_id, display_name, sort_name, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, now()) RETURNING id`,
      [ownerId, displayName, sortName],
    );
    return rows[0].id;
  }

  const insertPhone = (
    client: Client,
    ownerId: string,
    contactId: string,
    raw = '0712345678',
    e164: string | null = '+254712345678',
    digits = '0712345678',
    position = 0,
  ) =>
    client.query(
      `INSERT INTO phone_numbers (id, owner_id, contact_id, raw, e164, digits, position)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
      [ownerId, contactId, raw, e164, digits, position],
    );

  const insertEmail = (
    client: Client,
    ownerId: string,
    contactId: string,
    address: string,
    position = 0,
  ) =>
    client.query(
      `INSERT INTO email_addresses (id, owner_id, contact_id, address, position)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [ownerId, contactId, address, position],
    );

  it('the app can create, read, change and hard-delete them', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const c = await insertContact(app, u);
    await insertPhone(app, u, c);
    await insertEmail(app, u, c, 'a@x.co');
    await app.query('UPDATE contacts SET deleted_at = now() WHERE id = $1', [
      c,
    ]);
    await app.query('DELETE FROM contacts WHERE id = $1', [c]);
    const { rows } = await app.query(
      `SELECT (SELECT count(*) FROM phone_numbers)::int AS p,
              (SELECT count(*) FROM email_addresses)::int AS e`,
    );
    // Numbers and emails go with the contact: nothing personal lingers.
    expect(rows[0]).toEqual({ p: 0, e: 0 });
  });

  it('a phone or email can never belong to a different owner than its contact', async () => {
    const ann = await insertUser(app, 'ann@example.com');
    const bob = await insertUser(app, 'bob@example.com');
    const annsContact = await insertContact(app, ann);
    expect(await sqlState(insertPhone(app, bob, annsContact))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
    expect(await sqlState(insertEmail(app, bob, annsContact, 'x@y.co'))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });

  it('are deleted with their account', async () => {
    const u = await insertUser(app, 'ann@example.com');
    await insertPhone(app, u, await insertContact(app, u));
    await owner.query('DELETE FROM users WHERE id = $1', [u]);
    const { rows } = await owner.query(
      'SELECT (SELECT count(*) FROM contacts)::int + (SELECT count(*) FROM phone_numbers)::int AS n',
    );
    expect(rows[0].n).toBe(0);
  });

  it('always have a display name, and a folded sort name', async () => {
    const u = await insertUser(app, 'ann@example.com');
    expect(await sqlState(insertContact(app, u, '   ', '   '))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(insertContact(app, u, 'Ann', 'Ann'))).toBe(
      CHECK_VIOLATION,
    );
  });

  it('keep tags lower-case, never null and at most 20; area and met-through trimmed (Phase 7)', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const id = await insertContact(app, u);
    const set = (sql: string, v: unknown) =>
      sqlState(app.query(`UPDATE contacts SET ${sql} WHERE id = $1`, [id, v]));
    await app.query(`UPDATE contacts SET tags = $2::varchar[] WHERE id = $1`, [
      id,
      ['plumber', 'boda boda'],
    ]);
    expect(await set('tags = $2::varchar[]', ['Plumber'])).toBe(
      CHECK_VIOLATION,
    );
    expect(await set('tags = $2::varchar[]', null)).toBe(CHECK_VIOLATION);
    expect(
      await set(
        'tags = $2::varchar[]',
        Array.from({ length: 21 }, (_, i) => `t${i}`),
      ),
    ).toBe(CHECK_VIOLATION);
    expect(await set('area = $2::varchar', ' Kasarani')).toBe(CHECK_VIOLATION);
    expect(await set('area = $2::varchar', '')).toBe(CHECK_VIOLATION);
    expect(await set('met_through = $2::varchar', 'church ')).toBe(
      CHECK_VIOLATION,
    );
    expect(await set('search_text = $2::text', 'Ann')).toBe(CHECK_VIOLATION);
  });

  it('refuses malformed phone numbers and duplicate positions', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const c = await insertContact(app, u);
    // Unparsed numbers are allowed (e164 null) — but a stored E.164 must be one.
    await insertPhone(app, u, c, '*144#', null, '144', 0);
    expect(
      await sqlState(insertPhone(app, u, c, '0712', '0712345678', '0712', 1)),
    ).toBe(CHECK_VIOLATION);
    expect(await sqlState(insertPhone(app, u, c, 'x', null, 'abc', 1))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(insertPhone(app, u, c, '  ', null, '', 1))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(insertPhone(app, u, c))).toBe(UNIQUE_VIOLATION);
  });

  it('stores email addresses lower-case only', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const c = await insertContact(app, u);
    expect(await sqlState(insertEmail(app, u, c, 'Ann@X.co'))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(insertEmail(app, u, c, 'no-at-sign'))).toBe(
      CHECK_VIOLATION,
    );
  });
});

describe('duplicate dismissals and merges (Phase 5b)', () => {
  const contact = async (ownerId: string, name: string) =>
    (
      await app.query<{ id: string }>(
        `INSERT INTO contacts (id, owner_id, display_name, sort_name, updated_at)
         VALUES (gen_random_uuid(), $1, $2::varchar, lower($2::varchar), now()) RETURNING id`,
        [ownerId, name],
      )
    ).rows[0].id;

  it('stores each dismissed pair once, smaller id first', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const [x, y] = [await contact(u, 'A'), await contact(u, 'B')].sort();
    const dismiss = (a: string, b: string) =>
      app.query(
        `INSERT INTO duplicate_dismissals (id, owner_id, contact_a_id, contact_b_id)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [u, a, b],
      );
    expect(await sqlState(dismiss(y, x))).toBe(CHECK_VIOLATION);
    await dismiss(x, y);
    expect(await sqlState(dismiss(x, y))).toBe(UNIQUE_VIOLATION);
  });

  it('a merge can never link two owners’ contacts, or a contact to itself', async () => {
    const ann = await insertUser(app, 'ann@example.com');
    const bob = await insertUser(app, 'bob@example.com');
    const a = await contact(ann, 'A');
    const b = await contact(bob, 'B');
    const merge = (owner: string, s: string, m: string) =>
      app.query(
        `INSERT INTO contact_merges (id, owner_id, survivor_id, merged_id, survivor_before)
         VALUES (gen_random_uuid(), $1, $2, $3, '{}')`,
        [owner, s, m],
      );
    expect(await sqlState(merge(ann, a, b))).toBe(FOREIGN_KEY_VIOLATION);
    expect(await sqlState(merge(ann, a, a))).toBe(CHECK_VIOLATION);
  });

  it('merge records disappear with their contacts (no undo after hard delete)', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const a = await contact(u, 'A');
    const b = await contact(u, 'B');
    await app.query(
      `INSERT INTO contact_merges (id, owner_id, survivor_id, merged_id, survivor_before)
       VALUES (gen_random_uuid(), $1, $2, $3, '{"displayName":"A"}')`,
      [u, a, b],
    );
    await app.query('DELETE FROM contacts WHERE id = $1', [b]);
    const { rows } = await app.query(
      'SELECT count(*)::int AS n FROM contact_merges',
    );
    expect(rows[0].n).toBe(0);
  });
});

describe('saved searches (Phase 7b)', () => {
  const insert = (
    owner: string,
    name: string,
    query: string,
    tag: string | null,
  ) =>
    app.query(
      `INSERT INTO saved_searches (id, owner_id, name, query, tag)
       VALUES (gen_random_uuid(), $1, $2::varchar, $3::varchar, $4::varchar)`,
      [owner, name, query, tag],
    );

  it('always search for something, with a tidy name and a lower-case tag', async () => {
    const u = await insertUser(app, 'ann@example.com');
    await insert(u, 'Plumbers', '', 'plumber');
    expect(await sqlState(insert(u, 'Empty', '', null))).toBe(CHECK_VIOLATION);
    expect(await sqlState(insert(u, ' Padded', 'x', null))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(insert(u, 'Upper', '', 'Plumber'))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(insert(u, 'Plumbers', 'x', null))).toBe('23505');
  });

  it('are deleted with their account', async () => {
    const u = await insertUser(app, 'ann@example.com');
    await insert(u, 'Plumbers', '', 'plumber');
    await app.query('DELETE FROM users WHERE id = $1', [u]);
    const { rows } = await app.query(
      'SELECT count(*)::int AS n FROM saved_searches',
    );
    expect(rows[0]).toEqual({ n: 0 });
  });
});

describe('groups (Phase 8)', () => {
  const group = (owner: string, name: string, kind = 'chama') =>
    app.query<{ id: string }>(
      `INSERT INTO groups (id, owner_id, name, name_key, kind, updated_at)
       VALUES (gen_random_uuid(), $1, $2::varchar, lower($2::varchar), $3::varchar, now()) RETURNING id`,
      [owner, name, kind],
    );
  const contact = async (owner: string) =>
    (
      await app.query<{ id: string }>(
        `INSERT INTO contacts (id, owner_id, display_name, sort_name, updated_at)
         VALUES (gen_random_uuid(), $1, 'Ann', 'ann', now()) RETURNING id`,
        [owner],
      )
    ).rows[0].id;
  const member = (
    g: string,
    c: string,
    owner: string,
    role: string | null = null,
  ) =>
    app.query(
      `INSERT INTO group_members (group_id, contact_id, owner_id, role) VALUES ($1, $2, $3, $4::varchar)`,
      [g, c, owner, role],
    );

  it('know their kinds, keep names tidy and unique per owner', async () => {
    const u = await insertUser(app, 'ann@example.com');
    await group(u, 'Kasarani Chama');
    expect(await sqlState(group(u, 'kasarani chama'))).toBe('23505');
    expect(await sqlState(group(u, 'X', 'cult'))).toBe(CHECK_VIOLATION);
    expect(await sqlState(group(u, ' Padded'))).toBe(CHECK_VIOLATION);
  });

  it('can never hold another owner’s contact', async () => {
    const a = await insertUser(app, 'ann@example.com');
    const b = await insertUser(app, 'bob@example.com');
    const g = (await group(a, 'Chama')).rows[0].id;
    const theirs = await contact(b);
    expect(await sqlState(member(g, theirs, a))).toBe('23503');
    expect(await sqlState(member(g, theirs, b))).toBe('23503');
  });

  it('store roles lower-case, and lose members with their contact', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const g = (await group(u, 'Chama')).rows[0].id;
    const c = await contact(u);
    expect(await sqlState(member(g, c, u, 'Treasurer'))).toBe(CHECK_VIOLATION);
    await member(g, c, u, 'treasurer');
    await app.query('DELETE FROM contacts WHERE id = $1', [c]);
    const { rows } = await app.query(
      'SELECT count(*)::int AS n FROM group_members',
    );
    expect(rows[0]).toEqual({ n: 0 });
  });
});

describe('keep in touch and follow-ups (Phase 9)', () => {
  const contact = async (owner: string) =>
    (
      await app.query<{ id: string }>(
        `INSERT INTO contacts (id, owner_id, display_name, sort_name, updated_at)
         VALUES (gen_random_uuid(), $1, 'Ann', 'ann', now()) RETURNING id`,
        [owner],
      )
    ).rows[0].id;
  const followUp = (
    owner: string,
    c: string,
    note: string,
    due = '2026-10-01',
  ) =>
    app.query(
      `INSERT INTO follow_ups (id, owner_id, contact_id, due_on, note)
       VALUES (gen_random_uuid(), $1, $2, $3::date, $4::varchar)`,
      [owner, c, due, note],
    );

  it('allow only the offered keep-in-touch cadences', async () => {
    const u = await insertUser(app, 'ann@example.com');
    const c = await contact(u);
    await app.query(
      'UPDATE contacts SET keep_in_touch_days = 30 WHERE id = $1',
      [c],
    );
    expect(
      await sqlState(
        app.query('UPDATE contacts SET keep_in_touch_days = 10 WHERE id = $1', [
          c,
        ]),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it('keep notes tidy and dates plausible, and never cross owners', async () => {
    const a = await insertUser(app, 'ann@example.com');
    const b = await insertUser(app, 'bob@example.com');
    const c = await contact(a);
    await followUp(a, c, 'Call about the harambee');
    expect(await sqlState(followUp(a, c, ' padded'))).toBe(CHECK_VIOLATION);
    expect(await sqlState(followUp(a, c, 'x', '1990-01-01'))).toBe(
      CHECK_VIOLATION,
    );
    expect(await sqlState(followUp(b, c, 'x'))).toBe('23503');
  });
});
