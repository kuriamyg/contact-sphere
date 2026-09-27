import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

import { hashToken, newSessionToken } from '../../src/auth/tokens';
import {
  EMAIL_PROVIDER,
  LogEmailProvider,
} from '../../src/reach/email-provider';
import { PushService } from '../../src/reach/push.service';
import { LogSmsProvider, SMS_PROVIDER } from '../../src/reach/sms-provider';
import {
  createTestApp,
  ownerClient,
  resetDatabase,
  TEST_SECRET,
  TEST_SETUP_TOKEN,
} from '../support/test-app';

/** Test-only keys, generated for this file; they sign nothing real. */
const VAPID = {
  VAPID_PUBLIC_KEY:
    'BBHWEa05wCzwndN_iWSVF3yvl42g6_2DRN02ZkqI-XqXtbPBnSoWOG_RQsYlebqIsyg3D1Y-1zBYG3_ybEIgoNY',
  VAPID_PRIVATE_KEY: '9Q76GW68J7CshY1w3DeUSlNRYoC4ASGLuHfPPddKg-4',
  VAPID_SUBJECT: 'mailto:owner@example.com',
};
const EMAIL = {
  EMAIL_PROVIDER: 'log',
  EMAIL_FROM: 'Contact Sphere <digest@mail.example.com>',
};
const SMS = {
  SMS_PROVIDER: 'log',
  SMS_MONTHLY_LIMIT: '10',
  SMS_PRICE_KES: '0.35',
};

let app: NestExpressApplication;
let server: App;
let owner: Client;
let token: string;
let ip = 0;
let deliver: jest.SpyInstance;
let sms: LogSmsProvider;
let mail: LogEmailProvider;

type Method = 'get' | 'post' | 'put' | 'delete';
const api = (method: Method, url: string, as = token, srv = server) =>
  request(srv)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.9.${++ip % 250}`)
    .set('authorization', `Session ${as}`);

const create = (body: object, as = token) =>
  api('post', '/contacts', as).send(body).expect(201);

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

const device = (n = 1) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}`,
  p256dh: 'B' + 'x'.repeat(86),
  auth: 'a'.repeat(22),
});

const nairobiToday = () =>
  new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

beforeAll(async () => {
  ({ app } = await createTestApp({ ...VAPID, ...SMS, ...EMAIL }));
  server = app.getHttpServer();
  sms = app.get<LogSmsProvider>(SMS_PROVIDER);
  mail = app.get<LogEmailProvider>(EMAIL_PROVIDER);
  owner = ownerClient();
  await owner.connect();
});
beforeEach(async () => {
  await resetDatabase(owner);
  sms.sent.length = 0;
  mail.sent.length = 0;
  deliver = jest
    .spyOn(app.get(PushService), 'deliver')
    .mockResolvedValue('sent');
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
afterEach(() => deliver.mockRestore());
afterAll(async () => {
  await owner.end();
  await app.close();
});

describe('reach status', () => {
  it('says what is set up, without secrets', async () => {
    const res = await api('get', '/reach/status').expect(200);
    expect(res.body).toEqual({
      push: { enabled: true, publicKey: VAPID.VAPID_PUBLIC_KEY, devices: 0 },
      sms: {
        enabled: true,
        monthlyLimit: 10,
        usedThisMonth: 0,
        priceCents: 35,
      },
      email: { enabled: true, on: false },
    });
    expect(JSON.stringify(res.body)).not.toContain(VAPID.VAPID_PRIVATE_KEY);
  });
});

describe('push devices', () => {
  it('adds a phone once, moves it between accounts, and removes it', async () => {
    await api('post', '/reach/push/devices').send(device()).expect(204);
    await api('post', '/reach/push/devices').send(device()).expect(204);
    expect((await api('get', '/reach/status')).body.push.devices).toBe(1);

    const other = await secondUser();
    await api('post', '/reach/push/devices', other).send(device()).expect(204);
    expect((await api('get', '/reach/status')).body.push.devices).toBe(0);
    expect((await api('get', '/reach/status', other)).body.push.devices).toBe(
      1,
    );

    // Removing someone else's endpoint does nothing.
    await api('post', '/reach/push/devices/remove')
      .send({ endpoint: device().endpoint })
      .expect(204);
    expect((await api('get', '/reach/status', other)).body.push.devices).toBe(
      1,
    );
    await api('post', '/reach/push/devices/remove', other)
      .send({ endpoint: device().endpoint })
      .expect(204);
    expect((await api('get', '/reach/status', other)).body.push.devices).toBe(
      0,
    );
  });

  it('refuses a non-https endpoint or bad keys', async () => {
    await api('post', '/reach/push/devices')
      .send({ ...device(), endpoint: 'http://evil.example/x' })
      .expect(400);
    await api('post', '/reach/push/devices')
      .send({ ...device(), auth: 'no' })
      .expect(400);
    await api('post', '/reach/push/devices')
      .send({ ...device(), extra: 1 })
      .expect(400);
  });

  it('sends a test to each phone', async () => {
    await api('post', '/reach/push/devices').send(device(1)).expect(204);
    await api('post', '/reach/push/devices').send(device(2)).expect(204);
    const res = await api('post', '/reach/push/test').expect(200);
    expect(res.body).toEqual({ sent: 2 });
    expect(deliver).toHaveBeenCalledTimes(2);
  });
});

describe('morning digest', () => {
  const run = () =>
    request(server)
      .post('/reach/digest/run')
      .set('x-bff-secret', TEST_SECRET)
      .set('x-client-ip', `198.18.11.${++ip % 250}`);

  it('needs the web server secret, not a session', async () => {
    await request(server).post('/reach/digest/run').expect(403);
    await run().expect(200);
  });

  it('pushes once a day, only when something is due, naming no one', async () => {
    await api('post', '/reach/push/devices').send(device()).expect(204);
    const c = await create({ givenName: 'Wanjiru', familyName: 'Kamau' });

    // Nothing due: nothing sent, but the day is spent.
    expect((await run().expect(200)).body).toEqual({
      owners: 0,
      sent: 0,
      emailed: 0,
    });
    expect(deliver).not.toHaveBeenCalled();

    await api('post', `/remember/contacts/${c.body.id}/follow-ups`)
      .send({ dueOn: nairobiToday(), note: 'Ask about the harambee' })
      .expect(201);
    await owner.query('UPDATE users SET digest_sent_on = NULL');
    expect((await run().expect(200)).body).toEqual({
      owners: 1,
      sent: 1,
      emailed: 0,
    });
    const [, msg] = deliver.mock.calls[0] as [
      unknown,
      { body: string; url: string },
    ];
    expect(msg).toMatchObject({ body: 'Today: 1 follow-up.', url: '/today' });
    expect(JSON.stringify(msg)).not.toMatch(/Wanjiru|harambee/);

    // Twice in a day sends nothing more.
    expect((await run().expect(200)).body).toEqual({
      owners: 0,
      sent: 0,
      emailed: 0,
    });
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it('writes the reminder in the owner’s language', async () => {
    await api('put', '/auth/locale').send({ locale: 'sw' }).expect(204);
    await api('post', '/reach/push/devices').send(device()).expect(204);
    const c = await create({ givenName: 'Wanjiru' });
    await api('post', `/remember/contacts/${c.body.id}/follow-ups`)
      .send({ dueOn: nairobiToday(), note: 'Harambee' })
      .expect(201);
    expect((await run().expect(200)).body).toEqual({
      owners: 1,
      sent: 1,
      emailed: 0,
    });
    const [, msg] = deliver.mock.calls[0] as [unknown, { body: string }];
    expect(msg.body).toBe('Leo: ufuatiliaji 1.');
    expect(JSON.stringify(msg)).not.toMatch(/Wanjiru|Harambee/);
  });

  it('forgets a phone the push service says is gone', async () => {
    await api('post', '/reach/push/devices').send(device()).expect(204);
    const c = await create({ givenName: 'Otieno' });
    await api('post', `/remember/contacts/${c.body.id}/follow-ups`)
      .send({ dueOn: nairobiToday(), note: 'Call' })
      .expect(201);
    deliver.mockResolvedValue('gone');
    expect((await run().expect(200)).body).toEqual({
      owners: 0,
      sent: 0,
      emailed: 0,
    });
    expect((await api('get', '/reach/status')).body.push.devices).toBe(0);
  });
});

describe('morning reminder by email', () => {
  const run = () =>
    request(server)
      .post('/reach/digest/run')
      .set('x-bff-secret', TEST_SECRET)
      .set('x-client-ip', `198.18.12.${++ip % 250}`);

  it('is opt-in, and can be turned on and off', async () => {
    await api('put', '/reach/email').send({ on: true }).expect(204);
    expect((await api('get', '/reach/status')).body.email).toEqual({
      enabled: true,
      on: true,
    });
    await api('put', '/reach/email').send({ on: false }).expect(204);
    expect((await api('get', '/reach/status')).body.email.on).toBe(false);
    await api('put', '/reach/email').send({ on: 'yes' }).expect(400);
    await api('put', '/reach/email').send({}).expect(400);
    await request(server)
      .put('/reach/email')
      .set('x-bff-secret', TEST_SECRET)
      .send({ on: true })
      .expect(401);
  });

  it('sends a test to the account’s own address', async () => {
    const res = await api('post', '/reach/email/test').expect(200);
    expect(res.body).toEqual({ sent: true });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe('owner@example.com');
    expect(mail.sent[0].text).toContain('http://localhost:3000/today');
  });

  it('emails once a day, only when something is due, naming no one', async () => {
    const c = await create({ givenName: 'Wanjiru', familyName: 'Kamau' });
    await api('put', '/reach/email').send({ on: true }).expect(204);
    // Nothing due: nothing sent (no phone either).
    expect((await run().expect(200)).body).toEqual({
      owners: 0,
      sent: 0,
      emailed: 0,
    });
    await api('post', `/remember/contacts/${c.body.id}/follow-ups`)
      .send({ dueOn: nairobiToday(), note: 'Ask about the harambee' })
      .expect(201);
    await owner.query('UPDATE users SET digest_sent_on = NULL');
    expect((await run().expect(200)).body).toEqual({
      owners: 1,
      sent: 0,
      emailed: 1,
    });
    expect(mail.sent[0]).toMatchObject({
      to: 'owner@example.com',
      subject: 'Today: 1 follow-up.',
    });
    expect(JSON.stringify(mail.sent)).not.toMatch(/Wanjiru|Kamau|harambee/);
    // Twice in a day sends nothing more; push and email share the day.
    expect((await run().expect(200)).body.emailed).toBe(0);
    expect(mail.sent).toHaveLength(1);
  });

  it('sends phone and email together when both are on, in Kiswahili', async () => {
    await api('put', '/auth/locale').send({ locale: 'sw' }).expect(204);
    await api('post', '/reach/push/devices').send(device()).expect(204);
    await api('put', '/reach/email').send({ on: true }).expect(204);
    const c = await create({ givenName: 'Otieno' });
    await api('post', `/remember/contacts/${c.body.id}/follow-ups`)
      .send({ dueOn: nairobiToday(), note: 'Call' })
      .expect(201);
    expect((await run().expect(200)).body).toEqual({
      owners: 1,
      sent: 1,
      emailed: 1,
    });
    expect(mail.sent[0].subject).toBe('Leo: ufuatiliaji 1.');
    expect(mail.sent[0].html).toContain('Fungua Leo');
  });

  it('never emails someone who did not opt in', async () => {
    await api('post', '/reach/push/devices').send(device()).expect(204);
    const c = await create({ givenName: 'Achieng' });
    await api('post', `/remember/contacts/${c.body.id}/follow-ups`)
      .send({ dueOn: nairobiToday(), note: 'Call' })
      .expect(201);
    expect((await run().expect(200)).body).toEqual({
      owners: 1,
      sent: 1,
      emailed: 0,
    });
    expect(mail.sent).toHaveLength(0);
  });

  it('when email is not set up: turning on is refused, turning off works', async () => {
    const { app: bare } = await createTestApp({ ...VAPID });
    const srv = bare.getHttpServer();
    try {
      const t = (
        await request(srv)
          .post('/auth/login')
          .set('x-bff-secret', TEST_SECRET)
          .set('x-client-ip', `198.18.13.${++ip % 250}`)
          .send({
            email: 'owner@example.com',
            password: 'orange piano window cloud',
          })
          .expect(200)
      ).body.token as string;
      expect((await api('get', '/reach/status', t, srv)).body.email).toEqual({
        enabled: false,
        on: false,
      });
      await api('put', '/reach/email', t, srv).send({ on: true }).expect(403);
      await api('put', '/reach/email', t, srv).send({ on: false }).expect(204);
      await api('post', '/reach/email/test', t, srv).expect(403);
    } finally {
      await bare.close();
    }
  });
});

describe('group texts through a provider', () => {
  async function group(as = token) {
    const members = await Promise.all([
      create({ givenName: 'Achieng', phones: [{ raw: '0712 345 678' }] }, as),
      create(
        { givenName: 'Kiprop', phones: [{ raw: '+254 110 345 678' }] },
        as,
      ),
      create({ givenName: 'Office', phones: [{ raw: '020 234 5678' }] }, as),
      create({ givenName: 'No number' }, as),
    ]);
    const g = await api('post', '/groups', as)
      .send({ name: 'Kasarani Chama', kind: 'chama' })
      .expect(201);
    await api('post', `/groups/${g.body.id}/members`, as)
      .send({ contactIds: members.map((m) => m.body.id as string) })
      .expect(200);
    return g.body.id as string;
  }

  it('quotes recipients, SMS parts and cost', async () => {
    const id = await group();
    const res = await api('post', `/reach/groups/${id}/sms/quote`)
      .send({ message: 'Meeting Saturday 3pm. Contribution KES 500.' })
      .expect(200);
    expect(res.body).toEqual({
      recipients: 2,
      skipped: 2,
      encoding: 'gsm',
      length: 43,
      parts: 1,
      totalParts: 2,
      costCents: 70,
      remaining: 10,
    });
  });

  it('sends to Kenyan mobiles only, records counts, and keeps to the monthly limit', async () => {
    const id = await group();
    const res = await api('post', `/reach/groups/${id}/sms`)
      .send({ message: 'Meeting Saturday 3pm.' })
      .expect(200);
    expect(res.body).toEqual({ recipients: 2, accepted: 2 });
    expect(sms.sent).toEqual([
      {
        to: expect.arrayContaining([
          '+254712345678',
          '+254110345678',
        ]) as string[],
        message: 'Meeting Saturday 3pm.',
      },
    ]);
    const { rows } = await owner.query<{ metadata: object }>(
      "SELECT metadata FROM audit_logs WHERE action = 'group.texted'",
    );
    expect(rows[0].metadata).toEqual({ recipients: 2, accepted: 2, parts: 1 });
    expect(JSON.stringify(rows)).not.toContain('Meeting');

    // 2 used; a 2-part message to 2 people is 4 more (6), then 4 more (10).
    const long = 'x'.repeat(200);
    await api('post', `/reach/groups/${id}/sms`)
      .send({ message: long })
      .expect(200);
    await api('post', `/reach/groups/${id}/sms`)
      .send({ message: long })
      .expect(200);
    const over = await api('post', `/reach/groups/${id}/sms`)
      .send({ message: 'One more' })
      .expect(422);
    expect(over.body.message).toMatch(/0 left this month/);
    expect((await api('get', '/reach/status')).body.sms.usedThisMonth).toBe(10);
  });

  it("cannot text another owner's group", async () => {
    const other = await secondUser();
    const id = await group(other);
    await api('post', `/reach/groups/${id}/sms`)
      .send({ message: 'Hi' })
      .expect(404);
    await api('post', `/reach/groups/${id}/sms/quote`)
      .send({ message: 'Hi' })
      .expect(404);
    expect(sms.sent).toHaveLength(0);
  });
});

describe('QR card', () => {
  it("shows the owner's chosen contact, never someone else's", async () => {
    await api('get', '/reach/card')
      .expect(200)
      .expect((r) => {
        expect(r.body).toEqual({});
      });
    const me = await create({
      givenName: 'Kuria',
      organization: 'Coderiser',
      phones: [{ raw: '0712 000 111', label: 'mobile' }],
      emails: [{ address: 'kuria@example.com' }],
      notes: 'private',
    });
    await api('put', '/reach/card').send({ contactId: me.body.id }).expect(204);
    const card = await api('get', '/reach/card').expect(200);
    expect(card.body).toMatchObject({
      contactId: me.body.id,
      givenName: 'Kuria',
      organization: 'Coderiser',
      phones: [{ e164: '+254712000111', label: 'mobile' }],
      emails: [{ address: 'kuria@example.com' }],
    });
    expect(JSON.stringify(card.body)).not.toContain('private');

    const other = await secondUser();
    await api('put', '/reach/card', other)
      .send({ contactId: me.body.id })
      .expect(404);

    await api('delete', `/contacts/${me.body.id}`).expect(204);
    expect((await api('get', '/reach/card')).body).toEqual({});
  });
});

describe('when not configured', () => {
  it('refuses phone reminders and provider texts, and says so', async () => {
    const { app: plain } = await createTestApp();
    try {
      const srv = plain.getHttpServer() as App;
      const status = await api('get', '/reach/status', token, srv).expect(200);
      expect(status.body.push).toEqual({
        enabled: false,
        publicKey: null,
        devices: 0,
      });
      expect(status.body.sms.enabled).toBe(false);
      await api('post', '/reach/push/devices', token, srv)
        .send(device())
        .expect(403);
      const g = await api('post', '/groups', token, srv)
        .send({ name: 'G' })
        .expect(201);
      await api('post', `/reach/groups/${g.body.id}/sms`, token, srv)
        .send({ message: 'Hi' })
        .expect(403);
    } finally {
      await plain.close();
    }
  });
});
