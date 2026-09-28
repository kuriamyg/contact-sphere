# 0018 — Open sign-up with a mobile number and SMS codes

**Status:** Accepted · 2026-09-28 · B6; amends ADR 0004 (single owner) and ADR 0006 (sign-in)

## Decision

- **Anyone can create an account with a Kenyan mobile number**, when the
  server has `OPEN_SIGNUP=on`. Three steps on one page (`/signup`): the
  number, a 6-digit code by SMS, then an optional name and a password (same
  rules as ever: 12+ characters, not in a known breach). No email needed.
  Off by default; the one-time owner setup (ADR 0006) still works.
- **Accounts have an email, a phone, or both** (`users.email` becomes
  nullable, new `users.phone` unique; a CHECK requires one of them and the
  phone to be `+2547…`/`+2541…` in E.164).
- **Sign in with either.** One field, "Email or phone number"; anything with
  `@` is an email, anything else must be a Kenyan mobile in any common form
  (`0712…`, `+254 712…`, `254712…`). The wrong-password message no longer
  says which kind of identifier was used: "Those sign-in details are not
  right." Lock-out (ADR 0016) keys on the email or the E.164 number.
- **Forgot password by SMS** (`/reset`): a code to the number, then a new
  password. It signs out every device and clears the lock-out. Only phone
  accounts can reset this way; email-only accounts still change it from
  Profile.
- **Codes** (`phone_codes`): 6 random digits, stored only as
  `sha256("<row id>:<code>")`, valid 10 minutes and 5 tries, one a minute
  and five a day per number and purpose, all deleted when one is used and
  pruned after a day. Sign-up and reset codes are separate.
- **No account enumeration.** Asking for a code gives the same answer
  whether or not the number has an account. The text itself says which case
  applies ("already has an account — sign in or reset"), and it only reaches
  the phone's owner. Reset codes are only texted to numbers with an account.
- **Provider: Africa's Talking** (Kenyan company, pay per SMS, about KES 0.80
  each, no monthly fee, sender ID optional). `OTP_SMS_PROVIDER=africastalking`
  with `AT_USERNAME`, `AT_API_KEY` and optional `AT_SENDER_ID`; the username
  `sandbox` uses their sandbox, where texts show in the online simulator.
  `OTP_SMS_PROVIDER=log` records and logs the text instead (development and
  tests; refused in production). A failed send deletes the code and says
  "try again in a minute".
- **Texts follow the chosen language** (English or Kiswahili).

## Why

- Most people the product is for have a phone number and an M-Pesa line, not
  a habit of email; a code by SMS proves the number is theirs.
- The Android-phone gateway used for group texts (Phase 11) is cheaper but
  depends on one phone being on and charged; sign-up must not. Africa's
  Talking has a free account and sandbox, so the owner's rule ("if it has no
  free account, use the Android gateway") picked it.
- Hashing codes with the row id means a leaked table gives nothing usable in
  10 minutes; the per-number limits cap cost and nuisance (5 texts a day at
  worst per number, plus the API's per-IP limits).

## Consequences

- About KES 1 per sign-up or reset. A number can receive at most 10 texts a
  day from us (5 sign-up, 5 reset).
- Phone-only accounts cannot have email reminders until adding an email is
  built; Profile says so.
- Africa's Talking is a new processor (Kenya): the privacy policy and the
  ODPC pack (02, 03, 07, 08) list it.
- Production stays closed (`OPEN_SIGNUP` unset) until a live Africa's Talking
  key and plans/billing (B9) are ready.
