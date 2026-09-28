# 0019 — Plans, payments and the operator

**Status:** Accepted · 2026-09-28 · B9a; pricing from `docs/product/strategy.md` §5

## Decision

- **Two plans for now: Free and Plus.** Plus costs KES 99 a month or
  KES 990 a year. Free keeps every contact, search, import/export,
  duplicates, the QR card, offline use and **3 groups**. Plus adds **morning
  reminders** (phone and email) and **unlimited groups**. Family, Business
  and Community wait until pilots show what people pay for.
- **Every sign-up starts with a 30-day Plus trial** (`users.plus_until`).
  When it ends nothing is deleted or locked: the morning reminders stop,
  existing groups stay, and a fourth group needs Plus.
- **The first account is the operator** (`users.role`), who runs the
  service. The operator always has Plus and gets `/operator`: every account
  with name, email or number, plan, last seen, **counts** of contacts and
  groups, and money paid — never anyone's contacts. From there the operator
  gives free months (pilots, friends) or records an M-Pesa payment sent by
  hand, by its confirmation code (unique: the same code cannot be counted
  twice). The page is a 404 for everyone else.
- **Paying in the app: the M-Pesa prompt (STK push, Daraja).** Profile →
  Your plan → choose 1 or 12 months → the prompt arrives on the phone → the
  customer enters their PIN → Plus is extended. Plus runs from the end of
  the current period, so paying early loses nothing.
- **Safaricom's result is not trusted on its own.** Its callback is not
  signed, so: it goes to the web server
  (`/api/mpesa/callback/<secret token>`), which forwards it to the API with
  the web-server secret like every call (ADR 0006); the API checks the
  token, that the checkout id is one of ours and still pending, and that
  the amount is exactly the price. Crediting is one conditional update, so
  a repeated callback credits once. If the callback never arrives (or
  cannot, e.g. staging's protected preview), the Plan page's status check
  asks Daraja's STK query; an unanswered prompt fails after 3 minutes.
- **Limits:** one prompt a minute and five a day per account.
- **Payment records are tax records.** Kept 5 years; the app can insert and
  update them but never delete (grants); deleting an account keeps them with
  the owner set to null. They never hold the payer's phone number.
- **Configuration, off unless set:** `MPESA_PROVIDER=daraja`, `MPESA_ENV`
  (sandbox|production), `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
  `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_TYPE` (paybill|till),
  `MPESA_TILL`, `MPESA_CALLBACK_TOKEN`; `BILLING_PAY_TO` for the pay-by-hand
  line (lives in the server environment, not this public repository).

## Why

- A pilot needs a price, a trial and a way to pay before it can tell us
  whether people pay. Hand-recorded M-Pesa lets the first clients pay the
  day sign-up opens, before a till and Daraja go-live exist.
- Gating only what costs money to run or saves real time (reminders,
  many groups) keeps Free genuinely useful — how word of mouth starts.

## Consequences

- Safaricom becomes a processor when in-app payment is on (privacy policy,
  ODPC 02/07/08).
- Live STK needs a till or paybill with Daraja go-live; until then pilots
  pay by hand or are given free months.
- M-Pesa Ratiba (standing orders) for automatic renewal is later work.
