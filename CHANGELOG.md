# Changelog

All notable changes. Format: [Keep a Changelog](https://keepachangelog.com);
versioning: [SemVer](https://semver.org) once the first release is cut.

## [Unreleased]

### Added — Make changes with no data bundle (Phase 10b+)

- With the offline copy switched on, you can now, with no data: add a new
  contact (name, number, note — and call them straight away), tap "I was
  in touch today", add a follow-up, and mark follow-ups done.
- Each change is kept on the phone ("waiting to send") and sent by itself
  when you have data again. Sending twice never makes duplicates.
- Editing a contact's existing details (name, numbers, skills) still needs
  data, so two phones can never silently overwrite each other.

### Fixed

- If your session had ended (e.g. "sign out everywhere" on another phone),
  opening a contact or group showed "Can't reach Contact Sphere"; it now
  takes you to sign in.

### Added — Use it with no data bundle (Phase 10b)

- Profile → "Use it without data" → **Keep a copy on this phone**. With
  no data at all you can then open the app, see Today, search all your
  contacts (by name, number, skill, area, notes), open a contact, see its
  groups and follow-ups, and **call or SMS** (airtime, like your phone
  book), and text a whole group.
- Without data you cannot add or change anything or use WhatsApp; the
  app says so. Back online, the full app returns.
- The copy is about 16 KB for 465 contacts. Keeping it fresh checks for
  changes and downloads again only when something changed.
- Signing out deletes the copy; so does "sign out everywhere" the next
  time the phone is online, and any visit to the sign-in page.

### Added — Install it like an app (Phase 10a)

- Add Contact Sphere to your home screen: it gets its own icon, opens
  full screen straight into Today, and has shortcuts (Today, New contact,
  Groups). Profile → "Use it like an app" shows how on your phone.
- With no connection, you see a clear "You're offline" page instead of a
  browser error. Nothing about your contacts is stored on the phone.

### Added — Today: remember people (Phase 9)

- **Today** (first in the header): follow-ups that are due, people you
  meant to keep in touch with, and birthdays in the next two weeks — each
  with call, WhatsApp (a ready "Happy birthday" message) and Done.
- On a contact: choose how often to keep in touch (every week … every
  year), tap "I was in touch today", and add dated follow-ups with a note.
  Done follow-ups stay in the contact's history.
- The app name in the header shows on wider screens only, so the header
  fits every phone.

### Added — Groups (Phase 8)

- Groups (in the header): your chama, church, family, work, estate or
  school, with notes and any number of members from your contacts.
- Give members a role (chair, treasurer, pastor…); officials are listed
  first. A contact's page shows their groups and can add them to one.
- Text everyone (SMS), copy all numbers to make a WhatsApp group or
  broadcast list, WhatsApp or call any member, or export the group as a
  .vcf to share. Deleting a group never deletes its contacts.

### Added — Skills everywhere and saved searches (Phase 7b)

- Contacts → Manage (next to the skill chips): rename a skill or remove it
  from every contact at once. Renaming to an existing skill joins them.
- Save a search (words, a skill, or both) and tap it any time from the
  row of ★ chips above your list.
- Importing a .vcf now brings your phone's groups and labels in as skills
  (not the ones every contact has, like "My Contacts" or "Starred").
  Exports include skills, so phones see them as groups.

### Added — Know who (Phase 7a)

- Each contact can have skills and services ("plumber, boda boda"), an area
  ("Kasarani") and how you met ("church").
- Search looks at every word: "plumber kasarani" finds the plumber in
  Kasarani. Notes, job title and organisation are searched too, and
  accents do not matter.
- Your skills and services appear as chips above the list, with counts;
  tap one to see only those contacts. Tags on a contact open the same list.

### Added — Clean up duplicates (Phase 5b)

- Contacts → Clean up lists contacts that may be the same person and why
  (same number, same email, same name, similar name), most likely first.
- Review a pair side by side, choose which one to keep and, where they
  differ, which name, organisation, birthday and so on to keep. Nothing is
  lost: every number and email from both is kept, notes are joined.
- The other contact goes to the trash. Undo from the kept contact's page
  puts both back exactly as they were (for 30 days).
- "Not the same person" hides a pair for good.

### Added — Profile and a more polished app (Phase 6a)

- Profile page (tap your avatar, top right): avatar with a ring, your name
  (new), email, member since, two-factor status, contact counts; then
  Personal details, Security (two-factor, change password), Your data
  (export/import) and Sign out (this device, or everywhere).
- Contacts show initials avatars in a steady colour; the list is grouped
  A–Z when sorted by name; a contact opens with big one-tap Call, SMS,
  WhatsApp and Email buttons.
- Brand colour, logo mark and icons; the header stays at the top.
- Product strategy and roadmap: `docs/product/strategy.md`.

### Added — Import and export .vcf (Phase 5a)

- Import contacts from a phone or address-book export (.vcf): see what
  will happen first, then import. Contacts already saved are skipped, so
  importing the same file twice adds nothing. Photos are not uploaded.
- Export all contacts (except the trash) as a .vcf file.

### Added — Contacts screens (Phase 4b)

- Contacts list with search, sorting (name, recently opened, date saved)
  and pages; Archived and Trash tabs; empty and no-results states.
- Contact page with one-tap Call, SMS, WhatsApp and Email; birthday, notes.
- New / edit form with any number of phone numbers and emails (first is
  primary). If a save is refused, everything typed is kept.
- Archive, move to trash, restore, delete for good, empty trash — with a
  confirmation for the permanent ones.
- Signing in now opens Contacts; Account is in the header.

### Changed

- The general API rate limit is 300 requests a minute per address (was
  120); sign-in, setup and two-factor keep their strict 5 a minute.
- Contact ids of any UUID version get a plain "not found".

### Added — Contacts API (Phase 4a; ADRs 0005, 0007, 0010 accepted)

- Contacts with names, organisation, notes, birthday, phone numbers (kept
  as typed and as E.164; Kenyan by default) and email addresses.
- Search by name, organisation, email or any part of a number (0712, 712,
  +254712 all match); sort by name, date saved or last used; pages.
- Archive; delete to a 30-day trash; restore; delete for good; empty trash.
  Expired trash is removed automatically.

### Added — Two-factor sign-in (ADR 0013)

- TOTP with an authenticator app: QR/`otpauth://` enrolment, 10 one-time
  recovery codes, a verification step at sign-in, turn off with password +
  code. Secret encrypted at rest; each code works once.

### Fixed

- If the API is slow or unreachable (e.g. Render's free instance waking), a
  form now says "The service is unavailable. Try again shortly." and keeps
  what was on screen, instead of crashing to "This page couldn't load". A
  signed-in person is no longer sent to the sign-in page when the API is
  merely unavailable; they see a "can't reach" page with Try again. Request
  time limits are now explicit (API call 50 s, Vercel function 60 s).
- Sign-out and the two-factor step now really remove their `__Host-`/
  `__Secure-` cookies (a plain delete lacks `Secure`, which browsers
  require to touch those cookies).

### Added — Phase 3 (sign-in)

- Owner setup, sign in, sign out, sign out everywhere, change password.
- Backend-for-frontend: only the web server can call the API.
- argon2id passwords; sessions hashed in Postgres; HttpOnly `__Host-`
  cookie; brute-force limits; audit entries; nonce-based CSP (ADR 0006).
- `npm run db:new-migration` creates migrations without Prisma's shadow
  database (the first migration cannot run in one).

### Added — Phase 2 (database)

- Prisma 7 with the pg driver adapter; `users` and append-only
  `audit_logs`; least-privilege `app_runtime` role (ADR 0012).
- Database guarantee tests run as the app role against real Postgres; a
  guard refuses non-local databases.
- `GET /health/ready`; `DATABASE_URL` validated at boot (TLS required in
  production).
- CI: Postgres 18 service, migrations, drift check. Manual
  "Deploy migrations" workflow. Session hook starts a local Postgres.
- Dependabot limited to minor/patch updates (majors by hand, ADR 0002).
- Deployed: staging and production migrated; app roles created; live
  `/health/ready` reports the database on both.

### Fixed

- `db:app-role` works with Neon's non-superuser owner, and refuses any
  database that is not a migrated Contact Sphere database.

### Added — Phase 1 (foundation)

- npm-workspaces monorepo: `apps/api` (NestJS 11), `apps/web` (Next.js 16).
- API: validated environment config, `GET /health`, strict security
  headers, exact-origin CORS allowlist, proxy-hop trust setting.
- Web: status page that checks the API server-side; security headers;
  noindex/robots; reduced-motion and skip-link accessibility basics.
- Tests: API unit + e2e (Jest/Supertest), web unit (Vitest).
- CI: format, lint, typecheck, tests, build; production `npm audit`.
- Dependabot, PR template, Render blueprint, Claude Code session hook.

### Added — Phase 0 (planning)

- `PROJECT_CONTEXT.md` v1.1 with gap analysis; ADRs 0001–0010; threat
  model; environments and deployment docs; backlog; session log.
- Neon project `contact-sphere` with production/staging/development
  branches.
