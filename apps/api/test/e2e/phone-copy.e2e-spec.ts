import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';

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

type Method = 'get' | 'post' | 'delete';
const api = (method: Method, url: string) =>
  request(server)
    [method](url)
    .set('x-bff-secret', TEST_SECRET)
    .set('x-client-ip', `198.18.17.${++ip % 250}`)
    .set('authorization', `Session ${token}`);

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
    .set('x-client-ip', `198.18.18.${++ip % 250}`)
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

describe('contacts for the phone (P5c, ADR 0025)', () => {
  it('lists active contacts with numbers in international form, not archived or trashed ones', async () => {
    const mk = async (body: object) =>
      (await api('post', '/contacts').send(body).expect(201)).body.id as string;
    const wanjiru = await mk({
      givenName: 'Wanjiru',
      familyName: 'Kamau',
      organization: 'Kamau Hardware',
      phones: [{ raw: '0712 345 678', label: 'mobile' }],
      emails: [{ address: 'w@example.com' }],
    });
    const archived = await mk({ givenName: 'Archived' });
    const trashed = await mk({ givenName: 'Trashed' });
    await api('post', `/contacts/${archived}/archive`).expect(204);
    await api('delete', `/contacts/${trashed}`).expect(204);

    const res = await api('get', '/contacts/phone-copy').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual([
      {
        id: wanjiru,
        displayName: 'Wanjiru Kamau',
        givenName: 'Wanjiru',
        familyName: 'Kamau',
        organization: 'Kamau Hardware',
        jobTitle: null,
        phones: [{ number: '+254712345678', label: 'mobile' }],
        emails: [{ address: 'w@example.com', label: null }],
      },
    ]);
    const { rows } = await owner.query<{ metadata: object }>(
      "SELECT metadata FROM audit_logs WHERE action = 'contact.exported'",
    );
    expect(rows).toEqual([{ metadata: { count: 1, to: 'phone' } }]);
  });

  it('needs a session', async () => {
    await request(server)
      .get('/contacts/phone-copy')
      .set('x-bff-secret', TEST_SECRET)
      .expect(401);
  });
});
