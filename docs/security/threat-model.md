# Threat model and data classification

**Version:** 1 · 2026-09-25 · review at the start of every phase.

"No online system can guarantee absolute security" (handoff §3). This
document says what we protect, from whom, and how — so gaps are visible.

## 1. What we protect (data classification)

| Class                       | Examples                                                                       | Rules                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret**                  | password hashes, session ids, DB credentials, backup passphrases               | Never logged, never in URLs, never in the repo. Passphrases never reach the server.                                                   |
| **Personal (contact data)** | names, phone numbers, emails, notes, groups, relationships, imported VCF files | Owner-only access, checked server-side on every request. Never logged, never sent to analytics or error trackers, never used for ads. |
| **Sensitive inference**     | relationship types (family, church), system suggestions                        | Suggestions are never stored as fact without confirmation (handoff §5).                                                               |
| **Operational**             | request ids, timestamps, status codes, record ids                              | May be logged.                                                                                                                        |

Notes and relationship labels can reveal religion, health or family matters —
treat them as the most sensitive fields.

## 2. Who might attack, and how

| Threat                           | Example                                                       | Primary controls                                                                                              |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Internet stranger                | Credential stuffing, brute-forcing the login                  | argon2id, rate limits, uniform errors (Phase 3)                                                               |
| Another user (multi-user future) | Changing an id in a URL to read someone else's contact (IDOR) | `owner_id` scoping on every query + cross-user tests (ADR 0004)                                               |
| Malicious file                   | Huge or crafted VCF, zip bomb, script in a field              | Size/count limits, streaming parser, schema validation, output escaping (Phase 5)                             |
| XSS                              | Script stored in a contact name                               | React escaping; no `dangerouslySetInnerHTML`; CSP (Phase 3)                                                   |
| CSRF                             | Another site submitting a form to our API                     | SameSite cookies + Origin check (ADR 0006)                                                                    |
| Supply chain                     | Compromised npm package                                       | Lockfile-only installs, install scripts denied by default, Dependabot, `npm audit` in CI                      |
| Leaked secret                    | Credential committed or printed in CI logs                    | `.gitignore` + `.claudeignore`, `sync: false` in render.yaml, CI has no secrets                               |
| Platform compromise / insider    | Access to Neon or Render dashboards                           | 2FA on GitHub, Neon, Render and Vercel accounts (owner action); least-privilege DB role for the app (Phase 2) |
| Lost device                      | Phone with an open session                                    | Session expiry, "sign out everywhere" (ADR 0006)                                                              |
| Data loss                        | Bad merge, bad migration, provider incident                   | Transactional merges, trash (ADR 0005), Neon PITR, encrypted user backups (ADR 0009)                          |

## 3. Logging policy

- Log **what happened** (route, status, duration, record id, user id), never
  **what the data was** (names, numbers, emails, notes, file contents).
- Validation errors returned to the client may name the field, but server
  logs must not include the submitted value.
- The API lint rule `no-console` forces deliberate use of the Nest logger.
- Error tracking (e.g. Sentry, if adopted) must have request bodies and
  breadcrumbs scrubbed before it is enabled.

## 4. Controls in place today — verified by tests

Phase 3 (ADR 0006): only the web server can call the API (shared secret);
argon2id passwords; hashed session tokens in HttpOnly `__Host-` cookies;
idle/absolute expiry; per-IP and per-account brute-force limits; uniform
login errors with equalised timing; one-time owner setup; per-request
nonce CSP on every page; audit entries for auth events without emails.
Proven by `apps/api/test/e2e/auth.e2e-spec.ts` and a browser flow.

Two-factor (ADR 0013): TOTP with the secret encrypted at rest (AES-256-GCM),
single-use codes, hashed single-use recovery codes, attempt-limited
5-minute challenges. Proven by `apps/api/test/e2e/totp.e2e-spec.ts` and an
18-step browser flow.

Phase 1–2:

- API refuses to boot with a missing, wildcard, path-bearing or non-HTTPS
  (production) CORS origin (`apps/api/src/config/env.spec.ts`).
- API sends a strict CSP (`default-src 'none'`), `nosniff`, no
  `X-Powered-By`; unknown origins get no CORS grant
  (`apps/api/test/e2e/health.e2e-spec.ts`).
- Web sends `X-Frame-Options: DENY`, HSTS, `Referrer-Policy`,
  `Permissions-Policy`, `noindex`; robots.txt disallows everything.
- `/health` reveals nothing about versions or environment.

## 5. Legal baseline (not legal advice)

The owner is in Kenya. While the app only holds the owner's own address
book, it is personal/household use. **Before other users are admitted
(Phase 11)**, review the Kenya Data Protection Act 2019 — registration with
the Office of the Data Protection Commissioner, lawful basis, data-subject
rights (access, correction, deletion, export — already planned), breach
notification within 72 hours, and cross-border transfer rules (data is
hosted in Frankfurt, EU). Contacts stored are also data _about third
parties_ who never signed up; this belongs in the privacy policy.

## 6. Known gaps (tracked in `docs/backlog.md`)

- Two-factor is optional per account (ADR 0013); turn it on before
  storing real contacts.
- Per-account login-failure counter is in memory (single instance only).
- Neon `production` branch cannot be protected on the current plan.
- 2FA on provider accounts is an owner action and cannot be verified from
  code.

## Offline copy on the device (Phase 10b)

The owner may choose to keep a copy of their contacts in the installed
app's storage (IndexedDB) so it works with no data bundle.

- **Opt-in, per device**, explained on the Profile page; off by default.
- **Who can read it:** anyone who can use the unlocked phone and open the
  app — the same exposure as the phone's own address book. The phone's
  screen lock is the protection. We do not add encryption with a key kept
  in the same browser: it would not stop that attacker, and a passcode
  would defeat the purpose for people out of data. Revisit if needed.
- **Wiped:** on sign-out (at submit, before the request), whenever the
  server answers 401 (e.g. after "sign out everywhere" elsewhere), and on
  every visit to the sign-in pages.
- **Offline app:** static files under a strict CSP (`script-src 'self'`,
  no inline code); all text inserted with `textContent` (tested with a
  hostile contact name). Read-only: it never writes to the server.
- **Service worker** caches only the offline app's files and the icon,
  never a signed-in page or API response.
- **Snapshot endpoint** rate-limited (12/min) against scraping with a
  stolen session; answers are `no-store`.

### Changes made offline (Phase 10b+)

- Queued in the same device store; tied to the account that made them
  (`ownerId`). `/offline-sync` refuses a different signed-in account
  (409, the queue is then discarded) and any request whose `Origin` is not
  the app's own (403) — a cross-site form cannot send JSON with our Origin.
- Only four narrow operations exist (create contact, in touch, follow-up
  add/done); each maps to an existing API call with its normal checks.
- Device-made ids make replays harmless; an id already used by another
  owner is refused (409).
- Sign-out warns before discarding unsent changes; the sign-in page and a
  401 keep them for the same account only.
