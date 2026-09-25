# 0013 — Two-factor sign-in with TOTP

**Status:** Accepted · 2026-09-25 (required before real contact data)

## Decision

- **TOTP (RFC 6238)** with an authenticator app: SHA-1, 6 digits, 30 s — the
  settings every app supports. Implemented with the `otpauth` library
  (MIT, maintained, one audited dependency); no home-made cryptography.
- **Optional per account**, strongly recommended; enabled from Account →
  "Set up two-factor": scan the QR code (or tap the `otpauth://` link on the
  phone), confirm with a code.
- **Secret encrypted at rest:** AES-256-GCM with `TOTP_ENCRYPTION_KEY`
  (32 bytes, API only), stored as `v1:` + nonce ‖ tag ‖ ciphertext. The
  database refuses anything not in that form. A copy of the database alone
  cannot generate codes.
- **Each code works once:** the last accepted time step is stored and only
  newer steps are accepted (±1 step for clock drift), with a conditional
  update so two simultaneous requests cannot both use one code.
- **Recovery codes:** 10 per enrolment, 60 bits each, no confusable
  characters, shown once, stored as SHA-256, single use.
- **Sign-in:** a correct password on a two-factor account returns a
  challenge (not a session). The challenge — 256-bit, stored hashed —
  lives 5 minutes and dies after 5 wrong codes; the web keeps it in an
  HttpOnly `__Secure-` cookie scoped to `/login`.
- **Enabling** signs out every other session (they signed in without the
  second factor). **Disabling** needs the password _and_ a current code.
- **Audit:** challenged, failed, recovery code used, enabled, disabled.

## Why

A stolen or guessed password alone must not open someone's address book.
TOTP works offline, costs nothing, needs no phone number (SMS codes can be
hijacked by SIM swap), and is supported by every authenticator app.

## Cost

- `TOTP_ENCRYPTION_KEY` is one more secret. Lose it and every enrolled
  authenticator stops working (recovery codes still sign in, then re-enrol).
  Rotating it requires re-enrolment (a key-version scheme exists: `v1:`).
- Users must keep recovery codes safe; the app cannot recover a lost
  authenticator without one.

## Later

Passkeys (WebAuthn) as a phishing-resistant alternative; optionally require
two-factor for all accounts once multi-user (Phase 11).
