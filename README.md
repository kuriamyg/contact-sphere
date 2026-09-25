# Contact Sphere

A privacy-first contact management platform built with Next.js and NestJS,
for Android phones and Windows PCs.

## Features

- **Privacy-first** — your contacts are private to your account, never sold,
  never used for advertising, and never written to logs.
- **Duplicate detection with safe merging** — likely duplicates are found and
  explained; nothing is merged until you review and confirm it, and merges
  can be undone.
- **Groups and relationship mapping** — family, friends, work, business,
  church and community, shown as an interactive map with a list alternative.
- **VCF import/export** — validated vCard import with preview, and export of
  selected or all contacts.
- **Encrypted backups** — backups are encrypted in your browser with a
  passphrase only you know before they are downloaded.
- **Scalable foundation** — single-user first, designed so personal and
  organisational plans can follow.

> **Honest security note.** Data is encrypted in transit (HTTPS) and at rest
> by the database provider, and access is restricted to your account. It is
> **not end-to-end encrypted**: the server can read the contacts it stores,
> because search and duplicate detection run there. Backups _are_ encrypted
> on your device. See `docs/security/threat-model.md`.

> **Status:** Phase 2 — Database. There is no login yet, so **do not put
> real contacts into any deployed copy** until Phase 3 is complete.

|          |                                                          |
| -------- | -------------------------------------------------------- |
| Web      | Next.js 16 · React 19 · Tailwind CSS 4 — `apps/web`      |
| API      | NestJS 11 — `apps/api`                                   |
| Database | PostgreSQL 18 on Neon + Prisma 7                         |
| Hosting  | Vercel (web) · Render (API) · Neon (database), Frankfurt |

Start with [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), then
[`CLAUDE.md`](CLAUDE.md) (the rules) and
[`docs/decisions/`](docs/decisions/README.md) (the reasons).

## Set up on Windows (first time)

1. **Git** — install from <https://git-scm.com/download/win>. Accept the
   defaults. Then, in PowerShell:
   ```powershell
   git config --global core.autocrlf false
   ```
   (`.gitattributes` already keeps line endings consistent; this stops Git
   for Windows fighting it.)
2. **Node.js 24 LTS** — install from <https://nodejs.org> (choose the LTS
   "24.x" Windows installer). Check in a new PowerShell window:
   ```powershell
   node -v   # v24.x
   npm -v    # 11.x
   ```
3. **VS Code** — <https://code.visualstudio.com>, with the ESLint, Prettier
   and Tailwind CSS IntelliSense extensions.
4. **Clone and install:**
   ```powershell
   git clone https://github.com/kuriamyg/contact-sphere.git
   cd contact-sphere
   npm ci
   ```
   `npm ci` installs exactly what `package-lock.json` lists — never
   "whatever is newest today" — so your PC, CI and Render run identical code.

## Run it locally

Two terminals:

```powershell
npm run dev:api    # API on http://localhost:3001  → try /health
npm run dev:web    # Web on http://localhost:3000
```

For the web page to check the API, create `apps/web/.env.local` containing
`API_URL=http://localhost:3001` (see `.env.example`).

### Database (local)

The API needs a Postgres database. Easiest on Windows: use the Neon
**`development`** branch (never `staging` or `production`).

1. Neon console → project `contact-sphere` → branch `development` →
   **Connect**: copy the **direct** connection string (owner).
2. In PowerShell, from the repo root:
   ```powershell
   $env:DIRECT_URL = "<the direct connection string>"
   npm run prisma:deploy
   $env:APP_DB_PASSWORD = "<make up a long random password>"
   npm run db:app-role
   ```
3. Create `apps/api/.env` with
   `DATABASE_URL=postgresql://contact_sphere_app:<that password>@<pooled host>/contacts?sslmode=verify-full`
   (pooled host = the same host with `-pooler` added; Neon shows both).

Details: [`docs/operations/database-roles.md`](docs/operations/database-roles.md).

## Checks (what CI runs)

```powershell
npm run check
```

That runs, in order: formatting, linting, type checking, unit tests,
database guarantee tests, API end-to-end tests, and production builds.
`npm run format` fixes formatting. The database and e2e suites need a
**local, disposable** Postgres (they refuse anything else); CI provides one.

## Environment variables

All documented in [`.env.example`](.env.example). Real values live only in
`.env` files on your machine (git-ignored) and in the Render/Vercel
dashboards. See [`docs/operations/environments.md`](docs/operations/environments.md).

## Licence

The source code is public so that CI can run on free GitHub runners
(ADR 0011), but **no licence is granted**: all rights reserved. The data in
any deployment is private and never part of this repository.

## Documentation map

| Where                             | What                                       |
| --------------------------------- | ------------------------------------------ |
| `docs/decisions/`                 | Architecture Decision Records              |
| `docs/security/threat-model.md`   | What we protect, from whom, how            |
| `docs/operations/environments.md` | Real environments and IDs                  |
| `docs/operations/deployment.md`   | How to deploy and roll back                |
| `docs/architecture/overview.md`   | How the pieces fit                         |
| `docs/backlog.md`                 | What is next                               |
| `docs/session-log.md`             | What was done, when, and what was verified |
