# 0022 — "Not a robot" check on sign-up (Cloudflare Turnstile)

**Status:** Accepted · 2026-09-29 · complements ADR 0021

## Context

Sign-up with a phone number and a password (ADR 0021) needs no code, so a
program could create accounts in bulk; SMS-code requests (ADR 0018) cost
money per text. The per-address rate limit (5 a minute) slows this but
does not stop a spread-out attack.

## Decision

- **Cloudflare Turnstile** on password sign-up (`POST /auth/register`) and
  on SMS-code requests (`/auth/signup/code`, `/auth/reset/code`). Free,
  usually invisible, no puzzles, no tracking cookies for ads. Google
  sign-in does not need it (Google already checks).
- **Off until configured:** `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
  on the API (both or neither). The site key is public and reaches the
  page through `GET /auth/signup`; the secret stays on Render.
- The page loads Cloudflare's script with the request's CSP nonce; the
  Content-Security-Policy allows Cloudflare's frame
  (`frame-src https://challenges.cloudflare.com`) **only on /signup and
  /reset**. The widget puts a one-use token in the form; the API checks
  it with Cloudflare's siteverify and refuses a missing or bad one ("Please
  confirm you are not a robot"). The widget is reset after every attempt.
- **If Cloudflare cannot be reached**, the check lets the person through
  (logged), as the breached-password check does (ADR 0016): an outage must
  not stop every sign-up, and the rate limit still applies.
- Tests use `TURNSTILE_PROVIDER=fake` (token "pass"), refused in
  production.

## Consequences

- Cloudflare sees the visitor's browser and connection on those two pages
  when the check is on (privacy policy updated).
- Owner action: create a free Turnstile widget at Cloudflare for
  `contact-sphere-nine.vercel.app` and set the two keys on the production
  API.
