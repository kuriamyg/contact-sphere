#!/bin/bash
set -euo pipefail

# Only for Claude Code on the web. A developer's own machine manages itself.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "[session-start] Installing dependencies from the lockfile..."
npm ci

# From Phase 2 on, this hook also starts a disposable local Postgres and
# points DATABASE_URL at it, so that no command run in an agent session can
# reach a real Neon branch by accident (the TrustGiving lesson — see
# docs/decisions/0008-environments-and-isolation.md).

echo "[session-start] Ready. Run 'npm run check' to verify everything."
