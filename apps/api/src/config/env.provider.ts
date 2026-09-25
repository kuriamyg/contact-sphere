import { Global, Module } from '@nestjs/common';

import type { Env } from './env';

/** Injection token for the validated environment. */
export const ENV = Symbol('ENV');

/**
 * Makes the validated environment injectable. `main.ts` validates it before
 * the app is built; tests pass their own.
 */
@Global()
@Module({})
export class ConfigModule {
  static forEnv(env: Env) {
    return {
      module: ConfigModule,
      providers: [{ provide: ENV, useValue: env }],
      exports: [ENV],
    };
  }
}
