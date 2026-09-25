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
- Owner decisions: name `contact-management`, then `contact-sphere` when the
  owner created the repository (the Neon project was renamed to match); single-user, multi-user-ready;
  Render free plan for now.
- Neon: created project `contact-sphere` (`noisy-base-91471369`,
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

**Next (superseded below).** Owner creates the empty private repo → push → CI → Render and
Vercel → verify live `/health` and "API: Online".

---

## 2026-09-25 — Repository created; made public for CI

- The owner created `kuriamyg/contact-sphere` (the name changed from
  `contact-management`; everything was renamed, including the Neon project).
- PR #1 opened. CI never started: both jobs died in 2–3 s with no runner.
  Cause: the account's GitHub Actions minutes for private repositories are
  exhausted (TrustGiving's CI fails identically the same day). One re-run
  confirmed it.
- Owner decision: make the repository public, since standard GitHub-hosted
  runners are free for public repositories (ADR 0011). Before that, the full
  git history was scanned: no credentials, connection strings or personal
  email in any commit.

---

## 2026-09-25 — Phase 1 merged and deployed

- PR #1 merged on the owner's "merge it" (merge commit `200b91d`) after CI
  passed on GitHub-hosted runners.
- Render: created `contact-sphere-api-staging` (`srv-darbnvhsrm7s73dulcg0`)
  and `contact-sphere-api` (`srv-darbssou01pc73bagk60`, hostname suffixed
  `-js7c`). Staging verified from Render's own deploy status and logs:
  build OK (0 vulnerabilities), "Nest application successfully started",
  `/health` route mapped, service live.
- The agent sandbox cannot reach `*.onrender.com` (egress policy denies it),
  so live HTTP checks are done through Vercel's servers instead.
- Vercel: the connector's token cannot address the team by id (403), but
  its default scope is the team, so the project was created without an
  explicit team id: `contact-sphere` (`prj_Yg9SI4oDlYfQGmzJDrbiCycDU8it`),
  root `apps/web`, Node 24, previews behind Vercel Authentication.

---

## 2026-09-25 — Live verification: Phase 1 shipped

- Vercel production is at `https://contact-sphere-nine.vercel.app`; both
  Render services' `WEB_ORIGIN` updated to it (Render redeployed both).
- Vercel functions pinned to `fra1` (were `iad1`, Washington): every status
  check would otherwise have crossed the Atlantic twice.
- Found: the project's first Vercel build (from a docs branch) was promoted
  to the production domain, likely because a new project promotes its first
  deployment. The `main` build replaced it minutes later. The next branch
  push is checked to confirm branches deploy as previews only.
- **Live smoke test**, run from a Vercel Sandbox in fra1 (this agent's own
  network cannot reach `*.onrender.com` or `*.vercel.app`), with egress
  limited to the three hosts under test:

| Check                                                            | Staging API           | Production API        | Web production |
| ---------------------------------------------------------------- | --------------------- | --------------------- | -------------- |
| `/health`                                                        | 200 `{"status":"ok"}` | 200 `{"status":"ok"}` | —              |
| Page status (web server → Render API)                            | —                     | —                     | **Online**     |
| CSP `default-src 'none'`, HSTS, nosniff                          | yes                   | yes                   | —              |
| CORS: Vercel origin allowed                                      | yes                   | yes                   | —              |
| CORS: `https://evil.example` refused                             | yes                   | yes                   | —              |
| 404 leaks no internals                                           | yes                   | yes                   | —              |
| X-Frame-Options DENY, HSTS, noindex, Referrer/Permissions-Policy | —                     | —                     | yes            |
| robots.txt `Disallow: /`                                         | —                     | —                     | yes            |

**Phase 1 acceptance criteria (PROJECT_CONTEXT §18): met**, except the
owner running the app locally on the Windows PC.

---

## 2026-09-25 — Dependabot tidy-up; Phase 2 merged and deployed

**Dependabot.** #2 and #5 merged; #3 folded into #9; #4 and #6 closed (major
upgrades that failed CI). #9 limits Dependabot to minor/patch (ADR 0002).

**Phase 2** (PR #10, merge `23587ec`), then fix PR #11 (`a3af939`):

- Staging migration succeeded, but `db:app-role` failed on
  `ALTER ROLE … NOSUPERUSER`: Neon's owner is not a superuser, and Postgres
  lets only superusers touch that attribute, even to restate the default.
  Fixed by _verifying_ the role's attributes and memberships instead.
- **Near miss:** this shared agent environment carries TrustGiving's
  `DIRECT_URL`/`DATABASE_URL`. A local test command fell back to them and
  tried to connect to TrustGiving's Neon database; the network blocked it
  (timeout on every address), so no connection was made. The script now
  refuses any database without this project's first migration, and every
  agent command clears both variables first.
- Postgres 16+ lists one membership per grantor; the check uses DISTINCT.

**Deployment**, from a Vercel Sandbox in fra1 (this agent cannot reach
Neon or Render), each step on staging first, then production:

1. `prisma migrate deploy` (owner, direct host, `sslmode=verify-full`):
   applied; `migrate status` up to date; drift check clean.
2. `db:app-role`: `contact_sphere_app` created with a distinct random
   password per environment; verified no dangerous attributes, member of
   `app_runtime` only.
3. Render `DATABASE_URL` set (app role, pooled host, `verify-full`); Render
   redeployed `a3af939`; both deploys live.

**Verified live** (from the sandbox):

| Check                                      | Staging            | Production         |
| ------------------------------------------ | ------------------ | ------------------ |
| `/health`                                  | 200 ok             | 200 ok             |
| `/health/ready`                            | 200 `database: ok` | 200 `database: ok` |
| API CSP / CORS allowed / CORS evil refused | yes / yes / yes    | yes / yes / yes    |
| As the live app role on Neon: CREATE TABLE | refused 42501      | refused 42501      |
| UPDATE / DELETE `audit_logs`               | refused 42501      | refused 42501      |
| Read `_prisma_migrations`                  | refused 42501      | refused 42501      |
| `users` rows                               | 0                  | 0                  |

Web production page: **Online**.

**Credentials hygiene.** The Neon owner password and both app-role
passwords passed through this agent session. The owner should reset the
owner password on all three branches in the Neon console (tools would echo
a new one back into the session). App-role passwords can be rotated any
time with `db:app-role` + Render (docs/operations/database-roles.md).

**Phase 2 acceptance: met.**

---

## 2026-09-25 — Correction: Vercel deployments were failing since Phase 2

The owner spotted a red status on GitHub. GitHub Actions was green on every
current commit, but the **Vercel** commit status had been red since PR #10:
every Vercel deployment (previews and production) failed at `npm install`
with exit 127, `sh: prisma: not found`.

- **Cause:** Phase 2 added a root `postinstall: prisma generate`. Vercel runs
  `npm install` from `apps/web` (the project's root directory), where the
  Prisma CLI is not available to that script. CI installs differently
  (`npm ci` at the repository root), so CI never saw it. Reproduced exactly
  in a fresh clone.
- **Impact:** production kept serving the last good build (PR #9). The web
  code did not change in Phase 2, so what users saw was identical, but the
  "web production page: Online" check in the Phase 2 entry above was
  answered by that older build — not proof that Phase 2's web build
  deployed. The API and database verification stand.
- **How it was missed:** the check I read was "Vercel Preview Comments"
  (green); the deployment itself reports as a separate commit status.
- **Fix:** no root postinstall; the API generates its Prisma client in its
  own pre-hooks (`prebuild`, `pretest`, …). New CI job **"Web builds the way
  Vercel builds it"** runs `npm install` + `next build` from `apps/web`.
- **Process change:** a deployment is verified by the Vercel deployment's
  own state (READY) and the commit's combined status, not by a check name.

---

## 2026-09-25 — Phase 3 merged and deployed

PR #13 (`6dc2fa9`), after merging `main` (the Vercel fix, #14) into it and
re-running everything: all signals green on the head, **including the
Vercel deployment status**.

**Order used:** secrets on Vercel (Preview + Production, sensitive) → merge
(Vercel production deployed READY) → migrate staging and production
(`auth_sessions`, no drift) → Render secrets (triggers the API deploys:
staging, then production).

Deviation: both databases were migrated in one command rather than staging
→ verify → production. Low risk (additive, empty tables, proven in CI and
locally), but not the documented order; future migrations keep the order.

**Staging, live (16/16), from a Vercel Sandbox in fra1:** readiness ok; no
secret → 403; wrong secret → 403; setup available → wrong token 401 →
setup creates a staging-only test owner → `/auth/me` → second setup 409 →
setup closed; wrong password and unknown email give the same 401; login;
extra field 400; forged token 401; sign out everywhere ends the other
session; per-IP rate limit 401×5 then 429.

**Production, live (14/14):** readiness ok; no secret → 403; setup
available (no owner yet); wrong setup token 401; forged session 401; web
`/login` 200 with per-request nonce CSP (nonce differs per request, scripts
carry it); X-Frame-Options DENY + HSTS; the login page offers owner setup,
proving web → API works through the shared secret; signed-out `/account`
→ 307 `/login`; `/setup` open; home "Online".

The full browser flow (18/18: setup, cookie flags, cookie unreadable by
JavaScript, password change signing out another device, sign out,
sign out everywhere, 360 px, zero CSP violations) ran against the same
commit locally; the owner's own production setup is the final live step.
