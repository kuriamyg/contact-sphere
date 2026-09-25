# 0004 — Single-user first release, multi-user-ready data model

**Status:** Accepted · 2026-09-25 (owner decision)

## Decision

- The first release has **one account: the owner**. Public sign-up is
  disabled; the account is created by a one-off bootstrap command.
- Every user-owned table nevertheless has an `owner_id` column, and every
  query is scoped by it at the service layer. Tests assert that one user can
  never read or change another user's rows.

## Why

Opening sign-up adds attack surface (enumeration, spam accounts, abuse) that
brings no value until the product is validated. But retro-fitting ownership
into every table and query later is a rewrite — and the single most common
source of data leaks between users. Paying the small cost now keeps the
monetization path (§16) open.

## Cost

Every query carries a `where: { ownerId }`, and cross-user tests must exist
even while only one user exists.

## Revisit if

Phase 11 (commercial readiness). Postgres row-level security as a second
line of defence is considered then.
