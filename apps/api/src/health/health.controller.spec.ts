import { HealthController } from './health.controller';
import type { HealthService, Readiness } from './health.service';

function controllerWith(result: Readiness) {
  const service = {
    readiness: jest.fn().mockResolvedValue(result),
  } as unknown as HealthService;
  return new HealthController(service);
}

function fakeResponse() {
  const res = { status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('HealthController', () => {
  it('liveness reports ok and nothing else', () => {
    expect(controllerWith({} as Readiness).live()).toEqual({ status: 'ok' });
  });

  it('readiness answers 200 when the database is reachable', async () => {
    const ok: Readiness = { status: 'ok', checks: { database: 'ok' } };
    const res = fakeResponse();
    await expect(controllerWith(ok).ready(res as never)).resolves.toEqual(ok);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('readiness answers 503 when degraded', async () => {
    const bad: Readiness = {
      status: 'degraded',
      checks: { database: 'unreachable' },
    };
    const res = fakeResponse();
    await controllerWith(bad).ready(res as never);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
