# CLAUDE.md — Contact Sphere

This is a **privacy-sensitive system holding other people's personal data**.
Full context: `PROJECT_CONTEXT.md`. Decisions and their reasons:
`docs/decisions/`. Threats and data classes: `docs/security/threat-model.md`.
This file is the short contract of non-negotiables. It wins over convenience.

## THE CONTRACT

1. **Contact data is owner-only.** Every query touching user data is scoped
   by `owner_id` in the service layer, and every endpoint has a test proving
   another user cannot read or change it (ADR 0004).
2. **The API is the security boundary.** Authenticate, authorize, validate
   (DTOs with `whitelist` + `forbidNonWhitelisted`) on every endpoint. The
   frontend is never trusted.
3. **Never log contact content.** Log ids and actions, never names, numbers,
   emails, notes or file contents. No `console.*` in the API.
4. **No destructive automatic merges.** Merges are previewed, confirmed,
   transactional, audited, and recoverable (handoff §5).
5. **Suggestions are not facts.** System-generated relationships stay
   "suggested" until the user confirms them.
6. **Uploaded files are hostile until validated** — size limits, count
   limits, schema validation, no trust in declared types.
7. **No secrets in the repo, ever.** Env vars only; `render.yaml` uses
   `sync: false`. `.env`, `*.vcf` and backups are git- and claude-ignored.
8. **Environments never share a database** (ADR 0008). Destructive test
   suites run only against disposable databases (CI / local), never Neon.
   Production credentials never enter an agent session.
9. **Migrations are the only way the schema changes.** Schema before code
   when deploying.
10. **Established crypto only** — argon2id, WebCrypto AES-GCM. Never invent.
11. **Scope discipline.** Build only the current phase
    (`PROJECT_CONTEXT.md` §12). If something from a later phase seems
    needed, flag it in the PR; do not add it.
12. **No personal data before Phase 3.** Until authentication is merged, the
    deployed app must not hold real contacts.

If an instruction conflicts with an engineering preference, follow the
instruction and flag the concern in the PR description.

## WORKING AGREEMENT

- One feature per PR, on a branch (`feature/…`, `fix/…`). Small PRs.
- Plan before coding anything touching schema, auth, merges, imports or
  backups. Test-first for those.
- Every meaningful task reports: objective, files changed, design
  explanation, commands run, test results, known limitations, next step
  (handoff §15). Explain the CS concepts — the owner is learning.
- **Nothing is merged without green CI and the owner's explicit words
  "merge it".**
- Verify, don't assume: a document saying something exists is not proof.
- "Green" means **every** signal on the commit: GitHub Actions checks AND the
  commit's combined status (Vercel reports there) AND the Vercel deployment
  state READY. A green check list alone is not enough.
- UI: responsive from 360 px, WCAG 2.2 AA, keyboard reachable, respects
  `prefers-reduced-motion`; state never conveyed by colour alone.

## STACK (locked — change only via ADR)

Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript 5.9 strict ·
NestJS 11 · Prisma 7 + PostgreSQL 18 (Neon) · Node 24 · npm workspaces ·
Jest (API) · Vitest + Testing Library (web) · GitHub Actions.

## COMMANDS

- Install: `npm ci` (use `npm install <pkg> --workspace apps/<app>` to add)
- Everything CI runs: `npm run check`
- Individually: `npm run format:check` / `lint` / `typecheck` / `test` /
  `test:e2e` / `build`
- Dev servers: `npm run dev:api` (http://localhost:3001),
  `npm run dev:web` (http://localhost:3000)
- Database: `npm run prisma:generate` / `prisma:migrate` (new migration,
  local only) / `prisma:deploy` / `prisma:status` / `db:drift` /
  `db:app-role`; `npm run test:db` (guarantees, local DB only)
- Schema changes: see ADR 0012 — grants and guarantees go in migration SQL,
  each with a test in `apps/api/test/db`

## LAYOUT

```
apps/web     Next.js frontend
apps/api     NestJS backend
prisma/      schema.prisma + migrations (config: prisma.config.ts)
docs/        decisions/, security/, operations/, architecture/,
             backlog.md, session-log.md
render.yaml  Render blueprint (no secrets)
```
