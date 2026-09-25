# 0007 — Definition of "last used"

**Status:** Proposed · confirm at Phase 4

**Proposal.** `last_used_at` is the time the owner last **opened the
contact's detail page or acted on it inside the app** (tapped call, SMS,
WhatsApp or email links, copied a number). It is never inferred from device
call logs — the web app has no access to them, and the handoff forbids
assuming it.

**Why.** It is the only signal the app can observe honestly. Sorting by it
approximates "people I deal with".

**Cost.** A write on every detail view. Throttle it: update at most once per
contact per minute.
