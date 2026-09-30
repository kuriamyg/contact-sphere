# Unfinished business

The one list of everything still to build or do, in the order we build it.
Updated in every PR that finishes, adds or reorders an item. Details of
what already shipped live in `docs/backlog.md` and `CHANGELOG.md`.

## How we work

Every build round goes the same way:

1. **List:** the next items from this file, in order, with suggestions.
2. **Plan:** scope, design choices, migrations, risks.
3. **Build:** one PR per item, then the release routine — CI green →
   migrate staging, then production, with drift checks before merge →
   squash-merge → clean deploy of both APIs → live checks (staging with
   test writes, production read-only) → report.

Rules that never change: no secrets or personal identifiers in the repo;
test with made-up data only; keys go into Render/Vercel settings, never
into chat or code.

Status: ⏳ next · 🔨 in progress · ✅ done (then removed at the next
refresh) · 💤 waiting on something outside the code.

**Where we are (2026-09-29):** Commercial C1–C4 are done. The owner chose
to build **P6 then P5** first (P1–P4 wait; the owner handles the bot
themselves). P6 (relationships and the map) is live. P5 (Android): P5a and P5b
are live, P5c in progress. L1 and L2 wait for money.

---

## 1. Commercial (Phase 12) — in this order

| #   | Item                                         | Status | What / why                                                                                                                                                                          |
| --- | -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Plan-ending nudge                            | ✅     | Banner before Plus ends and after it ends; morning push at 3 and 1 days left. People pay when reminded at the right moment.                                                         |
| C2  | Encrypted backup and restore (ADR 0009)      | ✅     | A passphrase-encrypted file made on the phone; restore adds what is missing. "Last backup" date and a monthly reminder. Answers "what if I lose my phone / the service goes away?". |
| C3  | Bot protection on sign-up (Turnstile)        | ✅     | Invisible check on phone + password sign-up and SMS-code requests; off until the owner adds free Cloudflare keys.                                                                   |
| C4  | Docs refresh                                 | ✅     | Pilot playbook (new sign-up flow), backlog, roadmap, deployment settings.                                                                                                           |
| C5  | Server-kept encrypted backup history (later) | 💤     | Optional: keep the last N encrypted backups on the server (it still cannot read them). Only if people ask; costs storage.                                                           |

### Last — after the money comes in

| #   | Item                                  | Status | Needs                                                                                                                                                                         |
| --- | ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | B9b: M-Pesa go-live + Ratiba renewals | 💤     | A till or paybill approved for Daraja. Switch on the M-Pesa prompt (built, ADR 0019), add automatic monthly renewals (M-Pesa Ratiba) and a receipt screen.                    |
| L2  | Phone verification by SMS             | 💤     | A registered sender ID (Do Not Disturb blocks shared senders). Verify numbers of password sign-ups (ADR 0021), turn SMS reset back on, settle "someone registered my number". |

## 2. Product — P6, then P5, then P1–P4

| #   | Item                                      | Status | What                                                                                                                                                            |
| --- | ----------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P6a | Relationships                             | ✅     | Link two contacts (family, who introduced whom, work, church, chama) with a note; suggestions from "met through" and shared surnames. Free. ADR 0023.           |
| P6b | Relationship map (Plus)                   | ✅     | Own SVG, no library (ADR 0024). `/contacts/map`: focus on a person, filter by kind, family tree, zoom/pan, the same people as a list; up to 300 people.         |
| P5a | Android app shell + import from the phone | ✅     | Capacitor shell around the live web app (ADR 0025); read-only "Import from this phone" through the usual preview; test builds as the `android-latest` download. |
| P5b | Google sign-in inside the app             | ✅     | Sign-in in a Chrome tab, handed back to the app with a single-use code redeemable only with the app's secret (ADR 0025).                                        |
| P5c | Write to the phone (own account)          | 🔨     | Contact Sphere contacts in the phone's Contacts app under a separate "Contact Sphere" account; the owner's other contacts never touched.                        |
| P5d | Two-way sync                              | ⏳     | Changes on either side, field-level merge, owner decides clashes (as ADR 0015). Own ADR first.                                                                  |
| P5e | Play Store release                        | 💤     | USD 25 account, 12+ testers for 14 days, Play billing decision for Plus, upload key in GitHub secrets.                                                          |
| P1  | Tour follow-ups                           | ⏳     | The owner picks a tour design (A–E, see the tour PR); tips inside pages (the + on Contacts, the import wizard, a contact's page).                               |
| P2  | Reminders by WhatsApp / SMS; more dates   | ⏳     | Morning reminder over WhatsApp or SMS (paid channels, costed in `docs/product/messaging-costs.md`); anniversaries and other important dates.                    |
| P3  | Email morning digest — switch on          | 💤     | Built (A3). Needs a domain verified at Resend or Brevo.                                                                                                         |
| P4  | Community plan                            | ⏳     | Shared, consented member lists for a chama, church or team: invite members, each member controls what is shared.                                                |

## 3. Engineering upkeep

| #   | Item                 | Status | Notes                                                            |
| --- | -------------------- | ------ | ---------------------------------------------------------------- |
| E1  | Framework majors     | 💤     | NestJS 12, TypeScript 7, ESLint 10 — each its own PR when ready. |
| E2  | Paid Render instance | 💤     | Starter ($7/month) ends the ~50 s cold start. Owner.             |

## 4. Owner actions (only you can do these)

- [ ] Rotate keys that passed through chat: Africa's Talking, Resend, the
      Neon owner password (all three branches).
- [ ] Delete `SETUP_TOKEN` on the production API (Render).
- [ ] 2FA on GitHub, Neon, Render, Vercel, Google Cloud.
- [ ] Delete the old Google OAuth client; keep the app "In production".
- [ ] GitHub: branch protection on `main`, secret scanning, push
      protection.
- [ ] Render: health check path `/health` on both services.
- [ ] ODPC registration (pack in `docs/odpc/`, KES 4,000), then send the
      number for the privacy policy.
- [x] Cloudflare Turnstile keys set on the production API (checked live
      2026-09-29: sign-up without the check is refused).
- [ ] For the Android app (P5): a Google Play developer account (USD 25,
      one-off; new personal accounts need 12 testers for 14 days before
      release), an Android phone to test on, and the app id (suggested
      `com.coderiserdigital.contactsphere`).
- [ ] Later: a domain (email), a till/paybill for Daraja, a sender ID.
- [ ] First pilot: send a friend `/signup`, give 3 free months on
      `/operator`, talk at week 2 and week 6 (`docs/product/pilot.md`).
