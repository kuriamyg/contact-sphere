# 0010 — Contact fields and phone numbers

**Status:** Proposed · decide at Phase 4

## Proposed first-release fields

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
