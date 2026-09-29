# 0023 — Relationships between contacts

**Status:** Accepted · 2026-09-29 · first half of P6 (relationship map)

## Context

People in Kenya are known through other people: "Wanjiru's first-born",
"the fundi Otieno introduced me to", "my cousin from the chama". Groups
(Phase 8) say who belongs where, but not how two people are related. The
map (P6b) needs those links first, and they are worth having on their own:
a contact's page should say who they are to the owner's other people.

## Decision

- **One table, `relationships`**: `owner_id`, `from_contact_id`,
  `to_contact_id`, `kind`, an optional short `label` ("first-born").
  Both ends reference `contacts (id, owner_id)`, so **the database refuses
  a link across two accounts**, and a link disappears with either contact
  (hard delete). Links to a contact in the trash are hidden, and come back
  if it is restored.
- **Kinds** (a CHECK lists them): parent, spouse, sibling, cousin,
  relative, introduced, friend, colleague, neighbour, church, chama,
  client, mentor, other.
  - **Directed** kinds read "from … to": parent (from is to's parent),
    introduced (from introduced the owner to to), client (from is to's
    client), mentor. The page shows the right side: "Parent" on one,
    "Child" on the other.
  - **Two-way** kinds are stored once, smaller id first (a CHECK), so the
    same pair cannot be linked twice the other way round. One row per
    (pair, kind): two people can be cousins _and_ colleagues.
- **Adding a link is free**; the map (P6b) is a Plus feature.
- **Suggestions, never automatic links.** "You met Otieno through Wanjiru"
  when a contact's "met through" is exactly one other contact's name;
  "relatives?" when an uncommon surname (at most 6 people) is shared.
  The owner confirms (choosing parent, child, sibling… for relatives) or
  says "Not related", which is remembered in `relationship_dismissals`
  (pair smaller id first) and never suggested again.
- **Audit:** `relationship.added` / `relationship.removed` with the kind
  only — never names or labels.
- **Backups** (ADR 0009) carry relationships (up to 20,000); a restore adds
  the ones missing between restored contacts.

## Consequences

- Merging two contacts (Phase 5b) does not move the loser's links to the
  winner, the same as groups; the loser's links show again if the merge is
  undone. Revisit if pilots merge contacts that have links.
- Labels are stored lower-case and trimmed, like group roles.
- A future "shared community" plan (P4) would need consent before any link
  leaves one account; nothing here is shared.
