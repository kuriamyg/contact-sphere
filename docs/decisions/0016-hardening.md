# 0016 — Hardening: durable lock-out, devices, breached passwords, safe logs

**Status:** Accepted · 2026-09-27 · follows ADR 0006's "Next" list

## Decision

1. **The per-account lock-out lives in Postgres** (`login_failures`: a hash
   of the email typed, a count and when the window started). One atomic
   upsert per failure; 10 failures lock the account for the rest of a
   15-minute window; a correct password clears it; rows older than a day
   are deleted on the next failure. A restart or a second API instance no
   longer resets it.
2. **Signed-in devices are listed** in Profile → Devices and sign-out, and
   any other device can be signed out on its own (`GET /auth/sessions`,
   `DELETE /auth/sessions/:id`, audited as `auth.session_ended`). Each
   session stores only a coarse label ("Chrome on Android") made from the
   browser's User-Agent when it signs in — never the full string, never an
   IP address. This device cannot be ended from the list ("Sign out" does
   that).
3. **New passwords are checked against known breaches** (setup and change)
   with Have I Been Pwned's range API: only the first 5 hex characters of
   the SHA-1 leave the server, with padding requested so the answer's size
   says nothing. A breached password is refused with a plain reason. The
   check **fails open** (3 s timeout; logged as a warning) so an outage
   never blocks a password change. `BREACHED_PASSWORD_CHECK=on|off`,
   default on in production, off elsewhere (tests never call out).
4. **Structured, redacted logs (pino).** One JSON line per event. Requests
   are logged as method, route with ids and long numbers masked, status and
   time, plus a request id (`x-request-id`) — never the query string,
   headers or body. Errors keep their type, code, first line and stack
   frames only; emails and phone-like numbers are masked even there.
   Known secret and personal field names are redacted wherever they appear.
   `LOG_LEVEL` (default `info`; `silent` in tests). The web server's one
   error log drops the query string too.

## Why

- An in-memory lock-out was the one control that silently weakened with a
  restart (Render restarts on every deploy) — an attacker could time
  guesses around deploys.
- A lost phone is the likeliest real threat to this app's owner; seeing
  and ending that one session is better than "sign out everywhere".
- Breached passwords are the ones credential-stuffing tries first (NIST SP
  800-63B §5.1.1.2 asks for this check).
- A database error can quote the row it was given — names, numbers, notes.
  Logs go to a third-party viewer and are kept for days; they must never
  hold contact content.

## Consequences

- One extra small table and a nullable column; one outbound HTTPS call per
  password set (none per sign-in).
- Log lines say less than a default logger would; the request id and
  stack frames are what debugging relies on.
