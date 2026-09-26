# 0010 — Contact fields and phone numbers

**Status:** Accepted · 2026-09-26 (Phase 4)

## First-release fields

Contact: given name, family name, display name (derived if blank), nickname,
organization, job title, notes, birthday (optional), created/updated/
last-used timestamps, archived/deleted timestamps, `owner_id`.

Child tables: phone numbers (label, raw text, E.164, primary flag), email
addresses (label, address, primary flag). Emails and notes **are** included
in the first release — VCF import would otherwise silently drop them.

## Phone numbers

- Parse with `libphonenumber-js`, **default region KE**, so `0712 345 678`
  becomes `+254712345678`.
- Store **both** the E.164 form (for search and duplicate detection) and the
  original text (so nothing the user typed is lost).
- Numbers that cannot be parsed are kept as raw text and flagged, never
  rejected — old SIM exports contain oddities.
- Search matches on digits, so `0712`, `712` and `+254712` all find the same
  contact.
- Uniqueness of a number is **not** enforced across contacts (two people can
  share a landline); duplicates are surfaced for review instead.

## Implementation notes

- **Primary** phone/email is the first in the list (`position = 0`), with a
  unique `(contact_id, position)` index — a rule the database can enforce,
  unlike a separate "primary" flag.
- Child rows carry `owner_id` and reference `(contact_id, owner_id)`
  together, so a number can never belong to another owner's contact (tested
  as the app role).
- A contact needs something to show: a display name is derived from name,
  nickname, organisation, first number or first email; with none of those,
  it is refused (400). The database also refuses an empty display name.
- Case- and accent-insensitive A–Z sorting uses a stored `sort_name`
  (lower-case, accents removed), maintained by the API and checked by the
  database to be lower-case.
- Limits: 20 numbers and 20 emails per contact; notes up to 10,000
  characters; birthday is a real date between 1900 and today.
- Search is case-insensitive and partial over names, nickname,
  organisation, email and phone digits (raw and E.164), with LIKE wildcards
  escaped. At a personal address book's size this needs no special index;
  revisit (pg_trgm) if lists grow into the tens of thousands.
