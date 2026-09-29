# 0024 — Relationship map: our own SVG, no graph library

**Status:** Accepted · 2026-09-29 · second half of P6, builds on ADR 0023

## Context

With relationships stored (ADR 0023), owners want to _see_ them: a family
tree, who introduced whom, who sits between two people. Most use is on a
phone. The web app's Content-Security-Policy allows no inline styles
(`style-src` has nonces and one hash, no `'unsafe-inline'`) and only
nonce-loaded scripts. A map of a few hundred people must stay smooth on a
mid-range Android phone.

## Options

| Option                     | Size (min+gz) | CSP                                                     | Phone fit                                                     |
| -------------------------- | ------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Cytoscape.js               | ~110 KB       | Canvas; fine                                            | Strong, but force layouts make a "hairball" on a small screen |
| Sigma.js + graphology      | ~80 KB        | WebGL; fine                                             | Very fast; built for thousands of nodes; text rendering weak  |
| React Flow                 | ~60 KB + CSS  | Renders `style` attributes on nodes: blocked by our CSP | Made for editors (drag nodes, handles), not for reading       |
| **Own SVG, fixed layouts** | **~4 KB**     | Only attributes and classes: fine                       | Two layouts designed for reading on a phone                   |

## Decision

- **Our own SVG**, drawn by React from two fixed, predictable layouts
  (`apps/web/src/lib/map-layout.ts`, unit-tested):
  - **Everyone:** the chosen person in the middle; the people linked to
    them on a ring, grouped by kind of link; people two steps away on an
    outer ring, beside whoever links them in.
  - **Family tree:** generations as rows (parents above, children below;
    spouses, brothers, sisters and cousins beside), family links only.
- **What is drawn:** the API (`GET /relationships/map?focus=`) returns
  everyone within **two links** of the focus, nearest first, **at most 300
  people**, and the links among them. Without a focus: the owner's own
  card, else whoever has the most links. Tapping someone offers "Open
  contact" and "Centre the map here".
- **Interaction:** drag to move, pinch or scroll to zoom, +/−/Fit buttons;
  filters by kind (family, how you met, life, work). Kinds differ by
  **dash pattern as well as colour**. Two links between the same pair bow
  apart. Every person on the map is also in the **list** under it (the
  accessible and small-screen view).
- **Plus only**, checked by the API (403 → the page shows what Plus adds).
  Adding and seeing links on a contact's page stays free.

## Consequences

- No new dependency, nothing loaded from elsewhere, no CSP change.
- No automatic force layout: dense networks beyond two steps are not drawn
  at once — you move through them by re-centring. Revisit (Sigma is the
  likely choice) if owners ask to see thousands of links together.
- Not in the offline snapshot yet: the map needs the connection. The
  contact page's links are enough offline for now.
