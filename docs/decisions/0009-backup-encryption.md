# 0009 — Encrypted backups

**Status:** Accepted · 2026-09-29 (proposed in Phase 0; built as C2)

## Context

People lose phones, and SIM swaps happen. The owner needs a copy of their
contacts that does not depend on this phone or on Contact Sphere staying
online, and that nobody else can read, including us.

## Decision

- **Made in the browser.** `GET /backup` returns the owner's data as JSON
  (contacts not in the trash — archived included — with numbers, emails,
  tags, area, notes, birthdays and keep-in-touch; groups with members and
  roles; follow-ups). The page encrypts it and downloads one file,
  `contact-sphere-backup-YYYY-MM-DD.json`. The server never sees the
  passphrase or the file.
- **Crypto: WebCrypto only.** Key from the passphrase with **PBKDF2-SHA-256,
  600,000 iterations** (OWASP's current figure) and a fresh 16-byte salt;
  **AES-256-GCM** with a fresh 12-byte IV. The readable header (format,
  version, date, KDF and cipher parameters) is GCM's additional data, so an
  edited header, a changed byte or a wrong passphrase all fail to open.
  Files asking for fewer than 100,000 or more than 10 million iterations
  are refused.
- **Why not Argon2id (as first proposed):** it needs a WebAssembly library
  and `'wasm-unsafe-eval'` in the page's Content-Security-Policy. PBKDF2 at
  600,000 rounds is an accepted standard and needs neither. The version
  field lets a later format switch to Argon2id and still open old files.
- **Restore** (Profile → Encrypted backup): the page decrypts, then
  `POST /backup/restore/preview` says what would be added and
  `POST /backup/restore` adds it. Restore **never overwrites or deletes**:
  a contact already saved (same id, or same name with all its numbers and
  emails) is left as it is; groups are matched by name and only get
  missing members; follow-ups come back only with contacts the restore
  creates, so restoring twice adds nothing. New contacts get new ids, so a
  file can never touch another account's rows. The free plan's 3-group
  limit applies. Every field is re-checked on the server.
- **Reminder:** `users.last_backup_at` (when the owner last downloaded one)
  drives "Last backup" on Profile and a "Back up your contacts" card on
  Today once there are 10 contacts: after 3 days if never, then monthly.
- Audit entries hold counts only.

## Consequences

- A forgotten passphrase means the file cannot be opened by anyone. The UI
  says so and asks the owner to confirm before downloading.
- Keeping backups is the owner's job (Drive, email, flash disk). A
  server-kept encrypted history is tracked as C5 in
  `docs/unfinished-business.md`.
