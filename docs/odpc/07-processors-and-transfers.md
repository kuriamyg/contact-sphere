# 07 — Processors and transfers outside Kenya (DPA s.42, s.48–50)

## Processors

| Processor                                | Role                                                                         | Data                                                                            | Location                                                        | Terms                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Neon**                                 | PostgreSQL database and backups                                              | All stored data                                                                 | Frankfurt, Germany (AWS eu-central-1)                           | Neon Data Processing Addendum; GDPR                                              |
| **Render**                               | Runs the API                                                                 | All data in transit and in memory                                               | Frankfurt, Germany                                              | Render DPA; GDPR                                                                 |
| **Vercel**                               | Runs the web server; global network for pages                                | All data in transit                                                             | Functions in Frankfurt (`fra1`); static files from a global CDN | Vercel DPA; GDPR                                                                 |
| **Resend**                               | Email reminders — only if a user switches them on                            | User's email address; counts                                                    | United States / EU                                              | Resend DPA; EU standard contractual clauses                                      |
| **Google, Apple, Mozilla** push services | Deliver phone reminders — only if switched on                                | Push endpoint; encrypted payload (counts)                                       | Global                                                          | Browser vendors' push terms; payload end-to-end encrypted (RFC 8291)             |
| **Have I Been Pwned**                    | Breached-password check                                                      | 5 hex characters of a SHA-1 hash — not personal data                            | Global CDN                                                      | k-anonymity: nothing identifies the user                                         |
| **Africa's Talking**                     | SMS codes for sign-up and password reset                                     | Mobile number; the text with the code                                           | Nairobi, Kenya                                                  | Africa's Talking terms and privacy policy; Kenyan company (DPA applies directly) |
| **Google** (identity provider)           | "Continue with Google" — only if the person chooses it                       | Tells us the Google account id, email and name; receives nothing about contacts | Global                                                          | Google's terms; the person signs in with Google directly                         |
| **Safaricom (M-Pesa)**                   | Payment prompt (STK push) — only when in-app payment is on and the user pays | M-Pesa number; amount                                                           | Kenya                                                           | Daraja terms; Kenyan company (DPA applies directly)                              |
| **GitHub**                               | Source code and CI                                                           | No personal data (demo data only in tests)                                      | United States                                                   | Not a processor of personal data                                                 |

**Action for the owner:** download and keep the signed/accepted DPAs from the Neon,
Render, Vercel and Resend dashboards, and Africa's Talking's terms (each offers one), in a private folder.

## Transfers outside Kenya

Personal data is stored and processed in the **European Union (Germany)**.

- **Basis (s.48):** the EU's General Data Protection Regulation gives protection at
  least equivalent to the DPA; each processor is bound by a data processing agreement
  with appropriate safeguards (s.48(a)); the transfer is necessary to perform the
  contract with the user (s.48(c)).
- **Why not in Kenya:** no provider with managed PostgreSQL, the required security
  features and a free tier operates a Kenyan region; Frankfurt is the closest suitable
  region to Kenya with EU-level protection.
- **Sensitive data (s.49):** not processed by design.
- **Records:** this file is the record of the transfers and their safeguards, and it
  is updated when a processor or region changes.
