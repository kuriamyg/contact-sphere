# 0008 — Environments and isolation

**Status:** Accepted · 2026-09-25

## Decision

| Environment         | Database                                                                         | Who uses it                    |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| Local unit tests    | none                                                                             | developer, CI                  |
| CI / agent sessions | **disposable** Postgres (GitHub Actions service / local container)               | CI, Claude Code sessions       |
| Local development   | Neon `development` branch, or local Docker Postgres                              | owner's Windows PC             |
| Staging             | Neon `staging` branch + Render `contact-management-api-staging` + Vercel Preview | verification before production |
| Production          | Neon `production` branch + Render `contact-management-api` + Vercel Production   | the owner's real contacts      |

Rules:

1. **No two environments share credentials or a database.** Each Neon branch
   has its own connection string; each Render service has its own.
2. **Destructive test suites (e2e, database tests) never run against Neon.**
   Only against a disposable database created for the run.
3. **Production credentials are never on a laptop or in an agent session.**
4. **Schema before code:** migrations are applied to staging, verified, then
   production — and only then is the dependent code deployed.
5. `docs/operations/environments.md` records the real IDs, verified against
   the provider APIs, not assumed from plans.

## Why

TrustGiving discovered on 2026-09-20 that "staging" and "production" had
been two names for the same database for five weeks; every "staging" test
had run against the real financial record. The fix was separation and
verification. This project starts separated.

## Cost

More configuration (three Neon branches, two Render services, two Vercel
targets), and staging drifts from production over time — reset it from
production when needed (Neon branch reset).
