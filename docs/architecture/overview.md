# Architecture overview

```text
 Android phone / Windows PC (browser)
            │  HTTPS
            ▼
 ┌──────────────────────────┐        ┌───────────────────────────┐
 │ Vercel — apps/web        │ HTTPS  │ Render (Frankfurt)        │
 │ Next.js 16 (App Router)  │───────▶│ apps/api — NestJS 11      │
 │ UI, forms, map, BFF      │        │ auth, rules, validation,  │
 │ proxy (Phase 3)          │        │ VCF, merges, audit        │
 └──────────────────────────┘        └─────────────┬─────────────┘
                                                   │ TLS, Prisma (Phase 2)
                                                   ▼
                                     ┌───────────────────────────┐
                                     │ Neon Postgres 18          │
                                     │ AWS eu-central-1          │
                                     │ branches: production,     │
                                     │ staging, development      │
                                     └───────────────────────────┘
```

## Responsibilities

- **Web** renders UI and never makes a security decision. Hiding a button is
  UX, not access control.
- **API** is the security boundary: every request is authenticated,
  authorized against `owner_id`, and validated before any business logic.
- **Database** guarantees what must hold absolutely — foreign keys, unique
  constraints, transactions — because a future script or bug can bypass the
  API but not Postgres.

## Request path today (Phase 1)

`GET /` on the web app → the Next.js server calls `GET {API_URL}/health`
with a 5 s timeout → the page streams "Online", "Unreachable" or "Not
configured". The browser never contacts the API directly yet.

## Code layout

```text
apps/api/src/
  main.ts                 boot: validate env, create app, listen
  bootstrap/configure-app  every security setting, shared with e2e tests
  config/env.ts           the only place process.env is read
  health/                 GET /health (liveness)
apps/web/src/
  app/                    routes (App Router)
  components/             UI components
  lib/                    non-UI logic (e.g. api-health)
```
