import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import type { Env } from '../config/env';
import { ENV } from '../config/env.provider';
import { PrismaClient } from '../generated/prisma/client';

/**
 * The one database client the API uses.
 *
 * Connects with DATABASE_URL — the least-privilege app role (ADR 0012) — via
 * the node-postgres driver adapter Prisma 7 requires.
 *
 * It connects LAZILY, on the first query, not at boot. That keeps liveness
 * (`GET /health`) honest: a database outage must not stop the process from
 * starting or make the platform restart a container that is working fine.
 * Readiness (`GET /health/ready`) is where database reachability is reported.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({
      adapter: new PrismaPg({
        connectionString: env.databaseUrl,
        // Fail fast rather than hang a request when the database is down.
        connectionTimeoutMillis: 5_000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
