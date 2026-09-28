# 0017 — Account deletion, privacy policy and terms

**Status:** Accepted · 2026-09-28 · implements ADR 0005 rule 4; first step of the commercial gate (B7)

## Decision

- **Delete your account, yourself, immediately.** Profile → Delete your account
  asks for the password, a two-factor or recovery code when two-factor is on,
  and `DELETE` typed out; it offers the .vcf export first.
  `POST /auth/account/delete` deletes the user row in one transaction, and every
  owned row goes with it through `ON DELETE CASCADE` (contacts, numbers, emails,
  groups, members, follow-ups, saved searches, sessions, devices, recovery
  codes). No grace period: "deleted" means deleted (ADR 0005).
- **The audit log keeps one entry** (`auth.account_deleted`) with the user id
  and counts only; its actor becomes null with the user (FK `SET NULL`, which
  runs with the table owner's rights — the app role still cannot edit the log).
- **The phone forgets too.** After deletion the sign-in page (`?deleted=1`)
  wipes the offline copy, the switch, unsent changes and clashes. Clearing a
  copy never re-creates the browser database a full wipe removed.
- **Public privacy policy and terms** at `/privacy` and `/terms`, linked from
  the home page, every sign-in page, account creation ("By creating an
  account you agree…") and Profile. English governs; Kiswahili readers get a
  summary first. Written for the Kenya Data Protection Act 2019: controller,
  data held (about the user and about their contacts), purposes and lawful
  bases, processors and where data lives, retention, rights and how to use
  them in the app, the ODPC as the complaint route, security, children.
- **The web server runs in Frankfurt** (`regions: ["fra1"]`), beside the API
  and database, so the policy's "stored and processed in the EU" is true for
  every hop and each page saves a transatlantic round trip.

## Why

- The Act gives data subjects the right to erasure and to be informed
  (s.26, s.29, s.40); both are needed before anyone other than the owner is
  invited in (B6 open sign-up).
- A stolen session must not be enough to destroy an account; a typed word
  stops accidents.
- A policy that says something the system does not do is worse than none:
  every statement is checked against the code and hosting, and the threat
  model and the policy change together.

## Consequences

- Provider point-in-time backups can hold deleted data for up to 7 days; the
  policy says so.
- ODPC registration (B8) is still to come; the policy names the ODPC as the
  complaint route but no registration number yet.
