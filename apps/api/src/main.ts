import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Validate configuration before constructing anything: a bad deployment
  // should fail here, loudly, naming the variable.
  const env = loadEnv();

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forEnv(env),
  );
  configureApp(app, env);

  // 0.0.0.0 so Render's router can reach the process inside its container.
  await app.listen(env.port, '0.0.0.0');
}

void bootstrap();
