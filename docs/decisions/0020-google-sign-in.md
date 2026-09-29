# 0020 — Continue with Google replaces SMS sign-up

**Status:** Accepted · 2026-09-29 · amends ADR 0018 (sign-up by SMS code)

## Context

SMS sign-up (ADR 0018) went live and failed for real people. Africa's
Talking's shared sender counts as promotional, so every line with Do Not
Disturb on refuses the code (`UserInBlacklist`, 406), and in Kenya many do.
The fixes are a registered transactional sender ID (a fee and weeks of
approval) or texting from a personal phone (codes from a private number
look like a scam). Neither suits a pilot with no budget.

## Decision

- **New people join with "Continue with Google"** (OpenID Connect,
  authorization code flow with **PKCE**, **state** and **nonce**). Google is
  free for sign-in, almost every Android user has a Google account, and the
  button is familiar and trusted.
- **Flow:** `/auth/google` (web) keeps state, PKCE verifier and nonce in a
  10-minute HttpOnly cookie and sends the person to Google.
  `/auth/google/callback` checks the state and hands the code, verifier and
  nonce to the API (web-server secret, ADR 0006). The API exchanges the code
  with Google (client secret; verifier) and **verifies the ID token's RS256
  signature** against Google's published keys, plus issuer, audience,
  expiry, nonce and `email_verified`. The redirect address must be one of
  our own origins.
- **Accounts:** found by Google's stable id (`users.google_sub`). Otherwise
  an account with the same verified email is **linked** (so existing
  owners can use the button). Otherwise, when sign-up with Google is open,
  an account is created with the Google name and email, on the Plus trial
  (ADR 0019). An email already linked to another Google id is not taken
  over. With sign-up closed, only existing accounts can use the button.
- **Two-factor still applies**: Google proves the first factor; TOTP, when
  on, is asked for as after a password.
- **No password for Google-only accounts** (`password_hash` nullable; a
  CHECK keeps a password or a Google id on every account). Password sign-in
  refuses them; "Change password" is hidden and refused; deleting the
  account needs the typed `DELETE` (and the second factor when on);
  turning two-factor off needs the current code.
- **Configuration:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
  `SIGNUP_METHODS` (`google`, `sms` or both; default `sms`, the old
  behaviour). Production runs `SIGNUP_METHODS=google`. The SMS code path
  stays in the code for when a sender ID is affordable.

## Consequences

- Google becomes an identity provider: it tells us the name, email and
  account id of people who choose it; we tell Google nothing about their
  contacts (privacy policy, ODPC 02/07).
- People without a Google account cannot join yet; the operator can still
  help them another way later (invites), or SMS returns with a sender ID.
- Basic scopes (openid, email, profile) need no Google app verification.
