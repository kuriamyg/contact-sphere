# 0015 — Offline edits: field-level merge, owner decides clashes

**Status:** Accepted · 2026-09-27

## Decision

- **Contact details can be edited with no data** (name, nickname, job,
  organisation, numbers, emails, area, met through, birthday, skills,
  notes). The phone stores one `contact.edit` change per contact holding,
  for each field changed, **what the phone showed before** (`from`) and
  **the edit** (`to`). Several edits before sending fold into one change
  that keeps the first `from`.
- **Three-way merge per field on reconnect** (`mergeEdit`, web server):
  the server's value now equal to `from` → take the edit; equal to `to`
  → nothing to do; anything else → **a clash**: the server value stays,
  and the clash is reported. Other fields of the same edit still apply.
  Comparison is as the API stores values (trimmed text, lower-case tags
  and emails, blank labels ignored).
- **Optimistic concurrency on the API:** `PUT /contacts/:id` accepts
  `If-Match: "<updatedAt>"`; the row is locked (`FOR UPDATE`) and the save
  is refused with 412 if the contact changed since. The web server then
  re-reads and re-merges (up to 3 times, then "retry later"). Without the
  header the PUT behaves as before (the online form).
- **The owner decides clashes.** Clashes are kept on the device (IndexedDB
  `conflicts`, tied to the account like the queue) and shown both in the
  offline app (on the contact, and in the banner) and in the full app (a
  card above every page): "Use mine" sends a new edit from the kept value
  to theirs; "Keep this" dismisses it. Nothing is lost silently.

## Why

- Whole-record last-writer-wins would let an old phone edit wipe a newer
  laptop edit to a different field; field-level merge keeps both.
- A clash on the same field has no right answer a machine can pick (two
  different notes), so the newer server value is kept — the safe default
  — and the owner is asked, with both values shown.
- `updatedAt` already exists and changes on every save, so it is the
  version: no schema change, no migration.

## Consequences

- Clashes live on one device; if that device is wiped before the owner
  looks, the kept (server) value simply stays.
- Any change to the contact (even "in touch") bumps `updatedAt`, which may
  cause an extra re-read on 412, never a wrong save.
