# Email: the morning reminder by email (A3)

**Status (2026-09-27): on in production** with Resend's shared sender
`Contact Sphere <onboarding@resend.dev>`. Without a verified domain Resend
delivers only to the address the Resend account was created with — the
owner's own, which is the only address the reminder is ever sent to. To
send to other accounts later, verify a domain (below) and change
`EMAIL_FROM`. Staging stays off (its test account has no real inbox).

It turns on when the API has all three of
`EMAIL_PROVIDER`, `EMAIL_API_KEY` and `EMAIL_FROM`. Until then Profile says
email reminders are not available yet and `PUT /reach/email {on:true}` is
refused (turning it off always works).

## What it sends

- Once per Nairobi day, only when something is due, only to owners who
  turned on **Profile → Morning reminders → Email me too**. It shares the
  day claim (`users.digest_sent_on`) with the phone reminder, so a second
  cron run sends nothing.
- Counts only — "Today: 2 follow-ups and 1 birthday." — never names,
  notes or numbers: the email passes through the provider and sits in an
  inbox. Links go to `/today` and `/account` on the first `WEB_ORIGIN`.
- In the owner's language (`users.locale`). No images, no tracking pixels.
- "Send a test email" in Profile (3 a minute).

## Turning it on

1. **A domain.** The owner needs a domain they control (for example a
   `.co.ke`). Use a subdomain for sending, such as `mail.example.co.ke`,
   so the main domain's reputation is separate.
2. **Pick a provider** (free tiers, checked 2026-09 — re-check):
   - **Resend** — 3,000 emails a month, 100 a day. Simple API.
   - **Brevo** — 300 emails a day.
     Either is plenty for morning reminders.
3. **Verify the domain** at the provider: add the SPF, DKIM (and
   return-path) DNS records it gives you; wait until it shows verified. Add
   a DMARC record (`v=DMARC1; p=none; rua=mailto:you@example.co.ke`) to
   start, tightening later.
4. **Create an API key** with send-only permission.
5. **Set on both Render services** (staging first):

   | Variable         | Example                                         |
   | ---------------- | ----------------------------------------------- |
   | `EMAIL_PROVIDER` | `resend` or `brevo`                             |
   | `EMAIL_API_KEY`  | the key (secret; never logged or returned)      |
   | `EMAIL_FROM`     | `Contact Sphere <reminders@mail.example.co.ke>` |

   The API refuses to start with a half configuration or a sender that is
   not a plain address.

6. **Deploy, then check:** Profile → Morning reminders → Email me too →
   Send a test email. It should arrive within a minute (check spam the
   first time and mark it "not spam").

## Turning it off

Remove `EMAIL_PROVIDER` and redeploy. Owners' choices are kept
(`users.digest_email`), so it resumes if turned back on.
