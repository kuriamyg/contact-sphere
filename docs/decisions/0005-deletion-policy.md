# 0005 — Archive, trash, then hard delete

**Status:** Proposed · decide at Phase 4

## Proposal

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

## Open questions

Are merged-away records kept in trash so a merge can be undone (handoff §5
"recovery or reversible behaviour")? Recommended: yes, for 30 days.
