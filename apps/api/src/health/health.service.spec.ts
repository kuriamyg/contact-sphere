import { Logger } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { HealthService, READINESS_CACHE_MS } from './health.service';

function serviceWith(query: jest.Mock) {
  return new HealthService({ $queryRaw: query } as unknown as PrismaService);
}

describe('HealthService.readiness', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('is ok when the database answers', async () => {
    const svc = serviceWith(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    await expect(svc.readiness(0)).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok' },
    });
  });

  it('is degraded, with one word, when the database fails', async () => {
    const svc = serviceWith(
      jest
        .fn()
        .mockRejectedValue(new Error('connect ECONNREFUSED db.internal')),
    );
    const result = await svc.readiness(0);
    expect(result).toEqual({
      status: 'degraded',
      checks: { database: 'unreachable' },
    });
    expect(JSON.stringify(result)).not.toContain('db.internal');
  });

  it('reuses a result within the cache window, then checks again', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const svc = serviceWith(query);
    await svc.readiness(0);
    await svc.readiness(READINESS_CACHE_MS - 1);
    expect(query).toHaveBeenCalledTimes(1);
    await svc.readiness(READINESS_CACHE_MS);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
