# 0006 — Authentication and sessions

**Status:** Proposed · decide at the start of Phase 3

## The constraint that shapes everything

The web app is on `*.vercel.app` and the API on `*.onrender.com`. Those are
**different sites**. Browsers now block third-party cookies, so an API that
sets a login cookie directly would have that cookie dropped. TrustGiving
avoided this with a bearer token held in JavaScript — which works, but means
any XSS bug can steal the session.

## Proposal

- **Backend-for-frontend:** the browser only ever talks to the web origin.
  Next.js forwards `/api/*` to the Render API (rewrites or route handlers).
  Cookies are then first-party.
- **Session:** a random, opaque session id in an `HttpOnly; Secure;
SameSite=Lax` cookie. Sessions live in Postgres (hashed id, expiry,
  last-seen), so they can be listed and revoked — "sign out everywhere".
- **Passwords:** argon2id (`argon2` package), minimum length 12, checked
  against a breached-password list if feasible.
- **Brute force:** `@nestjs/throttler` on login per IP and per account;
  identical error for "no such user" and "wrong password".
- **CSRF:** SameSite=Lax plus a check of the `Origin` header on every
  state-changing request.
- **Later:** TOTP two-factor (strongly recommended before real data), then
  passkeys.

## Alternatives considered

- _JWT in localStorage_ — simple, but XSS-stealable and not revocable.
- _Hosted auth (Clerk, Auth0, Neon Auth)_ — less code, but contact data's
  owner identity then lives with a third party; cost grows with users.

## Decide at Phase 3

Confirm BFF vs custom domains (`app.` and `api.` on one domain also make
cookies first-party, but need a domain purchase).
