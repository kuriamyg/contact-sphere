import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { LOGIN_FAILURE_WINDOW_MS, LOGIN_FAILURES_MAX } from './auth.constants';

const WINDOW_SECONDS = LOGIN_FAILURE_WINDOW_MS / 1000;

/**
 * Per-account failed-login counter, on top of the per-IP rate limit: an
 * attacker rotating IP addresses still cannot make more than
 * LOGIN_FAILURES_MAX guesses against one account per window.
 *
 * In the database (A5), so a restart or a second instance does not reset
 * it. One row per key: a fixed window that starts at the first failure and
 * is replaced by a new one after LOGIN_FAILURE_WINDOW_MS. Keys are hashed
 * emails, so the table holds no email in readable form.
 */
@Injectable()
export class LoginFailures {
  constructor(private readonly prisma: PrismaService) {}

  async isLocked(key: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT failures >= ${LOGIN_FAILURES_MAX} AS locked
      FROM login_failures
      WHERE key_hash = ${key}
        AND window_started_at > now() - make_interval(secs => ${WINDOW_SECONDS})`;
    return rows[0]?.locked ?? false;
  }

  /** One more failure; atomic, so parallel guesses all count. */
  async record(key: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO login_failures (key_hash, failures, window_started_at)
      VALUES (${key}, 1, now())
      ON CONFLICT (key_hash) DO UPDATE SET
        failures = CASE
          WHEN login_failures.window_started_at <= now() - make_interval(secs => ${WINDOW_SECONDS})
          THEN 1 ELSE LEAST(login_failures.failures + 1, 10000) END,
        window_started_at = CASE
          WHEN login_failures.window_started_at <= now() - make_interval(secs => ${WINDOW_SECONDS})
          THEN now() ELSE login_failures.window_started_at END`;
    // Old windows mean nothing; keep the table small.
    await this.prisma.$executeRaw`
      DELETE FROM login_failures
      WHERE window_started_at < now() - interval '1 day'`;
  }

  async clear(key: string): Promise<void> {
    await this.prisma.loginFailure.deleteMany({ where: { keyHash: key } });
  }
}
