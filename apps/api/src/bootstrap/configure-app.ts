import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import type { Env } from '../config/env';

/**
 * Everything that must be true of the application however it was created.
 *
 * `main.ts` and the e2e tests both call this, so the protections the tests
 * exercise are exactly the ones that ship. A protection added in one place
 * and not the other is one the tests either cannot see or wrongly believe in.
 */
export function configureApp(app: NestExpressApplication, env: Env): void {
  // Behind Render's proxy every request appears to come from the proxy.
  // Trusting exactly N hops lets req.ip be the real caller (needed for rate
  // limiting in Phase 3) without trusting addresses a client made up.
  app.set('trust proxy', env.trustProxyHops);

  // "X-Powered-By: Express" is free reconnaissance and buys nothing.
  app.disable('x-powered-by');

  // Secure headers. This is a JSON API, so the strictest CSP is correct:
  // it never serves HTML that should load anything.
  app.use(
    helmet({
      contentSecurityPolicy: {
        // Only our directives — helmet's defaults are written for HTML sites
        // and would loosen this (script-src 'self', style-src https: ...).
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      hsts: env.nodeEnv === 'production',
    }),
  );

  // The web app is a different origin (Vercel vs Render; :3000 vs :3001
  // locally). Exact allowlist, never a wildcard.
  app.enableCors({
    origin: env.webOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Browsers never call this API (ADR 0006): the web server does,
    // server-to-server, where CORS does not apply. Kept as a strict
    // allowlist as defence in depth; no credentials cross origins.
    credentials: false,
    maxAge: 600,
  });

  // Every request body is validated against its DTO. Unknown fields are
  // refused outright, not silently dropped: an unexpected field is a client
  // bug or a probe, and either way worth a 400.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();
}
