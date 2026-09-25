# Contributing

1. Read `PROJECT_CONTEXT.md` and `CLAUDE.md`.
2. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
3. Keep the PR to one feature. Use Conventional Commit messages:
   `feat: …`, `fix: …`, `docs: …`, `test: …`, `chore: …`, `refactor: …`.
4. Run `npm run check` before pushing.
5. Open a PR and fill in the template — including security/privacy and
   migrations sections.
6. CI must be green. The owner reviews and says **"merge it"** before merge.
7. Record significant decisions as an ADR in `docs/decisions/`, and add a
   `docs/session-log.md` entry for anything deployed.

AI-generated code is reviewed and tested exactly like human code.
