# Deployment

The order is always: **CI green → owner says "merge it" → merge → (schema
changes: migrate staging, verify, migrate production) → deploy staging →
verify → deploy production → verify → log it** in `docs/session-log.md`.

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
`curl https://<service>.onrender.com/health` → `{"status":"ok"}`.

## Web on Vercel

- Project root directory: `apps/web`. Framework: Next.js.
- Environment variable `API_URL` (server-side only, not `NEXT_PUBLIC_`):
  - Production → `https://contact-sphere-api.onrender.com`
  - Preview → `https://contact-sphere-api-staging.onrender.com`
- Keep **Deployment Protection** (Vercel Authentication) on for previews.
- Verify: the home page shows **API: Online** (allow ~60 s on the first
  request while Render's free instance wakes).

## Rollback

- Web: Vercel → Deployments → previous production deployment → Promote.
- API: Render → Deploys → previous deploy → Rollback.
- Database: Neon point-in-time restore of the branch (6 h window on the
  free plan). Practise this on `staging` before relying on it.
