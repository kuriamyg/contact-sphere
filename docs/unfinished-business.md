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

---

## 1. Commercial (Phase 12) — in this order

| #   | Item                                         | Status | What / why                                                                                                                                                                          |
| --- | -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Plan-ending nudge                            | ✅     | Banner before Plus ends and after it ends; morning push at 3 and 1 days left. People pay when reminded at the right moment.                                                         |
| C2  | Encrypted backup and restore (ADR 0009)      | 🔨     | A passphrase-encrypted file made on the phone; restore adds what is missing. "Last backup" date and a monthly reminder. Answers "what if I lose my phone / the service goes away?". |
| C3  | Bot protection on sign-up (Turnstile)        | ⏳     | Invisible check on phone + password sign-up and SMS-code requests; off until the owner adds free Cloudflare keys.                                                                   |
| C4  | Docs refresh                                 | ⏳     | Pilot playbook (new sign-up flow), backlog, roadmap, deployment settings.                                                                                                           |
| C5  | Server-kept encrypted backup history (later) | 💤     | Optional: keep the last N encrypted backups on the server (it still cannot read them). Only if people ask; costs storage.                                                           |

### Last — after the money comes in

| #   | Item                                  | Status | Needs                                                                                                                                                                         |
| --- | ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | B9b: M-Pesa go-live + Ratiba renewals | 💤     | A till or paybill approved for Daraja. Switch on the M-Pesa prompt (built, ADR 0019), add automatic monthly renewals (M-Pesa Ratiba) and a receipt screen.                    |
| L2  | Phone verification by SMS             | 💤     | A registered sender ID (Do Not Disturb blocks shared senders). Verify numbers of password sign-ups (ADR 0021), turn SMS reset back on, settle "someone registered my number". |

## 2. Product — in this order (after Commercial)

| #   | Item                                      | Status | What                                                                                                                                                                                                         |
| --- | ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | Tour follow-ups                           | ⏳     | The owner picks a tour design (A–E, see the tour PR); tips inside pages (the + on Contacts, the import wizard, a contact's page).                                                                            |
| P2  | Reminders by WhatsApp / SMS; more dates   | ⏳     | Morning reminder over WhatsApp or SMS (paid channels, costed in `docs/product/messaging-costs.md`); anniversaries and other important dates.                                                                 |
| P3  | Email morning digest — switch on          | 💤     | Built (A3). Needs a domain verified at Resend or Brevo.                                                                                                                                                      |
| P4  | Community plan                            | ⏳     | Shared, consented member lists for a chama, church or team: invite members, each member controls what is shared.                                                                                             |
| P5  | **Android app with phone sync (largest)** | ⏳     | Native Android app, two-way sync with the phone's own address book, with consent. Separate project (own ADRs, repo folder, Play Store listing). The adoption unlock: people will not keep two address books. |
| P6  | Relationship map (Phase 13)               | ⏳     | Family tree and "who introduced whom", once contact data is rich.                                                                                                                                            |

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
- [ ] Cloudflare Turnstile keys (free) when C3 ships, if bots appear.
- [ ] Later: a domain (email), a till/paybill for Daraja, a sender ID.
- [ ] First pilot: send a friend `/signup`, give 3 free months on
      `/operator`, talk at week 2 and week 6 (`docs/product/pilot.md`).
