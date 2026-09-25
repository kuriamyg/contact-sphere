# Database roles and connection strings

Background: ADR 0012. Two connection strings per environment, never mixed:

| Variable       | Role                     | Neon host              | Used by         | Stored in                                              |
| -------------- | ------------------------ | ---------------------- | --------------- | ------------------------------------------------------ |
| `DIRECT_URL`   | owner (`contacts_owner`) | direct (no `-pooler`)  | migrations only | GitHub Environment secret; your shell, for one command |
| `DATABASE_URL` | `contact_sphere_app`     | **pooled** (`-pooler`) | the running API | Render service env var                                 |

Both must end in `?sslmode=verify-full` (node-postgres treats `require` as
`verify-full` today but will weaken it in v9, so say what we mean). Percent-encode `# / ?` in passwords.

## Set up an environment (once per Neon branch)

1. **Migrate** (creates tables and the `app_runtime` group):
   run the **Deploy migrations** workflow for that environment, or, for
   `development`, in your own shell:
   `DIRECT_URL=<owner direct URL> npm run prisma:deploy`
2. **Create the app login role**, choosing a new random password:
   ```sh
   DIRECT_URL=<owner direct URL> \
   APP_DB_PASSWORD="$(openssl rand -hex 24)" \
   npm run db:app-role
   ```
   (PowerShell: set `$env:DIRECT_URL` and `$env:APP_DB_PASSWORD` first.)
3. **Build `DATABASE_URL`** from the pooled host in the Neon console:
   `postgresql://contact_sphere_app:<password>@<pooled-host>/contacts?sslmode=verify-full`
4. Put it in the Render service for that environment. Render redeploys.
5. Verify: `GET /health/ready` → `{"status":"ok","checks":{"database":"ok"}}`.

## Rotate the app password

Re-run step 2 with a new password (the script re-passwords an existing
role), then update Render. The API refuses connections in between, so do it
when a minute of downtime is acceptable.

## Never

- Never rely on whatever `DIRECT_URL`/`DATABASE_URL` a shell already has.
  On 2026-09-25 the shared agent environment carried **another project's**
  (TrustGiving's) database credentials under these same names, and a
  Contact Sphere command briefly targeted them (the connection was blocked
  by the network; nothing was changed). Set both explicitly for every
  command. `db:app-role` now refuses any database that lacks this project's
  first migration.
- Never give the API the owner connection.
- Never run `test:db` or `test:e2e` against Neon (the suites refuse non-local
  hosts, and that guard must never be weakened).
- Never create roles through the Neon console or API for the app: those
  roles join `neon_superuser`, which defeats least privilege.
