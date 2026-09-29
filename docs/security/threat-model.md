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

## Hardening (A5, ADR 0016)

- **Guessing passwords:** per-IP limit (5/min) plus a per-account lock-out
  (10 per 15 min) now kept in Postgres, so deploys and restarts do not
  reset it. The table holds hashes of emails typed, never the emails.
- **Weak or reused passwords:** new passwords are checked against Have I
  Been Pwned with k-anonymity (5 hex characters of SHA-1 leave the server).
  Fails open by design; the outage is logged.
- **A lost or unknown device:** Profile lists signed-in devices by a coarse
  label and ends any one of them. Labels come from the User-Agent (which a
  client can fake) — they help recognise, they are not proof.
- **Logs:** structured, no bodies, headers or query strings; routes have
  ids masked; errors reduced to type, first line and frames with emails
  and numbers masked; secret/personal field names redacted. Render keeps
  logs for a limited time; nothing in them identifies a contact.

## Account deletion and legal notice (B7, ADR 0017)

- **Deleting an account** needs the password, a second-factor code when
  two-factor is on, and `DELETE` typed; rate-limited like sign-in. One
  transaction removes every owned row (cascade). The audit entry keeps ids and
  counts only. The sign-in page then wipes the device's offline copy and queue.
- **Privacy policy and terms** are public at `/privacy` and `/terms`. They
  describe exactly what this model describes — when one changes, change both.
- **Residency:** web server, API and database all run in Frankfurt (EU).

## Open sign-up and SMS codes (B6, ADR 0018)

- **Codes** are 6 random digits, stored only as a hash with their row id,
  valid 10 minutes and 5 wrong tries, one a minute and five a day per number
  and purpose. Asking for one answers the same for every valid number, so
  the endpoint cannot tell who has an account; the SMS says so to the
  phone's owner only.
- **Passwords** are checked (length, breaches) before a code is spent, so a
  weak password does not burn a try.
- **Reset** revokes every session and clears the lock-out.
- **Logs** never hold the number (the scrubber replaces it) or the code,
  except the development-only `log` provider, which production refuses.
- **Cost abuse** is bounded: 10 texts a day per number at most, plus the
  per-IP rate limit on every public auth route.

## Plans and payments (B9, ADR 0019)

- **Forged payment callbacks:** Safaricom does not sign them. The callback
  URL carries a secret token; it reaches the API only through the web
  server (web-server secret); the checkout id must be ours and pending, and
  the amount exact. Crediting is a conditional update — replaying a
  callback credits nothing. Lost callbacks are recovered by Daraja's query.
- **Operator page:** only `role = operator` (checked in the API on every
  call; the web page is a 404 otherwise). It shows counts, never contacts.
- **Hand-recorded payments** are unique by M-Pesa code, audited with the
  operator's id, and cannot be deleted by the app role.
- **Prompt spam:** one a minute and five a day per account.

## Continue with Google (ADR 0020)

- **Forged sign-in:** the ID token's RS256 signature is checked against
  Google's keys, with issuer, audience (our client id), expiry and
  `email_verified`. PKCE ties the code to our verifier; the nonce ties the
  token to this browser's attempt; the state (in an HttpOnly cookie, one
  use) stops login CSRF. The redirect address must be one of our origins.
- **Account takeover by email:** linking by email needs a Google-verified
  email, and an email already linked to another Google id is refused.
- **Two-factor** still applies after Google.
- **No password to steal** for Google-only accounts; deleting one needs the
  session, the typed word and the second factor when on.

## 6. Known gaps (tracked in `docs/backlog.md`)

- Two-factor is optional per account (ADR 0013); turn it on before
  storing real contacts.
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
- Only five narrow operations exist (create contact, edit details, in
  touch, follow-up add/done); each maps to existing API calls with their
  normal checks. An edit is validated field by field (known fields only,
  the API's length limits) and saved with `If-Match`, so it can never
  overwrite a newer change it did not see (ADR 0015). Clashes are stored
  on the device next to the queue and wiped with it.
- Device-made ids make replays harmless; an id already used by another
  owner is refused (409).
- Sign-out warns before discarding unsent changes; the sign-in page and a
  401 keep them for the same account only.

## Reach (Phase 11)

- **Push reminders.** A subscription is a capability URL at the browser
  vendor (Google, Apple, Mozilla) plus the phone's keys; the payload is
  encrypted to those keys (RFC 8291), so the vendor carries it without
  reading it. Still, the notification appears on a locked screen, so the
  text is counts only — never a name, number or note (tested). Endpoints
  must be https (CHECK); at most 10 per owner; an endpoint moves with the
  signed-in account and is dropped on 404/410 or 5 failures in a row.
- **The morning job** needs no session: Vercel Cron calls `/cron/digest`
  with `Bearer $CRON_SECRET` (constant-time compare; anything else 404),
  which calls the API with the BFF secret like every request. It is
  idempotent per Nairobi day (claimed atomically in `users.digest_sent_on`).
- **Paid SMS** is off unless configured. When on: Kenyan mobiles only,
  quote before send, per-owner monthly limit, throttled (5/min). The
  message and numbers go to the aggregator and are never stored by us;
  `sms_sends` keeps counts only and the app role can only insert/read it
  (DB-tested). Aggregator keys live only in the API environment.
- **QR card** contains only name, organisation, title, ≤3 numbers and ≤2
  emails — never notes, tags, birthday or area (tested). "This is me" is
  checked against owner and trash on every read.
- **Own-phone group texts** leave the app entirely: the `sms:` link hands
  numbers and text to the phone's Messages app; nothing is sent by us.
