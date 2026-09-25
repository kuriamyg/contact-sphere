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
- [ ] CI green on the first PR
- [ ] Render staging + production services created; `/health` verified live
- [ ] Vercel project created; preview shows "API: Online"
- [ ] Branch protection on `main` (require PR + green CI) — owner, GitHub
      settings
- [ ] 2FA enabled on GitHub, Neon, Render, Vercel — owner
- [ ] Owner runs the app on the Windows PC (`npm ci`, both dev servers)

## Phase 2 — Database

- [ ] Prisma 7 + schema for users, contacts, phone_numbers, email_addresses
- [ ] Least-privilege runtime role; owner role for migrations only
- [ ] `DATABASE_URL`/`DIRECT_URL` per environment; pre-flight URL checker
      (port TrustGiving's `scripts/check-database-urls.mjs`)
- [ ] CI Postgres service; migration drift check
- [ ] Session hook starts a disposable local Postgres
- [ ] `GET /health/ready` (readiness, cached, one-word results)
- [ ] Migration deploy workflow: staging first, production with confirmation

## Phase 3 — Authentication (decide ADR 0006 first)

- [ ] BFF proxy, session cookies, argon2id, throttling, owner bootstrap
- [ ] Web Content-Security-Policy with nonces
- [ ] Structured logging with redaction (pino) — never contact content
- [ ] Security tests: unauthenticated, cross-user, session expiry

## Later phases

See `PROJECT_CONTEXT.md` §12. Open evaluation: graph library for Phase 7
(candidates: Cytoscape.js, Sigma.js + Graphology, React Flow — compare on
licence, mobile performance, accessibility, TypeScript support).
