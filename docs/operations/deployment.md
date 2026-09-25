# Deployment

The order is always: **CI green → owner says "merge it" → merge → (schema
changes: migrate staging, verify, migrate production) → deploy staging →
verify → deploy production → verify → log it** in `docs/session-log.md`.

## Migrations

Run **Actions → Deploy migrations** with `staging`, confirm it passes
(including its drift check), then with `production` (type `production` to
confirm). Each GitHub Environment (`staging`, `production`) needs one secret,
`DIRECT_URL`: the Neon **owner** connection for that branch, direct host,
`sslmode=verify-full`. Roles and `DATABASE_URL`:
[`database-roles.md`](database-roles.md).

Verify after deploying code: `GET /health/ready` →
`{"status":"ok","checks":{"database":"ok"}}`.

## API on Render

Two services, both building `main`, both `autoDeploy: false`
(see `render.yaml`):

| Service                      | Neon branch  | `WEB_ORIGIN`                 |
| ---------------------------- | ------------ | ---------------------------- |
| `contact-sphere-api-staging` | `staging`    | the Vercel preview origin(s) |
| `contact-sphere-api`         | `production` | the Vercel production origin |

Build: `npm ci --include=dev && npm run build --workspace apps/api && npm prune --omit=dev`
Start: `node apps/api/dist/main.js` · Health check path: `/health`

Deploy manually from the Render dashboard (**Manual Deploy → Deploy latest
commit**) once CI on `main` is green. Verify:
`curl https://<service-url>/health` → `{"status":"ok"}` (URLs in
`environments.md`; production's hostname has a `-js7c` suffix).

Set **Settings → Health Check Path → `/health`** on both services in the
Render dashboard: the Render API used to create them cannot set it, and
without it Render only checks that the port is open.

## Secrets shared by web and API (ADR 0006)

| Variable              | Render service           | Vercel target | Must match                          |
| --------------------- | ------------------------ | ------------- | ----------------------------------- |
| `API_SHARED_SECRET`   | staging                  | Preview       | each other                          |
| `API_SHARED_SECRET`   | production               | Production    | each other                          |
| `SETUP_TOKEN`         | production (and staging) | —             | — (one-time; delete after setup)    |
| `TOTP_ENCRYPTION_KEY` | each service its own     | —             | — (never change casually: ADR 0013) |

Generate each with `openssl rand -hex 32`. Staging and production secrets
must differ. Changing one side without the other makes every page show the
API as unavailable — change both, then redeploy both.

## Web on Vercel

- Project root directory: `apps/web`. Framework: Next.js.
- Environment variable `API_URL` (server-side only, not `NEXT_PUBLIC_`):
  - Production → `https://contact-sphere-api-js7c.onrender.com`
  - Preview → `https://contact-sphere-api-staging.onrender.com`
- Keep **Deployment Protection** (Vercel Authentication) on for previews.
- Verify: the home page shows **API: Online** (allow ~60 s on the first
  request while Render's free instance wakes).

## Rollback

- Web: Vercel → Deployments → previous production deployment → Promote.
- API: Render → Deploys → previous deploy → Rollback.
- Database: Neon point-in-time restore of the branch (6 h window on the
  free plan). Practise this on `staging` before relying on it.
