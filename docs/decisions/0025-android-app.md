# 0025 — The Android app: a native shell around the web app, phone contacts in native code

**Status:** Accepted · 2026-09-29 · P5 (the largest product item)

## Context

People will not keep two address books. The web app (installable as a PWA)
cannot read or write the phone's own contacts: browsers offer at most a
one-at-a-time contact _picker_, and nothing that writes back. Android can,
through its Contacts provider, but only from an installed app. Most of our
users are on Android (Kenya: over 90%).

We have one small team and a web app that is already complete, translated
and tested. Rewriting every screen natively would double the work forever.

## Decision

- **Capacitor 8** wraps the **live web app** (`server.url` =
  production) in a native Android app (`apps/android`). Every screen stays
  the web app; a web deploy updates the app without a store release.
- **Phone contacts are native code** (`PhoneContactsPlugin.java`), reached
  from the page through Capacitor's bridge. The web bundle does not include
  Capacitor; it checks `window.Capacitor` and uses `nativePromise`.
- **App id:** `com.coderiserdigital.contactsphere` — permanent once first
  published on Play; until then a one-line change.
- **Only our site is loaded** (`allowNavigation`), so no other page can call
  the plugins. Links elsewhere open in the phone's browser.
- **Staged, safest first:**
  - **P5a (this):** the app shell and **Import from this phone** —
    _read-only_. Android asks permission at the moment of use; contacts go
    through the same preview and "skip what you already have" as a .vcf
    file; nothing is saved until the owner confirms. The plugin never
    writes, edits or deletes a phone contact.
  - **P5b:** Google sign-in inside the app. Google refuses sign-in inside
    app web views, so it opens in the phone's browser (Custom Tab) and hands
    a one-time code back to the app (PKCE-style, so another app catching
    the link cannot use it). Until then the app shows phone + password.
  - **P5c:** writing to the phone — Contact Sphere contacts appear in the
    phone's Contacts app under their own "Contact Sphere" account, so the
    owner's other contacts are never touched and removing the account
    removes exactly ours.
  - **P5d:** two-way sync — changes on either side, with the same
    field-level merge and "owner decides clashes" as offline edits
    (ADR 0015). Its own ADR before building.
- **Distribution:** test builds are published by CI as the
  `android-latest` GitHub pre-release (install by download). Google Play
  when the app is ready: USD 25 once, identity check, and — for new personal
  accounts — a closed test with at least 12 testers for 14 days.
- **Signing:** test builds use a temporary key (install means uninstalling
  the previous test build). The Play release uses Play App Signing with an
  upload key kept only in GitHub's secret store and an offline backup held
  by the owner.

## Consequences

- One codebase for every screen; the Android app is only as offline as the
  web app (its offline cache works inside the app too).
- Needs a connection to open the first time; a small offline page says so.
- **Play billing:** Play requires its own billing for digital subscriptions
  sold inside an app. Before the first Play release we decide how Plus is
  offered in the Play build (for example not sold in the app, paid on the
  website). Settled in the P5 release ADR, not here.
- **Sideloading rules:** Google is phasing in developer verification for
  apps installed outside Play (some countries from 2026, others later).
  Checked again before we rely on download installs for real users.
- The app's User-Agent ends in `ContactSphereAndroid/<version>` — used
  only to choose what to show (e.g. no Google button yet), never for
  security.

## P5b as built (2026-09-29)

1. In the app, "Continue with Google" (a native call, app 0.2+) makes a
   random 256-bit **verifier**, keeps it in the app's private storage, and
   opens `/auth/google?app=<challenge>` in a **Chrome tab**, where
   `challenge = base64url(SHA-256(verifier))`.
2. The web server carries the challenge through Google's round trip in its
   short-lived OAuth cookie. After Google, the API does **not** create a
   session: it stores a **single-use code** (SHA-256 only, 2 minutes,
   `app_handoffs`, database CHECKs) tied to the challenge.
3. The browser shows **Open Contact Sphere**: an `intent://` link that only
   our package (`com.coderiserdigital.contactsphere`) can receive. It is a
   tap, because Chrome opens apps only from a tap.
4. The app loads `/auth/app#code=…&v=verifier` in its own web view. The
   fragment never reaches a server or its logs; the page clears it and
   trades both at `POST /auth/app/redeem` for a normal session — or the
   usual second-factor step when two-factor is on.

A code without the verifier is useless (another app catching the link, or
someone reading a log); wrong verifier, expired and reused codes all get
the same answer; racing redeems claim the row once. Someone sending a
victim a crafted `?app=` link gains nothing unless the victim also hands
over the code shown after Google. Old test builds (0.1) keep the note in
place of the Google button.

## P5c as built (2026-09-30)

- Profile → **Contacts on this phone** (app 0.3+): the app fetches the
  owner's active contacts (`GET /contacts/phone-copy`: not archived, not in
  the trash; numbers in +254 form) and writes them under its own Android
  account **"Contact Sphere"** (type `com.coderiserdigital.contactsphere`,
  registered by the app's authenticator service; a no-op sync adapter makes
  the Contacts app show them).
- Never writes to Google, Samsung or SIM contacts. Android joins each one
  with the same person already on the phone, so the Contacts app shows one
  entry.
- Running it again updates in place by the contact's id (`SOURCE_ID`),
  skips unchanged contacts (a hash in `SYNC1`) and removes only contacts
  this app wrote that are gone. **Remove from this phone** deletes the
  account and exactly its contacts.
- One way only: edits made on the phone are not sent back yet (P5d).
- Audit: `contact.exported` with `{count, to: "phone"}`.
- The app now has our own icon and splash screen; `/android` is the public
  page to share the test build.
