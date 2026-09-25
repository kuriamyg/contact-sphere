import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap/configure-app';
import { loadEnv } from '../../src/config/env';

describe('GET /health (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(
      app,
      loadEnv({ NODE_ENV: 'test', WEB_ORIGIN: 'http://localhost:3000' }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 {status: ok}', async () => {
    const res = await request(server).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
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

  it('returns 404 for unknown routes without leaking internals', async () => {
    const res = await request(server).get('/does-not-exist').expect(404);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules/i);
  });
});
