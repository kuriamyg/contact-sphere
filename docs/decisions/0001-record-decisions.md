# 0001 — Record decisions as ADRs

**Status:** Accepted · 2026-09-25

**Decision.** Every significant technical or product decision is written down
in `docs/decisions/` before or alongside the change that implements it.

**Why.** The handoff (§4, §15) forbids silent architecture changes. The only
reliable way to make a change non-silent is to leave a written record that a
reviewer, the owner, or a future AI agent will find. TrustGiving's
`docs/decisions.md` proved this: the rules it explains survived refactors;
rules that were only in code were the ones people tried to remove.

**Cost.** A few minutes of writing per decision.

**Revisit if.** Never; the format may evolve.
