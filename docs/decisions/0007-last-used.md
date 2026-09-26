# 0007 — Definition of "last used"

**Status:** Accepted · 2026-09-26 (Phase 4)

**Proposal.** `last_used_at` is the time the owner last **opened the
contact's detail page or acted on it inside the app** (tapped call, SMS,
WhatsApp or email links, copied a number). It is never inferred from device
call logs — the web app has no access to them, and the handoff forbids
assuming it.

**Why.** It is the only signal the app can observe honestly. Sorting by it
approximates "people I deal with".

**Cost.** A write on every detail view. Throttle it: update at most once per
contact per minute.

**Implementation.** Opening a contact's page calls `POST /contacts/:id/used`.
The write is conditional in SQL (only if the stored time is null or older
than 60 seconds) and does not change `updated_at`, so "last used" never
masquerades as "last edited". Sorting by last used puts never-opened contacts
last in both directions. Tapping call/SMS/WhatsApp/email happens from the
detail page, so opening it already counts; separate tracking of those taps
is not needed.
