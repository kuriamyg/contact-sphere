# Changelog

All notable changes. Format: [Keep a Changelog](https://keepachangelog.com);
versioning: [SemVer](https://semver.org) once the first release is cut.

## [Unreleased]

### Added — Phase 2 (database)

- Prisma 7 with the pg driver adapter; `users` and append-only
  `audit_logs`; least-privilege `app_runtime` role (ADR 0012).
- Database guarantee tests run as the app role against real Postgres; a
  guard refuses non-local databases.
- `GET /health/ready`; `DATABASE_URL` validated at boot (TLS required in
  production).
- CI: Postgres 18 service, migrations, drift check. Manual
  "Deploy migrations" workflow. Session hook starts a local Postgres.
- Dependabot limited to minor/patch updates (majors by hand, ADR 0002).

### Added — Phase 1 (foundation)

- npm-workspaces monorepo: `apps/api` (NestJS 11), `apps/web` (Next.js 16).
- API: validated environment config, `GET /health`, strict security
  headers, exact-origin CORS allowlist, proxy-hop trust setting.
- Web: status page that checks the API server-side; security headers;
  noindex/robots; reduced-motion and skip-link accessibility basics.
- Tests: API unit + e2e (Jest/Supertest), web unit (Vitest).
- CI: format, lint, typecheck, tests, build; production `npm audit`.
- Dependabot, PR template, Render blueprint, Claude Code session hook.

### Added — Phase 0 (planning)

- `PROJECT_CONTEXT.md` v1.1 with gap analysis; ADRs 0001–0010; threat
  model; environments and deployment docs; backlog; session log.
- Neon project `contact-sphere` with production/staging/development
  branches.
