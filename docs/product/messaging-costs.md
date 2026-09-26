# Messaging in Kenya: what it costs, and what we built (Phase 11)

Researched 2026-09-26. Prices change; re-check before quoting to customers.
Figures are per SMS part (160 plain characters, or 70 with an emoji).

## Options compared

| Route                                                       | Cost per SMS                                   | 1,000 people, 1 SMS each         | Setup                                 | Notes                                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------- | -------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner's own phone, Safaricom weekly bundle** (dial *188#) | ~KES 0.03                                      | **~KES 30**                      | none                                  | 1,000 SMS/week for KES 30; unlimited KES 50/week. Fair use: 1,000 SMS/day, 7,000/week. Personal use only — not marketing. On-net and off-net. |
| Owner's own phone, monthly bundle                           | ~KES 0.06–0.07                                 | ~KES 67 (from 1,500 for KES 100) | none                                  | 3,500 for KES 200.                                                                                                                            |
| Owner's own phone, no bundle                                | ~KES 1                                         | ~KES 1,000                       | none                                  | Standard rate.                                                                                                                                |
| Celcom Africa (aggregator API)                              | KES 0.25–0.60 by volume                        | KES 250–600                      | account; sender ID                    | partnerID/apikey "sendbulk" API.                                                                                                              |
| Mobitech                                                    | KES 0.35 flat                                  | KES 350                          | account; sender ID                    |                                                                                                                                               |
| Advanta                                                     | KES 0.30–0.80, negotiable                      | KES 300–800                      | account; sender ID                    | Same API shape as Celcom.                                                                                                                     |
| Africa's Talking                                            | from ~KES 0.80                                 | ~KES 800                         | account; sender ID                    | The owner's reference point: too dear.                                                                                                        |
| Safaricom direct bulk                                       | KES 1 (25,000 for KES 25,000)                  | KES 1,000                        | PRSP licence                          | Only for registered providers.                                                                                                                |
| WhatsApp Business API                                       | utility ~KES 0.80, marketing ~KES 5.20         | KES 800–5,200                    | Meta business verification, templates | Costlier than SMS.                                                                                                                            |
| `wa.me` link, one person at a time                          | free (data)                                    | —                                | none                                  | What the app already uses per contact.                                                                                                        |
| **Web Push to the installed app**                           | **free**                                       | **free**                         | VAPID keys                            | Owner's own reminders only. Android: works in Chrome. iPhone: only after Add to Home Screen (iOS 16.4+).                                      |
| Email (Resend / Brevo free tiers)                           | free up to 100/day (Resend) or 300/day (Brevo) | —                                | domain verification                   | Not built yet; a later option for the digest.                                                                                                 |

A branded sender ID costs about KES 4,500–15,000 once per network with an
aggregator; shared sender IDs cost nothing to start.

## What we built

1. **Morning reminders on the phone — free.** Web Push, once a day at about
   07:00 Nairobi (Vercel Cron → `/cron/digest` → API `POST /reach/digest/run`).
   Only when something is due, at most once a day, and the text is counts
   only ("Today: 2 follow-ups and 1 birthday.") because it shows on a locked
   screen.
2. **Text the group from my phone — cheapest (~KES 30 per 1,000 on a
   bundle).** The group's numbers in batches (10/20/50/100 per tap); each
   tap opens the phone's Messages app with numbers and text filled in. The
   screen counts SMS parts as you type (warns when an emoji triples the
   cost), estimates bundle and pay-as-you-go cost, and explains how to send
   as separate texts rather than a group MMS.
3. **Send through Contact Sphere — wired, off until billing.** One adapter
   for the partnerID/apikey/shortcode API (Celcom, Advanta, TextSMS),
   batches of 20, Kenyan mobiles only, per-owner monthly limit, quote before
   send, usage kept as counts in `sms_sends` (never the text or numbers).
   Off unless `SMS_PROVIDER`, keys and `SMS_MONTHLY_LIMIT` are set — turn on
   with Phase 12 (M-Pesa billing), priced from the cheapest aggregator.
4. **QR business card.** "This is me" on your own contact → `/card` shows a
   QR any phone camera saves as a contact; any contact can be shared the same
   way. Only name, work, numbers and emails — never notes, tags or birthday.

## Sources

- Celcom pricing: https://celcomafrica.com/bulk-sms-pricing
- Mobitech: https://mobitechtechnologies.co.ke/bulksms
- Advanta: https://advantasms.com/price ; API shape: https://packagist.org/packages/advanta_africa/sms_api
- Comparisons: https://techweez.com/2025/03/18/cheapest-bulk-sms-service-provider-in-kenya/ ,
  https://techweez.com/2025/08/26/top-6-affordable-bulk-sms-api-gateways-in-kenya/ ,
  https://mocky.co.ke/blog/bulk-sms-marketing-in-kenya-costs-compliance-and-roi-guide-for-smes-in-2026
- Safaricom SMS bundles and fair use: https://www.safaricom.co.ke/media-center-landing/terms-and-conditions/daily-weekly-and-monthly-sms-bundles-terms-and-conditions
- Consumer bundles not for marketing; Safaricom direct bulk: https://simplesellable.com/news/29/safaricom-bulk-sms
- Sender ID costs: https://oramobile.co.ke/what-is-bulk-sms-branded-sender-id-alphanumeric-id-prices-in-kenya/ ,
  https://www.sokosauti.com/guides/bulk-sms-marketing-kenya
- WhatsApp Business pricing: https://mocky.co.ke/blog/whatsapp-automation-kenya-costs-use-cases-and-workflow-ideas-for-smes-in-2026
- Web Push on iPhone PWAs: https://documentation.onesignal.com/docs/en/web-push-for-ios
- Email free tiers: https://automationatlas.io/answers/resend-free-tier-explained-2026/ ,
  https://www.fastlancer.org/en/fastlancer-blog/brevo-review/
