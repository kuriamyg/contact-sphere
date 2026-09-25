# 0009 — Encrypted local backups

**Status:** Proposed · decide at Phase 8

## Proposal

- The backup is produced **in the browser**: the API returns the owner's
  data as JSON; the browser encrypts it and downloads a single file. The
  server never sees the passphrase or the encrypted file.
- **Key derivation:** Argon2id from a passphrase the user chooses (library:
  `hash-wasm` or libsodium; parameters recorded in the file header).
- **Encryption:** AES-256-GCM via the browser's built-in WebCrypto API.
  GCM gives integrity too: a modified or corrupted file fails to decrypt
  instead of restoring garbage.
- **File format:** versioned header (`format`, `version`, KDF params, salt,
  nonce), then ciphertext. Versioned so old backups remain restorable.
- **Restore:** decrypt → validate against a schema → preview → import through
  the same duplicate-review path as VCF import. Never a blind overwrite.
- The UI states plainly: **if you lose the passphrase, the backup cannot be
  recovered by anyone, including us.** Optional printed recovery key.

## Rule

No home-made cryptography: only WebCrypto and a vetted Argon2 implementation.
