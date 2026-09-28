# 01 — Answers for the ODPC registration form

Copy these into the portal. Fields marked **(portal only)** hold personal
identifiers — type them there, never here.

## Applicant

| Field                   | Answer                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                    | Data controller — individual (sole proprietor)                                                                                                                |
| Name                    | Moses Mwangi Kuria                                                                                                                                            |
| Trading name            | Contact Sphere                                                                                                                                                |
| ID / passport number    | **(portal only)**                                                                                                                                             |
| KRA PIN                 | **(portal only)**                                                                                                                                             |
| Phone                   | **(portal only)**                                                                                                                                             |
| Email                   | kuriam177@gmail.com                                                                                                                                           |
| Physical location       | Nairobi, Kenya **(add building/road on the portal)**                                                                                                          |
| Website                 | https://contact-sphere-nine.vercel.app                                                                                                                        |
| Size category           | Micro / small (1 person, turnover under KES 5M)                                                                                                               |
| Also a data processor?  | Yes, for the contact details users store about other people (processed only to provide the service to that user)                                              |
| Data protection officer | Not required (DPA s.24 — core activities are not large-scale systematic monitoring or sensitive data). Contact point: Moses Mwangi Kuria, kuriam177@gmail.com |

## Description of the business

> Contact Sphere is a web application (installable on phones) that lets a person keep
> their contacts, groups (for example chamas and church groups), birthdays and
> follow-up reminders in one private place, and reach those people by call, SMS or
> WhatsApp from their own phone. It works offline. There is no advertising, no sale
> of data and no analytics tracking.

## Purposes of processing

1. Providing the service: storing and showing the user's contacts, groups, follow-ups
   and reminders; importing and exporting contacts (vCard).
2. Account management and security: sign-in, two-factor authentication, device
   sessions, rate limiting, abuse prevention, security audit log.
3. Reminders the user switches on: a daily push notification and/or email with counts
   of people to reach.
4. Legal compliance: responding to data subject requests, breach handling, records.

## Lawful bases (DPA s.30)

| Purpose                              | Basis                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Providing the service                | Performance of a contract with the user (s.30(1)(b)(i))                                                                                                              |
| Security, audit, abuse prevention    | Legitimate interests and compliance with a legal obligation (s.30(1)(b)(iii), (vi))                                                                                  |
| Push / email reminders, offline copy | Consent — off by default, switched on and off by the user (s.30(1)(a))                                                                                               |
| Contacts' details stored by a user   | Held on the user's behalf; for personal and household use the user is exempt (s.51(2)(a)); for chama/church/business use the user is responsible for their own basis |

## Categories of data subjects

- Users (account holders), aged 18 and over.
- People in users' contact lists (third parties who did not sign up).

## Categories of personal data

| Data subjects | Data                                                                                                                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users         | Email; optional display name; password (argon2 hash only); two-factor secret (encrypted) and recovery-code hashes; language, theme and reminder settings; device labels and last-used times per session; push subscription endpoint (if on); security audit entries (ids, times, counts) |
| Contacts      | Names, nickname, phone numbers, email addresses, organisation, job title, area, how the user met them, skills/tags, birthday, free-text notes, group memberships and roles, follow-ups and last-contacted dates                                                                          |

**Sensitive personal data (s.2, s.44):** not collected by design. Free-text notes
could contain it if a user types it; the terms ask users to store only what they
need, and notes are protected like all other data.

## Recipients and processors

Neon (database), Render (application server), Vercel (web server), Resend (email,
only if switched on), Google/Apple/Mozilla push services (only if switched on), Have
I Been Pwned range API (5 characters of a password hash, no personal data). Details:
[07-processors-and-transfers.md](07-processors-and-transfers.md). Planned: an SMS
provider for sign-up codes (B6) — the pack will be updated before it goes live.

## Transfers outside Kenya

Yes. The data is stored and processed in **Frankfurt, Germany (EU)**, covered by
the General Data Protection Regulation. Safeguards and justification are in
[07-processors-and-transfers.md](07-processors-and-transfers.md) (DPA s.48–50).

## Retention

As long as the account exists; trash 30 days; deleted immediately when the user
deletes the account (provider backups roll off within 7 days). Full schedule:
[08-retention-schedule.md](08-retention-schedule.md).

## Security measures (summary)

TLS everywhere; argon2 password hashing; optional TOTP two-factor; breached-password
check; per-device sign-out; per-IP rate limits and a per-account lock-out; the web
server is the only caller of the API (shared secret, HttpOnly session cookie, strict
Content Security Policy); database guarantees (owner on every row, composite foreign
keys, CHECK constraints, least-privilege role, append-only audit log); logs that never
contain contact data; encrypted backups of the database by the provider; account
deletion and export built in. Details: `docs/security/threat-model.md`.
