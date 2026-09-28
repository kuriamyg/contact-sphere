# 03 — Data protection impact assessment (DPA s.31)

System: Contact Sphere · Assessor: Moses Mwangi Kuria · Date: 28 September 2026 ·
Review: before public sign-up (B6), before billing (B9), and yearly.

## 1. Why a DPIA

Not strictly required yet (no large-scale sensitive data, no systematic monitoring),
but the app holds **data about people who never signed up** (users' contacts) and is
about to open to the public, so the risks are assessed now.

## 2. Description

A single-tenant-per-user web app: each user sees only their own data. Browsers talk
only to the Next.js web server (Vercel, Frankfurt), which alone calls the NestJS API
(Render, Frankfurt), which alone reaches PostgreSQL (Neon, Frankfurt). An optional
offline copy lives in the user's own browser. No advertising, analytics or data
sharing. Data inventory: [02-record-of-processing.md](02-record-of-processing.md).

## 3. Necessity and proportionality

- **Minimal fields:** only what an address book needs; birthdays and notes optional.
- **No tracking:** no analytics or advertising SDKs; only necessary cookies.
- **Purpose limitation:** contact data is used only to show it back to its owner and
  compute their reminders. Reminders carry counts, not names.
- **User control:** export (.vcf), edit, trash with 30-day recovery, full account
  deletion — all self-service.
- **Transparency:** public privacy policy and terms; Kiswahili summary.

## 4. Risks and controls

| Risk to people                                       | Likelihood | Impact | Controls in place                                                                                                                | Residual                               |
| ---------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Account takeover exposes a user's whole address book | Medium     | High   | argon2; breached-password check; optional TOTP; per-IP and per-account lock-out; device list with sign-out; HttpOnly cookie; CSP | Low                                    |
| One user sees another user's contacts                | Low        | High   | Owner id on every row; composite foreign keys; every query scoped by owner; e2e tests for cross-owner isolation                  | Low                                    |
| Database leak via the application                    | Low        | High   | Least-privilege app role; no raw SQL from input; validation on every request; only the web server can call the API               | Low                                    |
| Contact details leak into logs                       | Low        | Medium | Structured logs without bodies, headers or query strings; errors reduced to type and frames; tests scan real logs                | Low                                    |
| Lost or shared phone shows the offline copy          | Medium     | Medium | Offline copy is opt-in; wiped on sign-out, "sign out everywhere", any 401, and account deletion                                  | Low–medium (device lock is the user's) |
| Users store contacts' sensitive data in notes        | Medium     | Medium | Terms ask users to store only what they need; notes never logged or sent in reminders                                            | Medium — accepted                      |
| Group texts used to spam                             | Low        | Medium | Texts go from the user's own phone and SIM; terms forbid unsolicited messages                                                    | Low                                    |
| Data outside Kenya                                   | Certain    | Low    | EU (GDPR) storage; processor terms; see 07                                                                                       | Low                                    |
| Provider breach (Neon, Render, Vercel)               | Low        | High   | Reputable processors with security certifications; encryption in transit and at rest by the providers; breach plan (05)          | Low–medium                             |
| Data kept longer than needed                         | Low        | Low    | Trash purge at 30 days; immediate deletion; retention schedule (08)                                                              | Low                                    |

## 5. Before public sign-up (B6)

- Phone verification by SMS adds a processor (Africa's Talking or a phone gateway):
  update 02, 07 and this DPIA, and the privacy policy, before it goes live.
- Consider limits per account to reduce the blast radius of abuse.

## 6. Conclusion

Residual risk is **low to medium** and acceptable for launch with the controls above.
No prior consultation with the ODPC (s.31(4)) is needed.
