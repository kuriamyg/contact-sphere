# Contact Sphere — why it should exist, and how it wins

_Written 2026-09-26 after Phase 5a, from desk research (sources at the end).
A living document: revisit after every user interview round._

## 1. The honest starting point

What is live today — sign-in with two-factor, contacts with search and
sort, archive and trash, `.vcf` import and export — is **table stakes**.
Samsung Contacts and Google Contacts do all of it, for free, already on the
phone. Nobody will switch for that. It was the necessary foundation (secure
accounts, a clean data model, reliable import), not the product.

The product is what the phone's contacts app **cannot** do. Google Contacts
"is a great address book and a poor personal CRM": no reminders, no
interaction history, nothing proactive — "it's a list, not a system".
Contact Sphere must be the system.

## 2. Problems Kenyans actually have with their contacts

| #   | Problem                                                                                                                                                                                                                      | Evidence                                                                                                                                            | What the phone app does                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | **Losing everything** when a phone is stolen, lost or swapped; contacts saved on the SIM or an old phone.                                                                                                                    | Phone theft is common; SIM-swap cases on Safaricom rose sharply 2024→25. Safaricom even charges for contact backup (KES 1/week, KES 25 to restore). | Backup only if you set up Google/Samsung correctly — many never do.                 |
| 2   | **"Who do I know who…?"** Kenyans save people by role — _Otieno Plumber, Kevo Boda, Mama Mboga Gate B, Wakili John_ — because the name is less useful than what they do and where.                                           | The informal economy (fundis, boda riders, mama mbogas) runs on "who-knows-whom".                                                                   | Plain text search only; no skills, areas or "who referred them".                    |
| 3   | **Communities, not lists.** Chama, church, family, alumni, estate WhatsApp groups, harambee and funeral committees. Chamas are a national institution.                                                                       | Chama apps (MyChama, PayTrack Chama, Tunza) digitise money — not the people.                                                                        | Labels at best; no roles (chair, treasurer), no shared, consented member lists.     |
| 4   | **Forgetting** birthdays, anniversaries, people you have not spoken to in months, what you promised someone.                                                                                                                 | This is exactly what paid personal CRMs (Dex, Covve, Monica, Mesh/Clay) sell.                                                                       | Nothing.                                                                            |
| 5   | **Years of mess**: the same person saved 3 times across SIMs and phones, numbers in 0712/+254712 formats.                                                                                                                    | Every import we test shows repeats.                                                                                                                 | Basic "merge" suggestions, not explainable, not reversible.                         |
| 6   | **Privacy fear.** Truecaller (active on 20–45% of smartphones in Kenya) is being sued in Kenya for collecting Kenyans' contacts without consent; the ODPC fined digital lenders KES 5M for abusing borrowers' contact lists. | Court filings and ODPC determinations.                                                                                                              | The phone apps are private but passive; the "smart" apps harvest your address book. |

## 3. The position

> **Contact Sphere: the private relationship memory for Kenyans.**
> Never lose a contact, always find the right person, never forget the
> people who matter — and your contacts are never sold, shared or scraped.

The difference in one line each:

- **vs Samsung/Google Contacts** — they store numbers; we remember relationships (who, what they do, where, which community, when you last spoke, what's coming up).
- **vs Truecaller** — they build a global directory from everyone's address book; we never share your contacts with anyone, ever. Kenya Data Protection Act compliant by design (it already is: least-privilege database, audit trail without personal data, two-factor sign-in).
- **vs Dex / Covve / Monica** — they are built for American networkers at USD 9–20 a month, around LinkedIn and email. We are built for Kenyan life — chamas, church, family, fundis, WhatsApp, M-Pesa — at a Kenyan price.

## 4. What we must build to earn the switch (ranked by demand)

1. **Clean-up that feels like magic** — duplicate review and safe merge (Phase 5b). The first "wow" right after import.
2. **Know-who search** — tags for skills/services (_plumber, boda, lawyer, doctor_), area/estate, "met through", free-text notes, all searchable: "plumber Kasarani" finds Otieno. Saved searches.
3. **Communities** — groups with roles (chama, church, family, work), member counts, quick "message the group on WhatsApp", export a group to share with the chama app.
4. **Today screen + reminders** — birthdays and anniversaries today/this week, "you haven't spoken to Mum's sister in 3 months", follow-ups you set. Delivered where Kenyans are: **WhatsApp or SMS**, plus email.
5. **Always backed up, restore anywhere** — automatic, encrypted; one tap to get everything onto a new phone.
6. **Lives on the phone** — installable app (PWA now; Android app next) and, the adoption unlock, **two-way sync with the phone's own contacts** so there are never two address books to maintain. Consent-based, own-account only — never uploaded to a shared directory.
7. **Share yourself, not others** — a digital business card / QR to swap contacts at church, events and business meetings; the person receiving it gets a one-tap "save" (and meets Contact Sphere: the viral loop).
8. **Relationship map** — family tree and "who introduced whom", for the curious and for family/community organisers.
9. **Swahili (and later Sheng-friendly) interface**; works on a KES 5,000 Android phone and on patchy data.

## 5. Business model (subscription, M-Pesa first)

Free must be genuinely useful — it is how word of mouth starts — and hold
a whole phone book. Paid tiers sell **automation, reminders and sharing**,
which cost us money (SMS/WhatsApp messages, storage) and deliver ongoing value.

| Plan          | Price (proposal)                     | For                                    | Includes                                                                                                                                                                                       |
| ------------- | ------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free**      | KES 0                                | everyone                               | Unlimited contacts, backup + restore, import/export, duplicate clean-up, know-who tags and search, 3 groups, birthday list in app                                                              |
| **Plus**      | **KES 99 / month** or KES 990 / year | individuals                            | Reminders by WhatsApp/SMS/email, keep-in-touch cadences, unlimited groups with roles, interaction notes/timeline, relationship map, business card QR, automatic encrypted backups with history |
| **Family**    | KES 249 / month                      | up to 5 people                         | Plus for each, and a shared family directory (consented)                                                                                                                                       |
| **Business**  | KES 499 / month                      | fundis, shops, agents, SMEs            | Customer tags and follow-ups, 2–5 team members with a shared customer list, message credits, CSV export                                                                                        |
| **Community** | KES 1,500 / month                    | chamas, churches, associations, alumni | Consented member directory, roles, birthday/event announcements to members, import from registers                                                                                              |

- **Payment:** M-Pesa STK Push via Daraja for sign-up and renewals; M-Pesa Ratiba (standing orders) for automatic monthly billing; card later. Lipa na M-Pesa fees are ~0.5% (capped), so KES 99 is viable.
- **Reference prices:** Covve Pro €4.99/mo (free tier: 20 tracked people), Monica $9/mo, Mesh (Clay) ~$10/mo, Dex $12–20/mo. KES 99 ≈ USD 0.77 — priced for Kenya, not Silicon Valley.
- **Never** sell, share or advertise on contact data. This is the brand, and in Kenya it is also the law (Data Protection Act 2019; fines up to KES 5M).

## 6. Go-to-market, Kenya first

- **Beachheads:** chama officials and church administrators (one official brings 20–50 members), then fundis and small businesses (customers = contacts), then individuals via the business-card QR and "import your phone in 1 minute".
- **Proof before scale:** 20 interviews (chama treasurers, church secretaries, boda riders, mama mbogas, young professionals), a landing page with a waitlist, a closed beta of 50 users. Success = weekly active use after 4 weeks and a first paid conversion.
- **Before charging anyone:** register with the ODPC as a data controller/processor, publish a privacy policy and terms, account deletion, open sign-up with phone-number OTP, and M-Pesa billing.

## 7. Roadmap

### Done (live in production, each verified on staging then production)

| Phase            | What shipped                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| 0 Planning       | Handoff analysis, 13 ADRs, threat model, backlog                             |
| 1 Foundation     | Monorepo, Next.js web on Vercel, NestJS API on Render, CI                    |
| 2 Database       | Neon Postgres, migrations, least-privilege roles, append-only audit          |
| 3 Authentication | Owner setup, sessions, rate limits, CSP, TOTP two-factor with recovery codes |
| 4 Contacts       | Create/edit, E.164 numbers (KE default), search, sort, archive, 30-day trash |
| 5a Import/export | `.vcf` 2.1/3.0/4.0 import with preview and repeat-skipping; export           |
| 6a Profile       | Profile page with avatar ring, name, stats, security, sign-out; polish       |
| 5b Clean-up      | Duplicates with reasons, review, safe merge, undo for 30 days                |

### Next, in order (why this order: each step makes the next one valuable)

| Phase               | What                                                                                                                                 | Why now                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **7 Know-who**      | Tags (skills/services), area, "met through", notes search, saved searches                                                            | The everyday reason to open the app instead of the dialler |
| **8 Communities**   | Groups with roles, WhatsApp-the-group, group export                                                                                  | Chama/church beachhead                                     |
| **9 Remember**      | Important dates, keep-in-touch cadences, follow-ups, a Today screen, email digest                                                    | Makes the app proactive — the core paid value              |
| **10 On the phone** | Installable PWA + offline; Android app with consented two-way phone sync                                                             | Removes "two address books" — the adoption unlock          |
| **11 Reach**        | WhatsApp/SMS reminders, business card QR, Swahili                                                                                    | Where Kenyans are; the viral loop                          |
| **12 Commercial**   | Open sign-up (phone OTP), plans, M-Pesa billing, ODPC registration, privacy policy, account deletion, encrypted backups with history | Required before charging                                   |
| **13 Map**          | Relationship map (family tree, introductions)                                                                                        | Delight and differentiation once data is rich              |

## 8. Risks to watch

- **Two address books** — without phone sync, busy people won't maintain a second list. Phase 10 is not optional.
- **Willingness to pay** — test KES 99 in the beta before building every tier.
- **Messaging costs** — WhatsApp/SMS reminders cost per message; price tiers must cover them.
- **Trust** — one privacy mistake ends the brand. Keep the current discipline (tests that audit logs hold no contact data, owner isolation tests, least privilege).

## Sources

- Truecaller in Kenya — lawsuit and adoption: [Daily Nation](https://nation.africa/kenya/news/truecaller-sued-in-kenya-over-privacy-violations-4784224), [Business & Human Rights Centre](https://www.business-humanrights.org/en/latest-news/kenya-truecaller-sued-for-breaching-privacy/), [Dawan Africa](https://www.dawan.africa/news/truecaller-launches-advertising-services-in-kenya-and-south-africa-to-tap-growing-mobile-market), [Streamline Feed](https://streamlinefeed.co.ke/news/truecaller-hits-500-million-users-amid-transition-to-business-first-model)
- Data Protection Act and ODPC enforcement: [CMS](https://cms.law/en/ken/news-information/enforcement-of-the-data-protection-laws-the-rising-role-of-the-odpc), [Clyde & Co](https://www.clydeco.com/en/insights/2023/10/data-protection-compliance-in-kenya-odpc), [Mukamba Law on digital lenders](https://mukambalaw.com/digital-lenders/), [Securiti](https://securiti.ai/kenya-data-protection-act-dpa/)
- Personal CRM market and pricing: [Dex personal CRM list](https://getdex.com/blog/personal-crm-list/), [OnePageCRM](https://www.onepagecrm.com/blog/best-personal-crm/), [Covve review](https://getdex.com/blog/covve-review/), [Covve reminders](https://help.covve.com/help/in-touch-stay-in-touch-with-your-most-important-contacts-and-keep-them-warm-for-when-you-need-them-most), [Monica review](https://getdex.com/blog/monica-review/)
- Google Contacts limits: [Social Compass](https://socialcompass.social/blog/google-contacts-as-personal-crm.html), [Copper](https://www.copper.com/resources/google-contacts-crm)
- Kenya mobile market: [Techweez smartphones](https://techweez.com/2026/04/07/kenya-smartphones-penetration-feature-phone-decline/), [TechMoran](https://techmoran.com/2026/09/20/kenya-mobile-subscriptions-hit-88-million/), [WhatsApp in Africa](https://www.askyazi.com/articles/whatsapp-penetration-across-africa-statistics-by-country)
- Contact loss and backup: [Safaricom Contacts Back Up](https://www.safaricom.co.ke/media-center-landing/terms-and-conditions/contacts-back-up), [SIM swap](https://en.wikipedia.org/wiki/SIM_swap_attack)
- Chamas and harambee: [Chama](<https://en.wikipedia.org/wiki/Chama_(investment)>), [MyChama](https://mychama.app/), [PayTrack Chama](https://chama.paytrack.co.ke/), [Tunza](https://tunza.ke/fundraising-app-kenya)
- M-Pesa billing: [Daraja overview](https://github.com/api-evangelist/mpesa), [Hostiko Daraja guide](https://hostiko.co.ke/blog/mpesa-integration-kenya-daraja-api)
- Installable web apps: [web.dev PWA](https://web.dev/learn/pwa/progressive-web-apps), [MagicBell](https://www.magicbell.com/blog/pwa-vs-native-app-when-to-build-installable-progressive-web-app)
