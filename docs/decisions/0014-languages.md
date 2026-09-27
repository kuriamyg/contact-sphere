# 0014 — Languages: English and Kiswahili

**Status:** Accepted · 2026-09-27

## Decision

- **Two languages, English and Kiswahili**, switchable anywhere (avatar
  menu → Language, or Profile → Language). English is the source.
- **No i18n library.** Strings live in typed sections
  (`apps/web/src/i18n/sections/*.ts`); each section is written as
  `section(english, kiswahili)`, so the Kiswahili sits next to the English
  it translates and TypeScript refuses a missing or extra key. A unit test
  also checks every translation keeps the same `{placeholders}`.
- **Plain strings only** (no functions) so dictionaries can cross from
  server to client components. `fmt()` fills `{name}` placeholders;
  `plural()` picks `one`/`other`.
- **Choice:** cookie `cs-lang` (1 year, `SameSite=Lax`, `Secure` in
  production) → else the browser's `Accept-Language` → else English. Pages
  are rendered on the server in that language (no flash of English). The
  cookie value is checked against the known list before use.
- **Only the client part is sent to the browser** (`messages.client`), via
  `I18nProvider`; server pages read the full dictionary.
- **The account remembers it too** (`users.locale`, CHECK `en|sw`,
  `PUT /auth/locale`) so text the server writes with no browser present —
  the morning reminder — is in the owner's language.
- **API messages stay English** (stable, testable, one source). The web
  server translates the known ones (exact matches and a few patterns with
  numbers); an unknown message is shown as sent, never blank.
- **The offline app** (`public/offline-app.js`, no build step) carries its
  own small en/sw table and reads the same cookie.
- **Dates** use `Intl` with `en-GB` / `sw-KE`.

## Why

- Kiswahili is spoken by most of our users and is a stated differentiator
  (docs/product/strategy.md). Mixed Kiswahili/English UI is normal in
  Kenya, so brand and product names (WhatsApp, SMS, Contact Sphere, chama)
  stay as they are.
- Two languages and ~700 strings do not justify a library, a message
  format parser or a translation service. Typed pairs catch the common
  mistakes (missing key, broken placeholder) at build time for free.

## Consequences

- Adding a string means adding both languages in the same place; CI fails
  otherwise.
- A third language would change `section()` to take a map; the rest stays.
- A new API error message shows in English for Kiswahili readers until it
  is added to `i18n/api-messages.ts`.
