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
