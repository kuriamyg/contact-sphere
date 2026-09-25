# Security policy

This project stores personal data about the owner and the people in their
address book. Security reports are welcome and taken seriously.

## Reporting a vulnerability

Please **do not open a public issue**. Contact the repository owner
privately (GitHub: @kuriamyg), describing the problem and how to reproduce
it. You will get an acknowledgement within 72 hours.

## Scope and principles

- Threat model and data classification: `docs/security/threat-model.md`.
- Secrets are never committed; credentials live in provider dashboards.
- Contact data is never logged, sold, or used for advertising.
- No system can guarantee absolute security; known gaps are listed in the
  threat model rather than hidden.
