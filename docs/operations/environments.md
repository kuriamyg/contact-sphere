# Environments

**Last verified: 2026-09-25**, against the Neon, Render and Vercel APIs. If this file and any
plan disagree, trust this file — and re-verify it against the provider,
because a database's _name_ is never proof of which database it is
(ADR 0008).

## Topology

| Layer                 | Production                                                                                                              | Staging                                                                                                       | Development                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Neon project          | `contact-sphere` (`noisy-base-91471369`), AWS eu-central-1, Postgres 18                                                 | same project                                                                                                  | same project                              |
| Neon branch           | `production` (`br-autumn-sun-b1tkzogt`) — default branch                                                                | `staging` (`br-holy-breeze-b1atievt`)                                                                         | `development` (`br-frosty-pine-b1a44tgc`) |
| Database / owner role | `contacts` / `contacts_owner`                                                                                           | same names, separate branch data and endpoint                                                                 | same                                      |
| Render service        | `contact-sphere-api` (`srv-darbssou01pc73bagk60`) — <https://contact-sphere-api-js7c.onrender.com>                      | `contact-sphere-api-staging` (`srv-darbnvhsrm7s73dulcg0`) — <https://contact-sphere-api-staging.onrender.com> | local `npm run dev:api`                   |
| Vercel                | project `contact-sphere` (`prj_Yg9SI4oDlYfQGmzJDrbiCycDU8it`), Production target, `API_URL` → production Render service | same project, Preview target (behind Vercel login), `API_URL` → staging Render service                        | local `npm run dev:web`                   |

Render gave production a suffixed hostname (`-js7c`) because the plain name
was already taken on Render; the service's _name_ is still
`contact-sphere-api`. Always use the URL above, never a guessed one.

Both Render services: free plan, Frankfurt, build `main`, `autoDeploy: no`.
`WEB_ORIGIN` on both is `https://contact-sphere-nine.vercel.app`.

The Vercel production domain is **<https://contact-sphere-nine.vercel.app>**
(`contact-sphere.vercel.app` belongs to another account). Vercel functions
run in `fra1` (Frankfurt), next to the API and database.

## Credentials

- No connection string is stored in this repository or in these docs.
- Phase 1 does not use the database. From Phase 2:
  - Runtime (`DATABASE_URL`) uses a **least-privilege app role**, pooled
    endpoint (host contains `-pooler`).
  - Migrations (`DIRECT_URL`) use the owner role, direct endpoint.
  - Each is copied from the Neon console **for the matching branch** into
    the matching Render service. Never cross-wire branches.

## Known limits (free plans)

- Neon: 6 h point-in-time restore window; 0.5 GB per branch; `production`
  not protected (the account's one protected branch is used by TrustGiving).
- Render free: sleeps after 15 min idle; 30–60 s cold start.

## Resetting staging

Staging drifts from production by design. To refresh it, reset the Neon
`staging` branch from its parent (Neon console → Branches → staging → Reset
from parent). This **erases** staging data; never do it to `production`.
