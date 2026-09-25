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
- [ ] Staging + production migrated, app roles created, Render
      `DATABASE_URL` set, `/health/ready` verified live
- [ ] GitHub Environments `staging`/`production` with a `DIRECT_URL` secret
      (owner), needed for the Deploy migrations workflow — owner action

## Phase 3 — Authentication (decide ADR 0006 first)

- [ ] BFF proxy, session cookies, argon2id, throttling, owner bootstrap
- [ ] Web Content-Security-Policy with nonces
- [ ] Structured logging with redaction (pino) — never contact content
- [ ] Security tests: unauthenticated, cross-user, session expiry

## Later phases

See `PROJECT_CONTEXT.md` §12. Open evaluation: graph library for Phase 7
(candidates: Cytoscape.js, Sigma.js + Graphology, React Flow — compare on
licence, mobile performance, accessibility, TypeScript support).
