# Contact Sphere Platform — Project Context

**Version:** 1.1.0  
**Date:** 2026-09-25  
**Status:** Phase 1 — Foundation (in review)  
**Purpose:** Authoritative handoff document for human developers and AI coding agents.

## 1. Project vision

Build a privacy-first, private online contact management platform usable from Android phones and Windows PCs. It must provide reliable contact organization, search, duplicate detection, safe merging, relationship management, groups, visual relationship mapping, VCF import/export, and encrypted local backups. The architecture should support future commercialization without selling or exposing users' contact data.

The project owner is a beginner in this specific workflow and wants every major implementation explained as a computer science learning exercise.

## 2. Confirmed preferences and decisions

| Area                  | Decision                                                          |
| --------------------- | ----------------------------------------------------------------- |
| Platform              | Private online web application                                    |
| Frontend              | Next.js                                                           |
| Backend               | NestJS                                                            |
| Language              | TypeScript                                                        |
| Database              | PostgreSQL                                                        |
| ORM                   | Prisma                                                            |
| Styling               | Tailwind CSS                                                      |
| Devices               | Android phone and Windows PC                                      |
| Development computer  | Windows PC                                                        |
| Initial workflow      | Local development first, then private deployment                  |
| Experience            | Beginner-friendly, detailed explanations                          |
| UI                    | Premium, responsive, accessible, animated where useful            |
| Sorting               | Alphabetical, date saved, last used                               |
| Search                | Name and phone number                                             |
| Duplicates            | Detection, review, safe merge, conflict resolution                |
| Relationships         | Family, friendship, work, business, church, community             |
| Relationship approach | Manual relationships plus system suggestions                      |
| Visualization         | Interactive relationship map plus accessible list alternative     |
| Data exchange         | VCF import and export                                             |
| Backup                | Encrypted local backup                                            |
| Engineering           | Git, code review, automated tests, CI/CD, security, documentation |
| Future direction      | Potential monetization after validation                           |

## 3. Important privacy principles

- Contact data is private by default.
- Authentication and backend authorization are mandatory.
- Use HTTPS in deployed environments.
- Never commit secrets or `.env` files.
- Do not expose the database directly to the public internet.
- Do not sell contact data or use it for advertising.
- Avoid logging contact contents and other sensitive personal information.
- Provide export, deletion, and backup controls.
- Use secure password hashing and secure session/token handling.
- Validate all user input and uploaded files.
- Use least privilege for application, database, and CI/CD credentials.
- Be honest: no online system can guarantee absolute security.
- Review applicable privacy and legal requirements before commercial release.

## 4. Proposed repository structure

```text
contact-sphere/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
├── packages/                # Optional shared types/validation/config
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── security/
│   └── operations/
├── scripts/
├── .github/workflows/
├── .env.example
├── .gitignore
├── README.md
├── PROJECT_CONTEXT.md
├── CONTRIBUTING.md
├── SECURITY.md
└── CHANGELOG.md
```

The structure may change only with an explained and documented decision.

## 5. Functional requirements

### Contacts

Support creating, viewing, editing, archiving/deleting, searching, and exporting contacts. Store names, display name, phone numbers, optional emails, notes, organization information, creation date, update date, and a clearly defined last-interacted timestamp.

### Sorting

Support ascending and descending sorting by:

- Alphabetical name.
- Date saved.
- Last used.

The first version should define “last used” as the last interaction inside the application, such as opening a profile, unless a better verified source is available. Do not assume access to device call history.

### Search

Support case-insensitive partial search by name and phone number. Normalize phone-number matching appropriately. Include loading, empty, and no-results states.

### Duplicate detection and merging

Detect possible duplicates using explainable signals such as normalized phone number, email, similar name, and matching details. Show reasons and confidence where useful. Never perform destructive automatic merges in the initial versions.

Safe merge must:

1. Show candidate records and conflicts.
2. Let the user select the surviving record.
3. Preserve non-conflicting phones, emails, notes, groups, and relationships.
4. Require confirmation.
5. Use a database transaction.
6. Record an audit event.
7. Provide recovery or reversible behavior where feasible.

### Relationships

Support family, friendship, work, business, church, community, and later custom types. Store source, target, type, direction when relevant, notes, status, timestamps, and creator/confirming user in a multi-user version.

Distinguish:

- User-confirmed relationship.
- User-entered relationship.
- System-generated suggestion.
- Rejected/unverified suggestion.

Do not infer sensitive relationships as facts without confirmation.

### Groups

Support creating, editing, filtering, and deleting groups; adding/removing contacts; and church/community, family, work, friendship, and business groups.

### Visual map

Show contacts as nodes and relationships as edges. Support filtering, search/focus, zoom, pan, legend, and performance safeguards. Provide a list/table alternative for accessibility and usability. Select a library based on license, mobile performance, accessibility, TypeScript support, and maintenance.

### VCF

VCF means Virtual Contact File. Support validated import, preview, duplicate review, conflict handling, export of selected/all contacts, and reporting of unsupported fields. Never trust uploaded files without validation and resource limits.

### Encrypted local backup

Support explicit backup creation, encryption, integrity checks, versioning, restore validation, and clear recovery instructions. Explain that losing an encryption password or recovery key may make a backup unrecoverable. Use established cryptographic libraries; do not invent cryptography.

## 6. Initial database entities

Potential entities:

- `users`
- `contacts`
- `phone_numbers`
- `email_addresses`
- `groups`
- `contact_groups`
- `relationships`
- `duplicate_candidates`
- `audit_logs`
- `backup_metadata`

Use primary keys, foreign keys, appropriate unique constraints, indexes, timestamps, and transactions. Decide explicitly between hard deletion, soft deletion, and archive state. Audit logs must avoid unnecessary sensitive data.

## 7. Architecture responsibilities

### Next.js frontend

- Responsive UI, forms, navigation, loading/error states, accessibility, graph rendering, and API calls.
- Never treat frontend controls as the security boundary.

### NestJS backend

- Authentication, authorization, validation, business rules, contact operations, duplicate detection, safe merges, relationships, groups, VCF processing, audit logs, rate limiting, and consistent errors.

### PostgreSQL/Prisma

- Persistent structured data, migrations, constraints, indexes, and transactional operations.

## 8. UI/UX standards

Build a professional, modern interface with:

- Responsive Android and desktop layouts.
- Clear typography, spacing, hierarchy, icons, empty states, error states, and confirmation dialogs.
- Optional light/dark themes.
- Subtle animations that improve feedback without slowing the application.
- Respect for reduced-motion preferences.
- Accessible labels, focus states, contrast, keyboard navigation, and touch-friendly controls.

Likely screens:
login, dashboard, contact list, contact details, create/edit contact, search, duplicate review, merge dialog, groups, relationships, map, import wizard, export, backup/restore, settings, security, account deletion, and future billing.

## 9. Professional engineering workflow

### Git

Use Git with clear commits such as:

- `feat: add contact creation endpoint`
- `fix: prevent duplicate phone insertion`
- `docs: explain local setup`
- `test: add merge conflict coverage`

Suggested branches:

- `main` for stable code.
- Feature branches such as `feature/contact-crud`.
- Fix branches such as `fix/merge-validation`.

Do not work directly on `main` for risky changes.

### Pull requests

Each PR should state purpose, implementation summary, screenshots for UI work, tests, limitations, security concerns, migrations, and breaking changes.

### Code review

Review correctness, security, readability, tests, performance, accessibility, database integrity, error handling, and compatibility. AI-generated code must be reviewed and tested.

## 10. CI/CD

CI means Continuous Integration. CD means Continuous Delivery or Continuous Deployment.

Every pull request should run, as applicable:

1. Dependency installation.
2. Formatting check.
3. Linting.
4. Type checking.
5. Unit tests.
6. Integration tests.
7. Build checks.
8. Prisma/schema validation.
9. Dependency vulnerability checks.

A later deployment pipeline should use:

1. Feature branch.
2. Local checks.
3. Pull request.
4. Automated CI.
5. Review and merge.
6. Staging deployment.
7. Smoke tests.
8. Production approval/deployment.
9. Monitoring and rollback plan.

Separate local, test, staging, and production environments where practical. Never use production credentials locally. Protect GitHub Actions permissions and secrets.

## 11. Testing strategy

### Unit tests

Phone normalization, validation, sorting, duplicate matching, relationship rules, and permission checks.

### Integration tests

API/database operations, contact CRUD, transactional merges, relationships, and imports.

### End-to-end tests

Login, create/search contact, VCF import, duplicate review, merge, export, and restore.

### Security tests

Unauthorized access, cross-user access, malformed uploads, invalid input, rate limits, session expiration, and permission boundaries.

### Manual tests

Android responsiveness, Windows browsers, accessibility, animation, graph usability, and VCF compatibility.

## 12. Development phases

### Phase 0 — Planning

Create this document, requirements, architecture decisions, security baseline, and initial backlog.

### Phase 1 — Foundation

Initialize Git and monorepo; create Next.js and NestJS apps; configure TypeScript, linting, formatting, environment template, README, health endpoint, and first CI workflow.

### Phase 2 — Database

Configure PostgreSQL and Prisma, initial schema, migrations, seed strategy, and test database.

### Phase 3 — Authentication

Implement secure account/login/session handling, protected routes, authorization, and tests.

### Phase 4 — Contact CRUD

Implement contacts, phone numbers, validation, search, sorting, pagination, and tests.

### Phase 5 — VCF and duplicates

Implement validated import/export, preview, duplicate candidates, safe transactional merge, audit logging, and tests.

### Phase 6 — Groups and relationships

Implement group membership, relationship types, confirmation status, suggestions, and filters.

### Phase 7 — Relationship map

Select and integrate graph library, filtering, focus/search, mobile behavior, accessibility alternative, and performance testing.

### Phase 8 — Backups

Design and implement encrypted local backup, restore validation, integrity checks, recovery documentation, and restore tests.

### Phase 9 — UI refinement

Design system, responsive layouts, animation, loading/error/empty states, accessibility, and mobile testing.

### Phase 10 — Deployment

Choose hosting, configure HTTPS, production database, secret management, monitoring, backups, CI/CD deployment, and rollback.

### Phase 11 — Commercial readiness

Review multi-user design, roles, subscriptions, billing provider, usage limits, privacy policy, terms, support, costs, and product validation.

## 13. Initial backlog

### Foundation

- [ ] Confirm project and repository names.
- [ ] Initialize Git and monorepo.
- [ ] Create Next.js frontend.
- [ ] Create NestJS backend.
- [ ] Select Node.js and package-manager versions.
- [ ] Configure linting, formatting, and type checking.
- [ ] Add `.env.example`, README, and CI.
- [ ] Add backend health check.
- [ ] Verify local startup.

### Architecture

- [ ] Create Architecture Decision Records (ADRs).
- [ ] Select authentication and session strategy.
- [ ] Select hosting.
- [ ] Select graph library.
- [ ] Define contact fields.
- [ ] Define “last used.”
- [ ] Define deletion policy.
- [ ] Define backup encryption and recovery design.
- [ ] Define API and error conventions.

### Security

- [ ] Create threat model.
- [ ] Define sensitive fields.
- [ ] Implement input validation.
- [ ] Implement authorization.
- [ ] Add rate limiting.
- [ ] Add secure headers.
- [ ] Add security tests.
- [ ] Define data deletion and export behavior.
- [ ] Prevent secret leakage in logs and CI.

## 14. Definition of done

A feature is complete only when:

- Requirements are understood.
- Code is readable and modular.
- Validation and authorization are present.
- Errors are handled.
- Relevant tests exist and pass.
- Formatting, linting, type checking, and build pass.
- Documentation is updated.
- Security implications are reviewed.
- Database migrations are safe.
- Responsive and accessibility behavior is checked when applicable.
- The project owner understands the main implementation concepts.

## 15. AI agent instructions

Before changing code, an agent must:

1. Read `PROJECT_CONTEXT.md` and `README.md`.
2. Inspect repository structure, Git status, branch, and relevant files.
3. Check existing tests and configuration.
4. Explain the proposed plan for significant work.

Agents must not assume that code, migrations, tests, backups, deployment, or security controls exist merely because they are documented. Verify them.

Agents must not:

- Delete user data without explicit confirmation.
- Perform irreversible merges without confirmation.
- Commit secrets.
- Change architecture silently.
- Install unnecessary dependencies without explanation.
- Claim success without verification.
- Hide failed tests or limitations.
- Expose personal contact data unnecessarily.

For every meaningful task, report:

- Objective.
- Files changed.
- Design explanation.
- Commands executed.
- Test results.
- Known limitations.
- Next step.

## 16. Monetization direction

The architecture should leave room for:

- Free personal plan.
- Premium personal plan.
- Family/group plan.
- Organization plan for churches, associations, and small businesses.
- Optional self-hosted offering.

Monetization must not depend on selling contact data. Before charging users, validate demand, usability, retention, operating costs, support requirements, privacy obligations, and willingness to pay.

## 17. Decisions — status

Status of every decision that §17 of v1.0 listed as pending. "Accepted" means
decided and recorded in an ADR under `docs/decisions/`. "Proposed" means a
recommendation exists but it is decided at the start of the phase that needs
it — it must not be treated as final before then.

| Decision                                               | Status                                                                                                                        | Where    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| Project and repository name                            | **Accepted** — `contact-sphere` (owner, 2026-09-25; `contact-management` was chosen first, renamed when the repo was created) | ADR 0002 |
| Single-user vs multi-user first release                | **Accepted** — single-user, multi-user-ready (owner, 2026-09-25)                                                              | ADR 0004 |
| Node.js version and package manager                    | **Accepted** — Node 24 LTS, npm workspaces                                                                                    | ADR 0002 |
| PostgreSQL and application hosting                     | **Accepted** — Neon (Frankfurt) + Render (API, free plan for now) + Vercel (web) (owner, 2026-09-25)                          | ADR 0003 |
| Environments and isolation                             | **Accepted**                                                                                                                  | ADR 0008 |
| Authentication approach                                | **Accepted** — email + argon2id password, BFF, first-account setup token                                                      | ADR 0006 |
| Session/token strategy                                 | **Accepted** — opaque token, HttpOnly `__Host-` cookie, hashed in Postgres                                                    | ADR 0006 |
| Meaning of "last used"                                 | Proposed                                                                                                                      | ADR 0007 |
| Hard delete, soft delete, or archive                   | Proposed — decide at Phase 4                                                                                                  | ADR 0005 |
| Exact contact fields; email and notes in first release | Proposed — decide at Phase 4                                                                                                  | ADR 0010 |
| Backup encryption and recovery design                  | Proposed — decide at Phase 8                                                                                                  | ADR 0009 |
| Graph library                                          | Open — evaluate at Phase 7                                                                                                    | backlog  |
| Scope of shared groups and organizations               | Deferred to Phase 11 (single-user first)                                                                                      | ADR 0004 |
| Monetization model                                     | Deferred to Phase 11                                                                                                          | §16      |

## 18. Phase 1 acceptance criteria

Phase 1 is complete when:

- Repository and monorepo are initialized.
- Next.js and NestJS applications start locally.
- Frontend basic page works.
- Backend health endpoint works.
- Environment variables are documented.
- Formatting, linting, type checking, and builds pass.
- Initial CI workflow passes.
- README explains setup.
- No secrets are committed.
- Project owner understands the basic structure.

## 19. First Windows-PC session

1. Verify Git.
2. Verify Node.js.
3. Select and verify package manager.
4. Install or verify editor.
5. Select PostgreSQL/Docker approach.
6. Create or clone repository.
7. Save this document as `PROJECT_CONTEXT.md` in the repository root.
8. Verify the file path.
9. Commit the documentation.
10. Initialize the monorepo.
11. Create frontend and backend.
12. Configure local environment.
13. Run both applications.
14. Run all initial checks.
15. Commit the foundation.

Do not migrate personal contact data until the foundation and data protection approach have been reviewed.

## 20. Current status

- Phase 0 complete: this document reviewed, gaps analysed (§22), ADRs,
  threat model, environment plan and backlog written.
- Phase 1 foundation built and verified locally (see `CHANGELOG.md` and
  `docs/session-log.md`).
- Neon project `contact-sphere` created with `production`, `staging` and
  `development` branches (see `docs/operations/environments.md`).
- No personal contact data exists anywhere yet, and none may be added until
  Phase 3 (authentication) is merged and reviewed.

**Current phase:** Phase 1 — Foundation, awaiting review and merge.

**Immediate next step:** Merge Phase 1 once CI is green, deploy the health
endpoint to Render staging and the web app to Vercel, then begin Phase 2.

## 21. Final instruction

Treat this as a real privacy-sensitive software product. Work incrementally, explain important computer science concepts, verify every claim, protect user data, test changes, document decisions, and update this file as the project evolves.

## 22. Gap analysis (added in v1.1 before any build work)

The v1.0 handoff was reviewed against what a privacy-sensitive product needs
before code is written. These gaps were found and are now covered:

| #   | Gap in v1.0                                                                                                                                         | Resolution                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | No threat model or data classification, though both were in the backlog                                                                             | `docs/security/threat-model.md`                                                                                    |
| 2   | No environment isolation rule. TrustGiving learned the hard way that "staging" and "production" were once the same database                         | ADR 0008; separate Neon branches; CI and agent sessions never touch Neon                                           |
| 3   | Hosting was open, but Vercel (web) and Render (API) are **different sites**, so a login cookie set by the API would be a blocked third-party cookie | ADR 0006 routes browser calls through the web origin (backend-for-frontend)                                        |
| 4   | No policy for what may be logged; contact data is personal data                                                                                     | Threat model §logging; `no-console` lint rule in the API                                                           |
| 5   | No legal baseline. The owner is in Kenya; the Data Protection Act 2019 applies once other people's data is processed for others                     | Threat model §legal; review before Phase 11                                                                        |
| 6   | Windows development not accounted for (line endings, shell scripts)                                                                                 | `.gitattributes` forces LF; README has Windows setup                                                               |
| 7   | Phone numbers were "normalised appropriately" without a rule                                                                                        | ADR 0010 proposes E.164 via `libphonenumber-js`, default region KE, original text kept                             |
| 8   | Accessibility target not stated                                                                                                                     | WCAG 2.2 AA (CLAUDE.md)                                                                                            |
| 9   | Supply-chain risk not addressed                                                                                                                     | Lockfile-only installs (`npm ci`), npm install-scripts denied by default, Dependabot, `npm audit` in CI            |
| 10  | "Private" deployment undefined                                                                                                                      | `noindex` everywhere, robots disallow, Vercel deployment protection, no public sign-up (ADR 0004)                  |
| 11  | Server-side database backups not addressed (only user backups)                                                                                      | Neon point-in-time restore (6 h on the free plan) documented as a known limit in `docs/operations/environments.md` |
| 12  | Merge discipline not stated                                                                                                                         | CLAUDE.md: nothing merges without green CI and the owner's explicit "merge it"                                     |
