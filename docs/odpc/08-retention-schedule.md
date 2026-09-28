# 08 — Retention schedule (DPA s.39)

Enforced in code unless marked otherwise.

| Data                                                          | Kept for                                               | How it ends                                        |
| ------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Account (email or mobile, password hash, settings, 2FA)       | While the account exists                               | Deleted with the account (immediate)               |
| Contacts, numbers, emails, groups, follow-ups, saved searches | While the account exists                               | Deleted by the user; or with the account           |
| Contacts in the trash                                         | 30 days                                                | Purged automatically                               |
| Sessions and device labels                                    | 7 days unused, 30 days at most                         | Expire and are deleted                             |
| Two-factor sign-in challenge                                  | 5 minutes                                              | Expires                                            |
| Failed sign-in counters (email or number hash)                | 1 day                                                  | Deleted on the next failure after a day            |
| SMS codes (hash only)                                         | 10 minutes to use                                      | Deleted when used, or within 1 day                 |
| Africa's Talking SMS logs                                     | Africa's Talking's retention                           | Provider; number and text only                     |
| Payment records (months, amount, date, M-Pesa code)           | 5 years (Tax Procedures Act)                           | Kept after account deletion, unlinked (owner null) |
| Push subscriptions                                            | Until switched off, or the push service rejects them   | Deleted                                            |
| Security audit log                                            | Kept (ids, actions, counts only — no personal details) | Actor id set to null when the account is deleted   |
| Offline copy on a phone                                       | Until switched off, sign-out, or account deletion      | Wiped by the app                                   |
| Provider point-in-time backups (Neon)                         | Up to 7 days                                           | Roll off automatically (provider)                  |
| Application logs (Render, Vercel)                             | Provider retention (days)                              | Roll off automatically; contain no contact data    |
| Resend email logs                                             | Resend's retention                                     | Provider; email address and counts only            |
| Data subject request and breach logs (private)                | 2 years                                                | Owner deletes (manual)                             |
