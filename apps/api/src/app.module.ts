import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BffGuard } from './auth/bff.guard';
import { SessionGuard } from './auth/session.guard';
import { ClientIpThrottlerGuard } from './auth/throttler.guard';
import type { Env } from './config/env';
import { ConfigModule } from './config/env.provider';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({})
export class AppModule {
  /**
   * The environment is validated once, before the app is built, and passed
   * in — so tests construct exactly the same module graph with their own
   * configuration.
   */
  static forEnv(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forEnv(env),
        // A generous default for ordinary requests; sensitive endpoints set
        // their own, much stricter limits.
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
        PrismaModule,
        AuditModule,
        HealthModule,
        AuthModule,
      ],
      // Global guards run in this order for EVERY route (ADR 0006):
      // 1. is the caller our web server?  2. rate limit  3. valid session?
      // A route opts out of 1 with @BffExempt (health only) and of 3 with
      // @Public — never silently.
      providers: [
        { provide: APP_GUARD, useClass: BffGuard },
        { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
        { provide: APP_GUARD, useClass: SessionGuard },
      ],
    };
  }
}
