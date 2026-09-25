# Session log

Chronological record of what was done and **how it was verified**. Newest
last. The distilled "why" lives in `docs/decisions/`.

---

## 2026-09-25 — Phase 0 and Phase 1 foundation

**Objective.** Turn the v1.0 handoff into a verified foundation, following
TrustGiving's discipline.

**Done.**

- Reviewed the handoff; found 12 gaps (PROJECT_CONTEXT §22) and wrote ADRs
  0001–0010, the threat model, environment and deployment docs.
- Owner decisions: name `contact-management`; single-user, multi-user-ready;
  Render free plan for now.
- Neon: created project `contact-management` (`noisy-base-91471369`,
  eu-central-1, Postgres 18) with branches `production`, `staging`,
  `development`. Verified with the Neon API (list_branches). Protecting
  `production` was refused: the free plan's one protected branch is used by
  TrustGiving.
- Built the Phase 1 monorepo (Node 24.21, npm 11.19, Nest 11, Next 16.3.6,
  TypeScript 5.9.3).
- npm 11 blocked two install scripts (`@parcel/watcher`, `unrs-resolver`);
  both ship prebuilt binaries, so both are denied in `package.json`
  `allowScripts`.

**Verified.**

- `npm run check`: formatting, lint, typecheck, 13 API unit tests, 6 API e2e
  tests, 9 web tests, both builds — all pass.
- `npm audit`: 0 vulnerabilities.
- Manual smoke test with both production builds running: `/health` returns
  `{"status":"ok"}` with CSP `default-src 'none';frame-ancestors 'none'`;
  the web page streams "Online"; with the API stopped it shows
  "Unreachable (may be waking up)"; web responses carry `X-Frame-Options:
DENY` and `X-Robots-Tag: noindex, nofollow`; the API refuses to boot in
  production without `WEB_ORIGIN`.

**Blocked.** GitHub refused to create the repository from this session
(403 — the Claude GitHub App cannot create repositories). Render and Vercel
deploy from GitHub, so they wait for the repository too.

**Next.** Owner creates the empty private repo → push → CI → Render and
Vercel → verify live `/health` and "API: Online".
