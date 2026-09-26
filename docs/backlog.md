# Backlog

Checked items are **verified**, not just written. Unchecked items are open.
Carried over from `PROJECT_CONTEXT.md` §13 and extended by the gap analysis
(§22).

## Phase 0 — Planning

- [x] Handoff reviewed; gap analysis (PROJECT_CONTEXT §22)
- [x] Project and repository name — `contact-sphere`
- [x] ADRs 0001–0010 (accepted and proposed)
- [x] Threat model and data classification
- [x] Environment plan; Neon project with three branches (verified via API)

## Phase 1 — Foundation

- [x] Monorepo (npm workspaces), Node 24, TypeScript strict
- [x] NestJS API with validated env and `GET /health`
- [x] Next.js web app with a basic page that checks the API
- [x] Prettier, ESLint, typecheck, unit + e2e tests — pass locally
- [x] Security headers (API + web), CORS allowlist, noindex
- [x] `.env.example`, README (incl. Windows), CONTRIBUTING, SECURITY
- [x] CI workflow, Dependabot, PR template
- [x] GitHub repository `kuriamyg/contact-sphere` created by the owner
- [ ] Repository made public (owner, for free GitHub Actions minutes — ADR 0011)
- [ ] Secret scanning, push protection and private vulnerability reporting
      enabled (owner, GitHub → Settings → Code security)
- [x] CI green on the first PR (after the repository was made public)
- [x] Render staging + production services created and live (verified via Render deploy status and logs)
- [ ] Render health check path `/health` set on both services (dashboard only)
- [x] Vercel project created, linked to the repo, `API_URL` per target
- [x] Vercel production shows "API: Online" (live smoke test, see session log)
- [ ] Branch protection on `main` (require PR + green CI) — owner, GitHub
      settings
- [ ] 2FA enabled on GitHub, Neon, Render, Vercel — owner
- [x] Dependabot PRs: #2, #5 merged; #3 folded into the dependency-policy PR; #4, #6 closed (major upgrades, see ADR 0002)
- [ ] Planned majors, each its own PR when the ecosystem supports it: NestJS 12, TypeScript 7, ESLint 10
- [ ] Owner runs the app on the Windows PC (`npm ci`, both dev servers)

## Phase 2 — Database

- [x] Prisma 7 + initial schema: `users`, `audit_logs` (contact tables are
      Phase 4, after ADRs 0005/0007/0010 — ADR 0012)
- [x] Least-privilege runtime role (`app_runtime` / `contact_sphere_app`);
      owner for migrations only; append-only audit log; guarantee tests
- [x] Pre-flight URL checker (ported from TrustGiving)
- [x] CI Postgres 18 service; tests run as the app role; drift check
- [x] Session hook starts a disposable local Postgres
- [x] `GET /health/ready` (readiness, cached, one-word results)
- [x] Migration deploy workflow: staging first, production with confirmation
- [x] Seed strategy: none. Tests create synthetic rows; no environment is
      ever seeded with personal data
- [x] Staging + production migrated, app roles created, Render
      `DATABASE_URL` set, `/health/ready` verified live (session log)
- [ ] Rotate the Neon owner password on all three branches (it passed
      through the agent session during setup) — owner, Neon console
- [ ] GitHub Environments `staging`/`production` with a `DIRECT_URL` secret
      (owner), needed for the Deploy migrations workflow — owner action

## Phase 3 — Authentication (ADR 0006)

- [x] BFF: web server calls the API with a shared secret; browsers never do
- [x] argon2id passwords, policy; DB refuses non-argon2id hashes
- [x] Sessions hashed in Postgres; HttpOnly `__Host-` cookie; idle/absolute
      expiry; sign out; sign out everywhere; password change ends others
- [x] Per-IP and per-account brute-force limits; uniform login errors
- [x] One-time owner setup (setup token, advisory lock)
- [x] Web CSP with per-request nonces
- [x] Audit entries for every auth event (no emails)
- [x] Tests: unit, DB guarantees, API e2e, real-browser flow
- [x] Deployed: staging (16/16 live checks) and production (14/14)
- [ ] Owner creates the production account; then remove `SETUP_TOKEN`
- [x] TOTP two-factor (ADR 0013): encrypted secret, single-use codes,
      recovery codes, challenge step; enable/disable from Account
- [ ] Breached-password check; device/session list
- [ ] Move the per-account failure counter out of memory before scaling out
- [ ] Structured logging with redaction (pino) — never contact content

## Phase 4 — Contacts (ADRs 0005, 0007, 0010 accepted)

- [x] Schema: contacts, phone numbers (raw + E.164), emails; owner on every
      row, composite FKs, CHECKs, cascade; migration with grants
- [x] API: create, view, edit, archive, trash, restore, delete for good,
      empty trash; 30-day purge; search (names, org, email, phone digits);
      sort by name / date saved / last used; pagination; audit by id only
- [x] Tests: unit (phones, names), DB guarantees as the app role, API e2e
      including cross-owner isolation
- [x] Deployed 4a: staging (22/22 live checks) then production (read-only
      checks; schema, grants and constraints verified)
- [x] Web: list, search, sort, pages; detail with call/SMS/WhatsApp/email;
      create and edit (refused forms keep what was typed); archive, trash,
      restore, delete for good, empty trash (Phase 4b)
- [x] Browser flow (41 checks, phone size) and 360 px layout checks
- [ ] Account deletion (ADR 0005 §4) — with Settings, later

## Phase 5 — VCF and duplicates

- [x] 5a: .vcf import (vCard 2.1/3.0/4.0; quoted-printable, folded lines,
      Apple labels, tel: URIs), preview before saving, exact repeats
      skipped (idempotent), photos stripped in the browser, up to 5,000
      contacts per file; .vcf export (vCard 3.0) of everything not in the
      trash; audit with counts only
- [x] 5b: duplicate candidates with reasons (same number, same email, same
      name, similar name; shared lines ignored), review screen with
      per-field choices, safe merge (choose survivor, union of numbers and
      emails, notes joined, one transaction, audit with ids only, merged
      contact to the trash), undo for 30 days from a snapshot, "not the
      same person" remembered

## Phase 7 — Know who

- [x] 7a: skills/services tags (normalised, ≤ 20, CHECKs), area, met
      through; word search across names, organisation, job, area,
      met-through, tags, notes and emails (every word must match, accents
      folded, `search_text` maintained by the API and backfilled); tag
      filter and tag list with counts; merge keeps tags, area, met-through
- [x] 7b: saved searches (≤ 50, CHECKs, follow tag renames/deletes);
      tags from .vcf CATEGORIES (system groups skipped) and exported as
      CATEGORIES; rename or delete a tag everywhere (one transaction,
      audited with counts, "edited" date untouched)

## Phase 8 — Communities

- [x] Groups (kind, notes; unique name per owner) and members with roles
      (migration `communities`: composite owner FKs, CHECKs, grants);
      officials first; trashed contacts hidden and back on restore
- [x] Group page: SMS everyone, copy numbers for WhatsApp, per-member
      call/WhatsApp, .vcf export; add from a picker or a contact's page
- [ ] Later: free-plan limit (3 groups) with billing (Phase 12); shared,
      consented member directories (Community plan)

## Phase 9 — Remember

- [x] Keep-in-touch cadences (7…365 days, CHECK) and "in touch today"
      (not an edit; never from call logs); follow-ups (dated note, done
      kept); Today: follow-ups due within 7 days, overdue keep-in-touch,
      birthdays within 14 days (29 Feb → 28 Feb); Nairobi days
- [ ] Reminders sent by email/WhatsApp/SMS (Phase 11 channels);
      anniversaries and other dates

## Phase 6a — Profile and polish

- [x] Owner display name (migration, CHECK never blank), `POST /auth/profile`
- [x] Profile page: avatar ring, stats, personal details, security, data,
      sign out / sign out everywhere; header avatar
- [x] Contact avatars, A–Z sections, one-tap actions with icons
- [x] CSP: allow exactly `display:none` (React streaming) via hash
- [x] Strategy and re-ordered roadmap: docs/product/strategy.md

## Later phases

See `docs/product/strategy.md` §7 for the current order.

See `PROJECT_CONTEXT.md` §12. Open evaluation: graph library for Phase 7
(candidates: Cytoscape.js, Sigma.js + Graphology, React Flow — compare on
licence, mobile performance, accessibility, TypeScript support).
