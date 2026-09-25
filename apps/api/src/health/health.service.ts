import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** One word per dependency — never an error message, which can carry hostnames. */
export type CheckResult = 'ok' | 'unreachable';

export interface Readiness {
  status: 'ok' | 'degraded';
  checks: { database: CheckResult };
}

/**
 * How long a readiness result is reused. The endpoint is public (a monitor has
 * no account), so without a cache anyone holding down refresh could turn it
 * into a database load generator. 5 s is far below any monitor's interval.
 */
export const READINESS_CACHE_MS = 5_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cached?: { at: number; result: Readiness };

  constructor(private readonly prisma: PrismaService) {}

  async readiness(now: number = Date.now()): Promise<Readiness> {
    if (this.cached && now - this.cached.at < READINESS_CACHE_MS) {
      return this.cached.result;
    }
    const database = await this.databaseCheck();
    const result: Readiness = {
      status: database === 'ok' ? 'ok' : 'degraded',
      checks: { database },
    };
    this.cached = { at: now, result };
    return result;
  }

  private async databaseCheck(): Promise<CheckResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (error) {
      // Full detail for whoever is on call; the public response says one word.
      // The error names the host at most — never credentials, never data.
      this.logger.error(`Readiness: database unreachable (${describe(error)})`);
      return 'unreachable';
    }
  }
}

/**
 * Error name plus Prisma/Postgres code (e.g. "P1001", "28P01") — enough to
 * diagnose, and safe to log: codes never contain credentials or row data.
 */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown error';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? `${error.name} ${code}` : error.name;
}
