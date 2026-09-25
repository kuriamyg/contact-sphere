# 0003 — Hosting: Vercel + Render + Neon (Frankfurt)

**Status:** Accepted · 2026-09-25 (owner request)

## Decision

| Layer                    | Provider                          | Region                                | Plan                              |
| ------------------------ | --------------------------------- | ------------------------------------- | --------------------------------- |
| Web (Next.js)            | Vercel                            | automatic (edge) + functions near API | Hobby                             |
| API (NestJS)             | Render web service                | Frankfurt                             | **Free** for now (owner decision) |
| Database (PostgreSQL 18) | Neon project `contact-management` | AWS eu-central-1 (Frankfurt)          | Free                              |

## Why

- The same stack as TrustGiving, so every deployment lesson already learnt
  there applies here directly (see its `docs/environments.md`).
- **Frankfurt** is the closest Render region to Kenya, and the Neon project
  is in the same AWS region, so every API→database query stays in one data
  centre instead of crossing a continent.
- The database lives **outside** the Render blueprint. Deleting or
  recreating a Render service can never delete anyone's contacts.

## Cost / known limits

- **Render free plan sleeps after 15 idle minutes**; the first request then
  takes 30–60 s. Acceptable while the app is private and holds no real data.
  Upgrade to `starter` before relying on it daily — the status page already
  says "may be waking up".
- **Neon free plan:** 6 hours of point-in-time restore history, 0.5 GB per
  branch, and only one protected branch per account (already used by
  TrustGiving), so `production` here is not branch-protected. Revisit at
  Phase 10.

## Revisit if

Real data goes in (upgrade Render), the data outgrows the free tier, or a
data-residency requirement appears (Phase 11 legal review).
