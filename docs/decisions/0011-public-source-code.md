# 0011 — Public source code, private data

**Status:** Accepted · 2026-09-25 (owner decision)

## Decision

The GitHub repository is **public**. The application and everyone's contact
data remain **private**: nothing about who can use the deployed app, or who
can see data in it, changes.

## Why

The account's GitHub Actions minutes for private repositories ran out, and
CI could not run at all. Standard GitHub-hosted runners are free for public
repositories. The project's contract says nothing merges without green CI,
so the choice was between paying, waiting, or publishing the code. The owner
chose to publish.

## What this changes, and the controls for it

| Concern                                              | Control                                                                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in code or history                           | There never were any (history scanned before publishing). `.gitignore`, `.claudeignore` and `render.yaml`'s `sync: false` keep it that way. Turn on GitHub **secret scanning + push protection** (free on public repos).              |
| Contact data in the repo                             | Never allowed: `*.vcf` and backup files are git-ignored; test fixtures must be synthetic (CLAUDE.md).                                                                                                                                 |
| Pull requests from strangers' forks running CI       | The workflow uses `pull_request` (not `pull_request_target`), has `permissions: contents: read`, and has **no secrets**, so a fork PR cannot read or change anything. Keep GitHub's default "require approval for fork PR workflows". |
| Security through obscurity                           | Never relied on. Attackers can read the code, so every control must hold anyway (the standard assumption, Kerckhoffs's principle).                                                                                                    |
| Security reports                                     | Enable GitHub **private vulnerability reporting**; `SECURITY.md` points there.                                                                                                                                                        |
| Re-use by others                                     | No licence is granted: all rights reserved by default (`UNLICENSED`). Choosing a licence is a separate owner decision.                                                                                                                |
| Infrastructure IDs in docs (Neon project/branch ids) | Not credentials; useless without a password. Kept for operations.                                                                                                                                                                     |

## Revisit if

Monetization (Phase 11) makes the code itself a commercial asset. Then
either buy Actions minutes and make the repository private again, or keep it
open-source deliberately and choose a licence.
