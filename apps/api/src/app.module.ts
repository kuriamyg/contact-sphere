import { type DynamicModule, Module } from '@nestjs/common';

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
      imports: [ConfigModule.forEnv(env), PrismaModule, HealthModule],
    };
  }
}
