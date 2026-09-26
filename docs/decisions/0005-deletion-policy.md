# 0005 — Archive, trash, then hard delete

**Status:** Accepted · 2026-09-26 (Phase 4; owner delegated "continue shipping")

## Decision

1. **Archive** — hidden from lists and search, kept indefinitely, one-click
   restore. For contacts you no longer use but want to keep.
2. **Delete** → moves to **Trash** (`deleted_at` set). Restorable for 30 days.
3. After 30 days, or on "Empty trash" with confirmation, the row is **hard
   deleted**, together with its phone numbers, emails, memberships and
   relationships (foreign keys `ON DELETE CASCADE`).
4. **Account deletion** hard-deletes everything the account owns after a
   confirmation step. Audit rows keep only ids and action names, never
   contact content, so they do not preserve deleted personal data.

## Why

Soft-delete forever is not deletion: a privacy product that says "deleted"
must mean it. Immediate hard delete makes mistakes (and accidental merges)
unrecoverable. The 30-day trash is the usual compromise (Gmail, Google
Contacts).

## Implementation notes

- A contact can be archived and trashed independently; the trash wins
  (it is hidden from both the main and archived lists). A trashed contact
  cannot be edited or archived until it is restored.
- Render's free plan has no scheduler, so the API purges expired trash on
  ordinary traffic (the contact list), at most once an hour per process,
  and records `contact.trash_purged` with a count only.
- Permanent delete of one contact is only possible from the trash.
- Account deletion is not built yet (a later phase); its rule above stands.

## Merges (Phase 5)

Merged-away records go to the trash for 30 days, so a merge can be undone
(handoff §5, "recovery or reversible behaviour").
