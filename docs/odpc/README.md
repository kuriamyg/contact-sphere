# ODPC registration pack — Contact Sphere

Everything needed to register Contact Sphere with Kenya's **Office of the Data
Protection Commissioner (ODPC)** under the Data Protection Act, 2019 (DPA) and the
Data Protection (Registration of Data Controllers and Data Processors) Regulations,
2021 (Legal Notice 265).

> Prepared from the code and hosting as they are on 28 September 2026. This is a
> working compliance pack, not legal advice — for anything uncertain, confirm with
> the ODPC or an advocate. This repository is public: **never put your ID number,
> KRA PIN, phone number or other identifiers in these files** — type them into the
> ODPC portal only.

## 1. Do we have to register?

| Test (Registration Regulations, reg. 13 and Third Schedule)                                                                                                                                                       | Contact Sphere today                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Annual turnover above KES 5,000,000 **and** more than 10 employees                                                                                                                                                | No — no revenue yet, one person                                                             |
| Processes data for a Third Schedule purpose (political canvassing, crime prevention, gambling, education, health, hospitality, property, financial services, telecoms, direct marketing, transport, genetic data) | No — a contacts and reminders app; it does not market to the people in users' address books |

**Result:** registration is **not yet mandatory**, but the Act's duties (lawful
basis, security, rights, breach notification) apply regardless.

**Recommendation: register voluntarily before opening sign-up to the public (B6)**,
because:

- other people's data (users' contacts) will be held at scale, and
- a registration certificate is a trust signal for chamas and churches, and
- it becomes mandatory the moment turnover passes KES 5M or billing turns the app
  into a financial-services-adjacent business — better to be registered already.

Re-check this table when paid plans launch (B9), when turnover approaches KES 5M,
or if staff are hired.

## 2. Cost

| Category (Registration Regulations, First Schedule)                            | Registration  | Renewal (every 2 years) |
| ------------------------------------------------------------------------------ | ------------- | ----------------------- |
| **Micro / small** — 1–50 employees, turnover up to KES 5M ← **Contact Sphere** | **KES 4,000** | KES 2,000               |
| Medium — 51–99 employees, KES 5M–50M                                           | KES 16,000    | KES 9,000               |

## 3. Steps (owner)

1. Read this pack (about 20 minutes).
2. Go to the ODPC registration portal (from [odpc.go.ke](https://www.odpc.go.ke)) and
   create an account as an **individual / sole proprietor** data controller.
3. Fill in the form with the prepared answers in
   [01-registration-answers.md](01-registration-answers.md) (copy and paste). Add
   your identity details (ID, KRA PIN, phone) directly on the portal.
4. Upload, when asked, PDFs of:
   - the privacy policy (print `https://contact-sphere-nine.vercel.app/privacy`),
   - [04-data-protection-policy.md](04-data-protection-policy.md),
   - [03-dpia.md](03-dpia.md) if a DPIA is requested.
5. Pay KES 4,000 (M-Pesa or card, as the portal offers).
6. Keep the certificate. Tell me the registration number: it goes into the privacy
   policy and the footer, and the renewal date goes into the backlog.

## 4. What is in this pack

| File                                                             | What it is                                        | Where the law asks for it           |
| ---------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- |
| [01-registration-answers.md](01-registration-answers.md)         | Ready answers for every registration field        | DPA s.19; Registration Regs. reg. 4 |
| [02-record-of-processing.md](02-record-of-processing.md)         | Record of processing activities                   | DPA s.19(2), s.41                   |
| [03-dpia.md](03-dpia.md)                                         | Data protection impact assessment                 | DPA s.31                            |
| [04-data-protection-policy.md](04-data-protection-policy.md)     | Internal data protection policy                   | DPA s.25, s.41                      |
| [05-breach-response.md](05-breach-response.md)                   | Breach response plan (72 hours to the ODPC)       | DPA s.43                            |
| [06-data-subject-requests.md](06-data-subject-requests.md)       | Handling access, correction, erasure, portability | DPA s.26; General Regs. regs 9–12   |
| [07-processors-and-transfers.md](07-processors-and-transfers.md) | Processors and transfers outside Kenya            | DPA s.42, s.48–50                   |
| [08-retention-schedule.md](08-retention-schedule.md)             | How long each kind of data is kept                | DPA s.39                            |

## 5. Keeping it true

These documents describe the system. When the system changes — a new processor
(SMS for sign-up codes, M-Pesa billing), new data, a new region — update the
matching file in the same pull request, like the threat model and the privacy
policy (ADR 0017).
