# Pilot playbook — the first clients

How a pilot client goes from "heard about it" to "paying", and what to
watch. For the operator (you). No personal details in this file — the
operator page has them.

## Before the first pilot (one-time)

1. Production sign-up is on (`OPEN_SIGNUP=on`, a live Africa's Talking key,
   ADR 0018). Check: `/login` shows "Create an account".
2. `BILLING_PAY_TO` is set on the production API ("Send Money to 07xx xxx
   xxx (Your Name)"), so Profile → Your plan tells people how to pay.
3. The API is on a paid Render instance, so the first page does not take
   ~50 seconds to wake up.
4. Sign up once yourself with a second number to feel the flow.

## The client's journey

| Step | What they do                                                    | What you see on /operator                    |
| ---- | --------------------------------------------------------------- | -------------------------------------------- |
| 1    | Open the link you send: `https://<site>/signup`                 | —                                            |
| 2    | Mobile number → SMS code → name and password                    | A new account, "Plus", 0 contacts            |
| 3    | Import their phone's contacts (.vcf) or add a few               | Contacts count rises                         |
| 4    | Add birthdays/follow-ups; turn on morning reminders             | "Last seen" stays recent                     |
| 5    | Day 30: trial ends → Profile → Your plan explains Free and Plus | Plan turns "Free"                            |
| 6    | Pay: the M-Pesa prompt (once Daraja is live), or Send Money     | Prompt: shows paid. By hand: record the code |

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

## Success (from the strategy)

Weekly use after 4 weeks, and a first payment.
