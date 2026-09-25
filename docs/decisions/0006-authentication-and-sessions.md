# 0006 — Authentication and sessions

**Status:** Accepted · 2026-09-25 (Phase 3). Supersedes the Phase 0 proposal.

## The constraint

The web app is on `*.vercel.app` and the API on `*.onrender.com`: different
sites. Browsers block third-party cookies, so an API-set login cookie would
be dropped; a token in JavaScript (TrustGiving's approach) is readable by any
XSS bug.

## Decision

1. **Backend-for-frontend.** Browsers never call the API. The Next.js
   server calls it, server-to-server, adding `X-BFF-Secret`
   (`API_SHARED_SECRET`, ≥32 chars, distinct per environment). The API's
   first global guard refuses anything without it (403), except health
   checks. The Next.js server also forwards the browser's IP
   (`X-Client-IP`), which the API trusts _only because_ the secret proved
   the caller.
2. **Session = random token in an HttpOnly cookie on the web origin.**
   256-bit token from the OS CSPRNG. Cookie `__Host-cs_session`:
   HttpOnly, Secure, SameSite=Lax, Path=/, host-only. The API receives it as
   `Authorization: Session <token>` from the web server.
3. **Sessions in Postgres, token stored as SHA-256 only**, so a database
   copy cannot be used to sign in. Idle timeout 7 days, absolute 30 days;
   `last_seen_at` refreshed at most every 5 minutes.
4. **Passwords:** argon2id (library defaults: 64 MiB, t=3, p=4), 12–128
   characters, not the email, not one repeated character. The database
   refuses anything that is not an argon2id hash.
5. **Login failures are indistinguishable:** same message, and a dummy
   argon2 check for unknown emails so timing matches.
6. **Brute force:** 5 attempts/minute per client IP on login, setup and
   password change; plus 10 failures per account per 15 minutes from any
   number of IPs (in memory, single instance — see Cost).
7. **CSRF:** Server Actions only run for same-origin POSTs (Next.js checks
   Origin against Host); SameSite=Lax is a second layer.
8. **Secure by default:** every API route needs a session unless marked
   `@Public()`; the web-server secret is needed unless `@BffExempt()` (health
   only).
9. **First account:** single-user first release (ADR 0004). `SETUP_TOKEN`
   enables `/setup` only while no account exists; the owner chooses their
   password in the browser (nobody else ever knows it). Setup is serialised
   with an advisory lock, so two simultaneous attempts cannot both succeed.
   Remove `SETUP_TOKEN` afterwards.
10. **Password change** requires the current password and signs out every
    other session; **sign out everywhere** deletes all sessions.
11. **Audit:** setup, login success/failure, logout, logout-all, password
    change — ids and reason codes only, never the email typed.
12. **Content-Security-Policy with per-request nonces** on every page
    (`src/proxy.ts`): no inline or injected script can run. All pages render
    per request so each gets a nonce.

## Alternatives rejected

- JWT in localStorage — readable by XSS, not revocable.
- Hosted auth (Clerk/Auth0/Neon Auth) — the owner's identity lives with a
  third party; cost grows with users.
- API-set cookies on a shared custom domain — needs a domain purchase;
  revisit if one is bought (the BFF still works then).

## Cost

- Every API call makes one extra hop (browser → Vercel → Render).
- The per-account failure counter is in memory: it resets on restart and is
  per instance. Move it to Postgres/Redis before running more than one
  instance.
- Pages cannot be statically cached (per-request nonce).

## Next (tracked in the backlog)

- **TOTP two-factor** — before real contact data goes in.
- Breached-password check (k-anonymity range API).
- Session list (see and end individual devices).
