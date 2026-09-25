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

## 4. Controls in place today (Phase 1) — verified by tests

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

- No web Content-Security-Policy yet (needs nonces; Phase 3).
- No authentication yet — **therefore no personal data may be stored**.
- Neon `production` branch cannot be protected on the current plan.
- 2FA on provider accounts is an owner action and cannot be verified from
  code.
