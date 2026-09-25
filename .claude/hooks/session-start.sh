#!/bin/bash
set -euo pipefail

# Only for Claude Code on the web. A developer's own machine manages itself.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# A disposable local Postgres, so no command in an agent session can reach a
# real Neon branch by accident (ADR 0008). The URLs exported below REPLACE
# whatever DATABASE_URL/DIRECT_URL the environment was configured with.
LOCAL_OWNER_URL="postgresql://postgres:localtest@localhost:5432/contact_sphere_test"
LOCAL_APP_PASSWORD="local-session-only-not-a-secret"
LOCAL_APP_URL="postgresql://contact_sphere_app:${LOCAL_APP_PASSWORD}@localhost:5432/contact_sphere_test"

echo "[session-start] Installing dependencies from the lockfile..."
npm ci

echo "[session-start] Ensuring local Postgres is running..."
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  pg_ctlcluster 16 main start 2>/dev/null || pg_createcluster 16 main --start
  for _ in $(seq 1 20); do
    pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
    sleep 0.5
  done
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -qtAc "ALTER USER postgres WITH PASSWORD 'localtest';"
sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_database WHERE datname='contact_sphere_test'" | grep -q 1 \
  || sudo -u postgres createdb contact_sphere_test

echo "[session-start] Applying migrations and creating the app role locally..."
DIRECT_URL="$LOCAL_OWNER_URL" npm run prisma:deploy
DIRECT_URL="$LOCAL_OWNER_URL" APP_DB_PASSWORD="$LOCAL_APP_PASSWORD" npm run db:app-role

{
  echo "export DIRECT_URL=\"$LOCAL_OWNER_URL\""
  echo "export DATABASE_URL=\"$LOCAL_APP_URL\""
} >> "$CLAUDE_ENV_FILE"

echo "[session-start] Ready: local Postgres, migrations applied. Run 'npm run check'."
