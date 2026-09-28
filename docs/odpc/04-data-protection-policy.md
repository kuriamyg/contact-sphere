# 04 — Data protection policy

Contact Sphere · Owner: Moses Mwangi Kuria · Effective 28 September 2026

This policy is how Contact Sphere meets the Data Protection Act, 2019. It applies to
all personal data the service handles, and to anyone who ever works on it.

## Principles (DPA s.25)

1. **Lawful, fair and transparent** — a clear basis for every use; a public privacy
   policy in plain language, with a Kiswahili summary.
2. **Purpose limitation** — data is used only to provide the service to the user who
   stored it, and to keep it secure.
3. **Data minimisation** — no field is added without a need; no analytics, no
   advertising, no selling or sharing.
4. **Accuracy** — users can correct everything themselves at any time.
5. **Storage limitation** — the retention schedule (08) is enforced in code.
6. **Security** — see the controls in the DPIA (03) and `docs/security/threat-model.md`.
7. **Accountability** — records (02), decisions (`docs/decisions/`), and this pack are
   kept current in the repository, reviewed with every change.

## Rules for building and running the service

- **Privacy by design (s.41):** every new feature states what data it touches; new
  processors, fields or regions update 02, 07 and the privacy policy in the same pull
  request.
- **Least privilege:** the application uses a restricted database role; owner access
  is used only for migrations.
- **No personal data in logs, errors, URLs or analytics.** Tests enforce it.
- **Secrets** live only in the hosting providers' secret settings, never in code.
- **Two-factor authentication** on every provider account (GitHub, Neon, Render,
  Vercel, Resend, SMS provider).
- **Testing uses made-up data only.** Production data is never copied to staging or a
  developer machine.
- **Changes are reviewed and tested** (automated tests and a staging check) before
  production.

## People's rights

Handled as set out in [06-data-subject-requests.md](06-data-subject-requests.md),
within the legal time limits.

## Breaches

Handled as set out in [05-breach-response.md](05-breach-response.md): the ODPC within
72 hours, affected people without undue delay.

## Processors

Only processors listed in [07-processors-and-transfers.md](07-processors-and-transfers.md),
each bound by written terms that meet s.42.

## Review

Yearly, and whenever the service changes materially. Next review: September 2027.
