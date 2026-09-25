import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestApp } from '../support/test-app';

describe('health endpoints (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 {status: ok}', async () => {
    const res = await request(server).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready reports the database reachable', async () => {
    const res = await request(server).get('/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('does not advertise the framework', async () => {
    const res = await request(server).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends secure headers', async () => {
    const res = await request(server).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
  });

  it('allows the configured web origin', async () => {
    const res = await request(server)
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });

  it('does not grant CORS to an unknown origin', async () => {
    const res = await request(server)
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 404 for unknown routes, leaking nothing', async () => {
    const res = await request(server).get('/does-not-exist').expect(404);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules/i);
  });
});
