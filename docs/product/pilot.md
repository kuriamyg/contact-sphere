# Pilot playbook — the first clients

How a pilot client goes from "heard about it" to "paying", and what to
watch. For the operator (you). No personal details in this file — the
operator page has them.

## Before the first pilot (one-time)

1. Production sign-up is on: `OPEN_SIGNUP=on`,
   `SIGNUP_METHODS=google,password` (ADRs 0020, 0021). Check: `/signup`
   shows "Continue with Google" and the phone + password form.
2. `BILLING_PAY_TO` is set on the production API ("Send Money to 07xx xxx
   xxx (Your Name)"), so Profile → Your plan tells people how to pay.
3. Google OAuth app is "In production" (Google Cloud → Audience), so any
   Google account can sign in.
4. Nice to have: the API on a paid Render instance, so the first page does
   not take ~50 seconds to wake up (E2 in `docs/unfinished-business.md`).
5. Sign up once yourself with a second account to feel the flow.

## The client's journey

| Step | What they do                                                                  | What you see on /operator            |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------ |
| 1    | Open the link you send: `https://<site>/signup`                               | —                                    |
| 2    | **Continue with Google**, or mobile number + password                         | A new account, "Plus" (30-day trial) |
| 3    | Password sign-up only: save the **recovery key** (Copy → keep it safe)        | —                                    |
| 4    | The **tour** shows Today, Contacts, Groups, Search and the account            | —                                    |
| 5    | Import their phone's contacts (.vcf) or add a few                             | Contacts count rises                 |
| 6    | Add birthdays/follow-ups; turn on morning reminders; make an encrypted backup | "Last seen" stays recent             |
| 7    | 5 days before the trial ends: a banner and a morning reminder ("Keep Plus")   | Plan still "Plus"                    |
| 8    | Day 30: trial ends → "You're on the free plan now"                            | Plan turns "Free"                    |
| 9    | Pay: Send Money to your pay line (the M-Pesa prompt comes with B9b)           | Record the M-Pesa code → Plus again  |

Forgot password? Google users just sign in with Google. Password users
use "Forgot your password?" with their number and recovery key.

## Pilot terms (suggested)

- Pilots get **3 free months** (operator page → Give free months → 3), in
  exchange for a 15-minute chat at week 2 and week 6.
- After that, KES 99 a month. Say so on day one — the point of a pilot is
  to learn whether people pay.

## What to ask at week 2 and week 6

1. What did you open it for this week? (Today, search, a group, a birthday)
2. What made you go back to the phone's own contacts instead?
3. Would you pay KES 99 a month for it? What would make it worth that?
4. Who else should use it? (chama, church, customers)
5. Did the tour help? Anything confusing on the first day?

## Success (from the strategy)

Weekly use after 4 weeks, and a first payment.
