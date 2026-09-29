# 0021 — Sign-up with a phone number, a password and a recovery key

**Status:** Accepted · 2026-09-29 · complements ADR 0020 (Google sign-in),
amends ADR 0018 (phone numbers)

## Context

Google sign-in (ADR 0020) leaves out people without a Google account, or who
would rather not use it. SMS codes still cannot be delivered (Do Not
Disturb; no sender ID yet). People need a way in with just a phone number
and a password they remember, and a way back in when they forget it.

## Decision

- **Sign-up with a phone number and a password, no code**
  (`POST /auth/register`; `SIGNUP_METHODS` gains `password`). The number is
  a **username**: it must be a Kenyan mobile and unique, but nothing proves
  the person holds it. It is stored with `users.phone_verified_at` **null**
  and shown as "not verified". Numbers that came in through an SMS code
  (ADR 0018) are marked verified (the migration backfills them).
- The usual password rules apply: 12+ characters, not the number itself,
  not in known breaches (ADR 0006, A5). The account starts on the Plus trial
  (ADR 0019). Five attempts a minute per client address, as for sign-in.
- **Recovery key instead of SMS reset.** Sign-up returns a random key
  (16 characters, 80 bits, no look-alike letters, shown as
  `XXXX-XXXX-XXXX-XXXX`), shown **once** on its own page with Copy and
  "I've saved it". Only its SHA-256 is stored (`users.recovery_key_hash`,
  CHECKed as hex). The key travels from the sign-up action to that page in
  a 10-minute HttpOnly cookie scoped to `/recovery-key`, cleared on "I've
  saved it".
- **Forgot password** (`POST /auth/recover`): number (or email) + key + new
  password. Wrong keys and unknown numbers get one identical answer and
  count toward the same per-account lock-out as sign-in, so the key cannot
  be guessed. Success sets the password, signs every device out and issues
  a **new** key (a key works once). Two-factor, when on, is still asked for
  at the next sign-in: the key replaces the password, never the second
  factor.
- **Profile → Recovery key**: the password makes a new key; the old one
  stops working.
- **SMS reset only for proven numbers.** When SMS is on, a reset code is
  never texted to an unverified number: whoever holds a mistyped number
  must not be able to take over the account that typed it.
- **Why not two-factor at sign-up?** Two-factor protects sign-in; it proves
  nothing about the number, and an authenticator app at sign-up loses
  first-time users. It stays optional in the profile.

## Consequences

- A number can be claimed by someone who does not hold it. The account is
  theirs, not the number's owner's; the real owner cannot sign up with it
  until SMS verification returns. Accepted for the pilot; later, an SMS
  code (sender ID) can verify numbers and settle disputes.
- Losing both the password and the key means the account cannot be
  recovered by the owner alone; the operator can help after checking who
  they are.
- Bots could create accounts; the per-address limit slows them. Add a
  challenge (e.g. Cloudflare Turnstile) if that happens.
