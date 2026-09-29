# Changelog

All notable changes. Format: [Keep a Changelog](https://keepachangelog.com);
versioning: [SemVer](https://semver.org) once the first release is cut.

## [Unreleased]

### Added — Continue with Google inside the Android app

- In the app (test build 0.2), **Continue with Google** opens Google in a
  Chrome tab; after choosing your account, tap **Open Contact Sphere** and
  you are signed in inside the app — with the usual two-factor step if you
  turned it on.
- Safe by design: the browser never gets a session, and the one-time code
  it passes back works only once, for two minutes, and only together with
  a secret that never left the app.

### Added — Android app (first test build)

- An Android app (`apps/android`): Contact Sphere in a native shell, always
  showing the latest version of the web app.
- **Import from this phone** (inside the app): reads the phone's contacts
  after Android asks your permission, then shows the usual preview —
  what will be added, what you already have. Read-only: it never changes
  the contacts on your phone.
- Test builds are published as the "Android app (test build)" download on
  GitHub. Inside the app, sign in with your phone number and password for
  now; Google sign-in inside the app comes next.

### Added — Relationship map (Plus)

- **Relationship map** (a contact's page → See on the map, or from
  Suggested links): everyone within two links of one person. Tap someone to
  open them or centre the map on them; drag, pinch or scroll to move and
  zoom.
- **Family tree** layout: parents above, children below; husband or wife,
  brothers and sisters beside.
- Show or hide family, how you met, life and work links. The same people
  are listed under the map.
- Part of Plus; adding links stays free.

### Added — Relationships between contacts

- A contact's page now has **Relationships**: link them to anyone else you
  saved (parent, child, husband or wife, brother or sister, cousin, who
  introduced you, friend, colleague, neighbour, same church or chama,
  client, supplier, mentor…) with an optional note like "first-born". The
  link shows on both contacts, each from its own side.
- **Suggested links**: "You met Otieno through Wanjiru" (from "met
  through") and "these two share a surname". Nothing is linked until you
  confirm; "Not related" hides a suggestion for good.
- Encrypted backups now carry relationships, and a restore brings them
  back.

### Changed — Docs match what is live

- Pilot playbook: Google or phone + password sign-up, recovery key, tour,
  plan reminders, backups. Backlog and roadmap updated; the ordered list
  of remaining work is `docs/unfinished-business.md`.

### Added — "Not a robot" check on sign-up (off until switched on)

- Cloudflare Turnstile on phone + password sign-up and on SMS-code
  requests: usually invisible, sometimes one tap. Switched on by setting
  two free Cloudflare keys on the API.

### Added — Encrypted backup and restore

- Profile → **Encrypted backup**: choose a passphrase and download all your
  contacts, groups and follow-ups as one locked file. Encryption happens on
  your phone; Contact Sphere never sees the passphrase or the file.
- **Restore** from a backup file: see what will be added first; nothing
  you have now is changed or deleted, and restoring twice adds nothing.
- "Last backup" on Profile, and a monthly "Back up your contacts" card on
  Today once you have 10 contacts.

### Added — Plan-ending reminders

- A banner on Today and in Profile → Your plan from 5 days before Plus
  ends ("Your free Plus ends in 3 days — Keep Plus"), and "You're on the
  free plan now" for two weeks after. "Not now" hides it until tomorrow.
- The morning reminder on the phone also says it, 3 days and 1 day before
  the end, even on days with nothing else due.
- `docs/unfinished-business.md`: the one ordered list of everything left.

### Added — First-run tour, full-screen account page, show password

- **Guided tour** for new accounts: a card that glides between Today,
  Contacts, Groups, Search and your account, with a spotlight and an arrow
  on each, Back / Next / Skip, and an "Import contacts" finish. Shown once
  per device; replay it any time from "Take the tour".
- The avatar now opens a **full-screen account page** instead of a small
  pop-up.
- Every password box has an **eye button** to show or hide what you type.

### Added — Sign up with a phone number and a password

- For people without Google (or who prefer not to use it): a mobile number
  and a password, no code. The number is marked **not verified**.
- A **recovery key** is shown once at sign-up (Copy, "I've saved it").
  "Forgot your password?" takes the number, the key and a new password;
  each use gives a new key. Profile → Recovery key makes a new one.
- A reset code by SMS is only ever sent to a proven number.

### Changed — Sign up with Google

- **Continue with Google** replaces the SMS code for new accounts: no code
  to wait for, no new password. Existing accounts with the same email can
  use it too. Two-factor still applies.
- Google-only accounts have no password: "Change password" is hidden and
  deleting the account asks you to type DELETE instead.

### Changed — Sign-up wording and code auto-fill

- Sign-up and password reset now speak of a **verification code by SMS**,
  and the SMS reads "Your Contact Sphere verification code is …".
- On Android (Chrome), the code can **fill itself in** from the SMS.
- Opening the sign-up link while signed in shows the usual "You're already
  signed in" with **Continue** and "Not you? Sign out" (back to sign-up).
- When a code cannot be sent, the page now says why instead of "service
  unavailable" — including when a line blocks messages from companies (Do
  Not Disturb). The server logs the SMS provider's reason (never the number).

### Added — Plans and paying with M-Pesa (B9a)

- **Free and Plus.** Free keeps all your contacts and 3 groups; Plus
  (KES 99 a month or KES 990 a year) adds morning reminders and unlimited
  groups. New accounts get 30 days of Plus free.
- **Pay with M-Pesa** from Profile → Your plan: the prompt comes to your
  phone, you enter your PIN, and the page updates by itself.
- **Operator page** for the person running Contact Sphere: who signed up,
  their plan and payments, free months for pilots, and M-Pesa payments
  recorded by their code.
- A proper "page not found" page.

### Added — Sign up with your phone number (B6)

- **Create an account with a mobile number**: we text a 6-digit code, then
  you choose a password. No email needed. In English or Kiswahili.
- **Sign in with your email or your phone number.**
- **Forgot your password?** Get a code by SMS and set a new one; every
  device is signed out.
- Codes work for 10 minutes and 5 tries; at most one a minute and five a day
  per number.

### Added — Delete your account; privacy policy and terms (B7)

- **Profile → Delete your account**: removes your account and everything in
  it at once, after your password (and a two-factor code if it is on) and
  typing DELETE. It offers the .vcf export first and clears this phone's
  offline copy afterwards.
- **Privacy policy** and **terms of use**, public and linked from sign-in,
  account creation, the home page and Profile. In English, with a Kiswahili
  summary for Kiswahili readers.
- The web server now runs in Frankfurt, next to the API and database.

### Security — Hardening (A5)

- **See your devices**: Profile → Devices and sign-out lists where you are
  signed in ("Chrome on Android", when last active) and signs any other
  device out on its own.
- **Breached passwords refused**: a new password that appears in known
  data breaches is refused, checked without sending the password anywhere
  (only 5 characters of its hash). If the checking service is down, the
  password is allowed.
- **Lock-out survives restarts**: 10 wrong passwords lock the account for
  15 minutes even across deploys.
- **Safer logs**: structured JSON logs with no contact details, search
  words, emails, tokens or request bodies; each request has an id.

### Added — Edit contacts with no data

- **Edit details offline**: name, numbers, emails, job, organisation,
  area, met through, birthday, skills and notes. Saved on the phone at
  once, sent when you have data.
- **Nothing is overwritten by surprise**: each field is merged on its own.
  If the same detail was also changed elsewhere, the other change is kept
  and you are shown both — "Use mine" or "Keep this" — in the offline app
  and in the full app.
- API: `PUT /contacts/:id` accepts `If-Match` with the contact's
  `updatedAt` and answers 412 if it changed since.

### Changed — A proper laptop layout

- **Sidebar** on laptops: search, Today, Contacts, Groups, tools, and your
  own card for Profile & settings. The whole screen is used.
- **Contacts and Groups side by side**: the list stays on the left while
  the contact or group opens on the right, with your search kept.
- **Today** in two columns, with New contact and Text a group at the top.
- **Profile is a real page**: a header band, a section menu on laptops,
  and flat sections instead of cards (on phones too). Appearance (Auto /
  Light / Dark) is now in Profile as well.
- Phones keep the bottom bar and never download the laptop's list pane.

### Changed — Sign-in in black and chrome

- Sign-in, first-account setup and the two-factor step now have their own
  look: black, with a polished chrome ring in a glass tile, glass fields
  and a white pill button. The ring spins in the button while you sign in.
  The rest of the app keeps its theme.

### Changed — Email reminders switched on

- Production now sends the morning reminder by email (Resend's shared
  sender, which delivers to the account owner's own address) for owners who
  turn on "Email me too". A custom sending domain can replace it later by
  changing `EMAIL_FROM` only.

### Added — Morning reminder by email (ready, switched off)

- **Email me too**: Profile → Morning reminders. Once a morning, when
  something is due, the same short line as the phone reminder ("Today: 1
  follow-up and 2 birthdays.") by email, in your language, with a button
  to open Today. Counts only, never names. Off unless you turn it on, and
  "Send a test email" checks it works.
- It appears once a sending domain is set up (docs/operations/email.md);
  until then Profile says so.

### Changed — Import and duplicates in the Aurora look

- **Import** shows where you are (Choose → Check → Done), accepts a file
  dropped on the box, and sums the file up in three tiles: in the file, to
  add, skipped. Skipped entries and anything worth knowing sit in their own
  cards. When it is done, one tap takes you to your contacts or to check
  for duplicates.
- **Clean up duplicates** lists each pair as a card with why it matched,
  and counts how many are likely the same person.
- **Reviewing a pair** shows which contact stays and which merges into it,
  lets you swap them, offers each difference as a tile to tap (saying which
  contact it comes from), and sums up the result before you merge.

### Added — Kiswahili

- **The whole app in Kiswahili.** Tap your avatar → Language → Kiswahili
  (or Profile → Language). Every screen, button, message and the offline
  app switch at once; dates read the Kiswahili way (e.g. "Jumamosi, 3
  Okt"). A phone set to Kiswahili gets it from the first visit.
- **Morning reminders follow your language** too ("Leo: ufuatiliaji 1.").
- Group roles suggest Kiswahili names (mwenyekiti, katibu, mweka hazina…).

### Changed — New look: Aurora

- A new design across the app: a galaxy-dark theme (near-black with soft
  green and violet glows and a few stars) and a warm, professional light
  theme; new fonts, softer corners, glass cards and lit green buttons.
- **Choose your theme**: tap your avatar → Appearance → Auto (follows your
  phone), Light or Dark. It is remembered on the device.
- **Bottom bar on phones**: Today, Contacts, Groups, Search — where your
  thumb reaches.
- **Profile menu** under your avatar: profile, QR card, reminders, tags,
  duplicates, import/export, appearance and sign out in one place.
- **Today** greets you, shows how many people to reach, puts the most
  important one first with big Call/WhatsApp buttons, and adds quick
  actions. With nothing due it says you're all caught up and shows a short
  getting-started checklist.
- **New app icon** (galaxy orbit), sized to the phone's safe zone so it no
  longer looks too big on the home screen. Re-install the app to see it.

### Added — Reach (Phase 11a)

- **Morning reminders on your phone, free.** Profile → Morning reminders →
  turn on. Each morning, if a follow-up, birthday or keep-in-touch is due,
  the phone gets one notification (counts only, never names); tapping it
  opens Today. No SMS, no cost. iPhone: add to Home Screen first.
- **Text the whole group from your phone — the cheapest way.** Group →
  Text everyone: write once, see how many SMS it costs as you type (an
  emoji makes it 70 characters per SMS), and the estimate with a Safaricom
  bundle (about KES 30 per 1,000) or without. Then open Messages in batches
  of 10–100 with numbers and text filled in.
- **Send through Contact Sphere** (built, switched off): one tap through a
  cheap Kenyan SMS aggregator (Celcom/Advanta-style API, ~KES 0.25–0.60),
  with a quote first and a monthly limit. It turns on with paid plans.
- **QR business card.** Open your own contact → "This is me" → Profile →
  Show my card: anyone scans it with their phone camera to save your
  number. Any contact can be shared as a QR too. Only name, work, numbers
  and emails go in the code.
- Research: `docs/product/messaging-costs.md` compares every route with
  costs per SMS and per 1,000 people.

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
