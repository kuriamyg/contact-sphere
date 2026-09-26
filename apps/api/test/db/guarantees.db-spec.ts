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
    'TRUNCATE email_addresses, phone_numbers, contacts, mfa_challenges, recovery_codes, sessions, audit_logs, users',
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
