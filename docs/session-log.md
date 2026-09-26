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

---

## 2026-09-26 — Two-factor sign-in (PR #16) deployed and verified

PR #16 (`f24c073`) on `main`: every signal green (verify, Vercel-parity
build, dependency audit, Vercel status) and the Vercel production
deployment READY.

**Order used:** `TOTP_ENCRYPTION_KEY` on both Render services (a
different key per environment) → merge → migrate **staging**
(`totp_two_factor`, no drift) → staging API live → verify staging →
migrate **production** (no drift, 3/3 migrations) → production API deploy
→ verify production. This time staging went first, as the documented order
requires.

**Staging, live (14/14), from a Vercel Sandbox in fra1**, against a
staging-only test owner: setup; TOTP enrolment returns a secret and
`otpauth://` URI; the secret is stored as a `v1:` AES-256-GCM envelope and
the plaintext does not appear in the database; a wrong enable code gives 400;
enabling returns 10 recovery codes; `/auth/me` reports `totpEnabled`; a
password-only sign-in returns `mfaRequired` and no session; a wrong code
gives 401; a right code (next time step) gives a session; the same code
replayed on a fresh challenge gives 401; a recovery code signs in once, and
the second use gives 401; recovery codes are stored only as SHA-256 hashes;
disabling with a wrong password gives 401.

**Production, live, read-only (10/10):** health 200; readiness ok
(database ok); no BFF secret → 403; no session → 401 on `/auth/me` and
`/auth/totp/setup`; unknown MFA challenge → 401; setup still available
(the owner has not set up yet); web `/login` 200 with per-request nonce CSP,
HSTS and X-Frame-Options DENY; `/login/verify` with no challenge cookie →
307 `/login`; signed-out `/account` → 307 `/login`.

---

## 2026-09-26 — Two-factor crash fixed (PR #18); Phase 4a deployed

**PR #18.** The owner's first production enrolment crashed to "This page
couldn't load": when the web server could not get an answer from the API,
`api()` threw inside a Server Action. Reproduced locally; fixed so forms
say "unavailable, try again" and keep their state, an unreachable API no
longer looks like "signed out", and time limits are explicit (50 s / 60 s).
The owner then enrolled two-factor successfully. Owner setup is closed
(setup reports unavailable; the real token gets 409).

**Phase 4a (PR #19, `2b49a22`).** ADRs 0005, 0007, 0010 accepted. Migration
`contacts` applied to **staging first** (no drift), staging API deployed,
then **22/22 live checks** against it (create with E.164 + unparsed
number, five search forms, A–Z with accents, last used, save replaces
lists, archive, trash with purge date, no edit in trash, restore, delete
for good with cascade, other owner sees nothing and gets 404, no session
401, audit without content). Then production migrated (no drift), API
deployed, read-only checks: readiness ok, contacts refuse no-BFF (403),
no/forged session (401); in the database, 12 CHECK constraints, both
composite owner FKs, app role may manage contacts and still may not
UPDATE the audit log.

**Phase 4b (PR #20, `4685a51`).** Web on Vercel (READY); API to staging
(5/5: non-v7 id → 404, malformed → 400, 150 requests/min served, sign-in
still 429 after 5) then production (readiness, 403/401 refusals, 130/130
ordinary requests served, setup still closed). Signed-out production pages
all redirect to sign-in.

---

## 2026-09-26 — Phase 5a and 6a deployed; Phase 5b built

**Phase 5a (PR #21, `e7c56f0`).** Import/export `.vcf` live; the owner
imported their phone's contacts and exported them back.

**Phase 6a (PR #22, `2526a5d`).** Migration `user_display_name` applied to
staging, then production, with no drift; both APIs deployed. Production,
read-only: readiness ok; `/auth/profile` and `/contacts/stats` refuse
no-BFF (403) and forged sessions (401); setup still closed; signed-out
`/account`, `/contacts`, `/contacts/import` redirect to sign-in; the
`display:none` CSP hash is served.

**Phase 5b.** Duplicate review and safe merge: migration
`duplicates_and_merges` (dismissed pairs; merge records holding a snapshot
of the kept contact, for undo). CHECKs: pair ordered, two different
contacts, snapshot is an object, undone after created. Tests: unit (pair
finding, merge rules), e2e (merge, conflicts, undo, dismiss, other owner
404, trashed 409), database guarantees; browser flow 27/27 at phone size,
360 px, no CSP violations.

**Phase 5b deployed (PR #23, `cd03ca9`).** Migration `duplicates_and_merges`
applied to staging (no drift); staging API deployed; **22/22 live checks**
(pairs with reasons, preview changes nothing, merge keeps everything,
trash, undo restores exactly, second undo 409, dismiss, 400/401/403/404,
audit ids only, 4 CHECKs, app-role grants; test data removed with
`DELETE FROM users`, audit log kept). Production migrated (no drift), API
deployed, read-only **13/13**: readiness, the four new routes refuse
no-BFF (403) and forged sessions (401), signed-out `/contacts/duplicates`
redirects to sign-in, CHECKs and grants present, the owner's 464 contacts
untouched.

## 2026-09-26 — Phase 7a: know who

Tags (skills and services), area and met-through on contacts; word search
over one API-maintained folded column, backfilled in the migration for
existing contacts. Tests: unit (tag normalising, folding, words), e2e
(search table, tag filter, tag counts without trash, limits, owner
isolation), database CHECKs; browser flow 17/17 at phone size and 360 px.

**Phase 7a deployed (PR #24, `c4776c0`).** Migration `know_who` applied to
staging and production before merging (additive; no drift on either), then
both APIs deployed together with the web. Backfill re-run for rows written
by the old API in between: 0. Staging **16/16** live (tidied tags, nine
searches incl. accents and numbers, tag filter, counts, limits, 401, folded
search text, 6 CHECKs). Production read-only **7/7**: readiness, 403/401
refusals, signed-out redirect, all 464 contacts have search text, CHECKs.

## 2026-09-26 — Phase 7b: skills everywhere, saved searches

Rename/delete a tag across contacts; saved searches (migration
`saved_searches`); .vcf CATEGORIES import (system groups skipped) and
export. Tests: unit (CATEGORIES parsing, round trip), e2e (rename merges,
delete keeps contacts, saved searches follow, 50 limit, owner isolation,
import/export groups), database CHECKs; browser flow 14/14.

**Phase 7b deployed (PR #25, `f2adb20`).** Migration `saved_searches`
applied to staging and production before merging (no drift); both APIs
deployed with the web. Staging **18/18** live (groups → tags without
system groups, saved searches, rename keeps "edited" and follows saved
searches, delete keeps contacts, 404/401/409, CATEGORIES export, audit
without tag names, CHECKs, grants). Production read-only **12/12**.

## 2026-09-26 — Phase 8: communities

Groups with kinds and roles (migration `communities`). Tests: e2e (CRUD,
same-name 409, roles and ordering, trash hides and restore returns,
contact's groups, .vcf export, owner isolation, audit ids/counts only),
database guarantees (kinds, unique names, no cross-owner members, roles
lower-case, cascade); browser flow 25/25 incl. SMS link, clipboard,
download, 360 px.

**Phase 8 deployed (PR #26, `7fc83f6`).** Migration `communities` applied
to staging and production before merging (no drift); both APIs deployed.
Staging **17/17** live; production read-only **9/9** (403/401 refusals,
signed-out redirects, 6 CHECKs, grants, 464 contacts untouched).

## 2026-09-26 — Phase 9: Today

Keep-in-touch cadences, follow-ups and the Today screen (migration
`remember`). Tests: unit (Nairobi day, birthdays incl. 29 Feb, overdue
maths), e2e (birthdays window and archived excluded, cadences and
"contacted" not an edit, follow-ups window/done/delete, bad dates, trash,
owner isolation, audit without notes), database CHECKs; browser flow
20/20. Found and fixed before shipping: at 412 px the header (now with
Today) overflowed; the app name now shows from 640 px, and the browser
flow checks 412 px too.

**Phase 9 deployed (PR #27, `0a9d042`).** Migration `remember` applied to
staging and production before merging (no drift); both APIs deployed.
Staging **17/17** live; production read-only **7/7**.

## 2026-09-26 — Phase 10a: installable

Web-only change (no API or database change). Manifest, icons (rendered
with Chromium), offline-page service worker, install help. Browser flow
16/16 including a real offline test: only `/offline` and one icon are
ever cached; signed-in pages are never stored.
