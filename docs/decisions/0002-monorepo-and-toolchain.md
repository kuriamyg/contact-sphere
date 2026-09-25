# 0002 — Monorepo, Node 24, npm workspaces, pinned framework majors

**Status:** Accepted · 2026-09-25

## Decision

- One repository, `kuriamyg/contact-sphere` (public source code — see ADR 0011), with
  `apps/web` (Next.js) and `apps/api` (NestJS) as **npm workspaces**.
- **Node.js 24** (Active LTS, supported until April 2028), pinned in `.nvmrc`
  and `engines`. CI and Render read the same version.
- **npm 11** (ships with Node 24). No pnpm/yarn: one fewer tool to install on
  a Windows PC, and TrustGiving uses npm, so the owner already knows it.
- Framework majors chosen for **maturity over novelty**:

| Tool       | Chosen        | Newer available          | Why not the newer one (yet)                                                                                   |
| ---------- | ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| NestJS     | 11.x          | 12.x (released Sep 2026) | Three weeks old; ecosystem packages (throttler, passport, pino) still catching up. Same major as TrustGiving. |
| TypeScript | 5.9           | 6.0 / 7.0 (native)       | ts-jest, typescript-eslint and Nest's compiler support 5.x fully today.                                       |
| Next.js    | 16.3          | —                        | Current stable.                                                                                               |
| Prisma     | 7.x (Phase 2) | —                        | Current stable.                                                                                               |

- `packages/` (shared types/validation) is **not created until something is
  actually shared**. An empty package is maintenance with no benefit.

## Why a monorepo

The web app and the API change together (an endpoint and the screen that
uses it). One repo means one PR, one CI run and one review for one feature,
and the API's types can later be shared with the web app without publishing
anything.

## Cost

Both apps install together (a bigger `node_modules`); Render and Vercel must
each be told which folder is theirs (`rootDir` / `rootDirectory`).

## Revisit if

Nest 12 / TypeScript 7 are supported by every plugin in use — upgrade
through a dedicated PR with the full test suite, never mixed into a feature.
