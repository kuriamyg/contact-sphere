# Architecture Decision Records

An ADR records **one** significant decision: what was decided, why, what it
costs, and what would have to be true to revisit it.

The code says _what_ the system does. These say _why_ — the only thing that
lets someone change it safely later. A rule whose reason has been lost gets
removed by whoever finds it inconvenient, usually just before it would have
mattered.

| Status     | Meaning                                                            |
| ---------- | ------------------------------------------------------------------ |
| Accepted   | Decided. Change it only with a new ADR that supersedes it.         |
| Proposed   | A recommendation. Decided at the start of the phase that needs it. |
| Superseded | Replaced; kept for history.                                        |

| #                                                | Title                                                      | Status   |
| ------------------------------------------------ | ---------------------------------------------------------- | -------- |
| [0001](0001-record-decisions.md)                 | Record decisions as ADRs                                   | Accepted |
| [0002](0002-monorepo-and-toolchain.md)           | Monorepo, Node 24, npm workspaces, pinned framework majors | Accepted |
| [0003](0003-hosting.md)                          | Hosting: Vercel + Render + Neon (Frankfurt)                | Accepted |
| [0004](0004-single-user-multi-user-ready.md)     | Single-user first release, multi-user-ready data model     | Accepted |
| [0005](0005-deletion-policy.md)                  | Archive, trash, then hard delete                           | Proposed |
| [0006](0006-authentication-and-sessions.md)      | Authentication and sessions                                | Proposed |
| [0007](0007-last-used.md)                        | Definition of "last used"                                  | Proposed |
| [0008](0008-environments-and-isolation.md)       | Environments and isolation                                 | Accepted |
| [0009](0009-backup-encryption.md)                | Encrypted local backups                                    | Proposed |
| [0010](0010-contact-fields-and-phone-numbers.md) | Contact fields and phone numbers                           | Proposed |

New ADR: copy the shape of an existing one, take the next number, add it to
this table in the same PR as the change it justifies.
