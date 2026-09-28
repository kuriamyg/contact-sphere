# 05 — Personal data breach response (DPA s.43)

A breach is any loss, unauthorised access, disclosure, change or destruction of
personal data — for example a leaked database, an exposed secret, a bug that shows one
user's contacts to another, or a provider incident.

## The clock

| When                              | Who             | What                                                                                                                                                              |
| --------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hour 0                            | Whoever notices | Tell Moses immediately (WhatsApp/phone, then email). Write down the time.                                                                                         |
| Within 24 h                       | Moses           | Contain (below), assess scope, start the incident log.                                                                                                            |
| **Within 72 h of becoming aware** | Moses           | **Notify the ODPC** (s.43(1)) unless the breach is unlikely to result in a risk to people. If some facts are missing, notify anyway and add them later (s.43(4)). |
| Without undue delay               | Moses           | Notify affected users in writing (email and in-app) when there is a real risk to them (s.43(1)(b)), unless their identity cannot be established.                  |
| Within 2 weeks                    | Moses           | Root cause, fix, update the threat model, DPIA and this plan.                                                                                                     |

## Contain first

- **Leaked secret** (API shared secret, database password, TOTP key, email/SMS keys):
  rotate it at the provider, redeploy, and check the logs for use.
- **Suspected account takeover:** end the user's sessions ("sign out everywhere" can be
  run for them from the database), force a password reset.
- **Data exposed by a bug:** roll back the deploy (Render/Vercel keep previous
  versions), then fix forward.
- **Provider incident:** follow the provider's notice; assess what of ours was
  affected.
- Preserve evidence: do not delete logs; export relevant audit entries.

## What the ODPC notification contains (s.43(5))

1. The nature of the breach: what happened, when, how discovered.
2. Categories and approximate numbers of people and records affected.
3. The likely consequences.
4. Measures taken or proposed to address it and to reduce harm.
5. Contact: Moses Mwangi Kuria, kuriam177@gmail.com.

Send through the ODPC's breach notification channel (see odpc.go.ke).

## What users are told

Plain language, English and Kiswahili: what happened, what data, what it means for
them, what we did, what they should do (for example change their password, turn on
two-factor, warn contacts about suspicious messages), and how to reach us.

## Incident log

Keep every breach (even ones not notified) in a private record: date, description,
data and people affected, decision on notification and why, actions taken. Do **not**
keep this record in the public repository.
