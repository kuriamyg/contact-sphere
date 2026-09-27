# Design: Aurora (chosen 2026-09-27)

The owner chose, from three directions drawn on a design canvas (Aurora,
Nocturne, Ink), **Aurora**, the **galaxy orbit** app icon and a **bottom
bar** on phones.

## The look

|                | Light                                                         | Dark (galaxy)                                                                                                   |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Background     | warm ivory `#fbf8f2` with soft green and violet glows         | near-black `#04050a` with green/violet nebulae and a sparse starfield (pure CSS, fixed, `pointer-events: none`) |
| Cards          | white, soft shadow (`.card`)                                  | glass: 4.5% white, hairline border                                                                              |
| Primary button | green gradient `#10b981→#047857`, white text (`.btn-primary`) | `#34d399→#10b981`, dark text, soft glow                                                                         |
| Text           | `#14161c`, muted `#555b68`                                    | `#e8ecf4`, muted `#a5adbd`                                                                                      |
| Accent         | `#047857` + violet `#6d28d9`                                  | `#34d399` + violet `#c4b5fd`                                                                                    |

Type: **Sora** for headings, **Manrope** for everything else, self-hosted
by `next/font` (no request to Google from the browser). Corners are softer
(`--radius-lg` 14 px, `-xl` 18 px, `-2xl` 22 px). All tokens live in
`apps/web/src/app/globals.css`; the offline app mirrors them.

## Theme choice

Profile menu → Appearance: **Auto / Light / Dark** (three states, so "follow
my phone" is always reachable). Stored in the cookie `cs-theme` (display
preference, not a secret) and read on the server, so pages render in the
chosen theme with no flash. `<html data-theme>` drives both the tokens and
Tailwind's `dark:` variant (`@custom-variant dark`).

## Navigation

- Phones: a floating bottom bar — Today, Contacts, Groups, Search (Search
  opens Contacts with the cursor in the search box). Pages keep 7 rem of
  space at the bottom for it.
- From 640 px: section links in the header; no bottom bar.
- Avatar → dropdown (a disclosure, closed by Escape, a tap outside or a
  page change): Profile & security, My QR card, Morning reminders, Skills &
  tags, Clean up duplicates, Import, Export, Appearance, Sign out.

## Today

Greeting by name and Nairobi time of day; counts (follow-ups, birthdays,
keep in touch); a spotlight card for the first person to reach (birthday
today first) with big Call / WhatsApp buttons; sections as cards; quick
actions. With nothing due: "You're all caught up" and a getting-started
checklist driven by `GET /remember/today`'s `setup` counts.

## Sign-in pages: black and chrome

Chosen by the owner 2026-09-27, for sign-in, first-account setup and the
two-factor step only; every other page stays Aurora. Always black, whatever
the theme (`.auth-chrome` redefines the tokens for that subtree and sets
`data-theme="dark"` so `dark:` utilities apply; the status bar is black):

- Text `#ededed`, muted `#a1a1a1`, glass fields (4% white, 14% hairline),
  a white pill button with black text.
- Emblem: our own **chrome ring** — a metallic torus drawn in SVG whose
  highlight sweeps round as it turns slowly — in a glass tile lit from the
  top left. It is original work in the spirit of the reference, not a copy
  of another company's mark.
- The same ring is the spinner: it spins in the button while signing in,
  creating the account or checking a code. The words ("Signing in…") are
  always there too; with reduced motion it stops.

## Import and duplicates

Same language as Today: accent eyebrow, Sora heading, count tiles, glass
cards, one lit primary action per step.

- **Import:** a three-step progress bar (Choose → Check → Done, the
  current step marked `aria-current="step"`); a drop zone that is also the
  file picker; a file card, three tiles (in the file / to add / skipped),
  "skipped" and amber "worth knowing" cards; a done screen announced as a
  status with next steps (contacts, check for duplicates). How to export a
  .vcf is one card per platform.
- **Duplicates:** likely / worth-a-look tiles; each pair a card (confidence
  and reasons as chips, both people, "Review").
- **Review:** the contact merging in, an arrow, then the contact that
  stays (lit card, "Stays" badge); "Keep this one instead" swaps them.
  Differences are radio tiles that light up when chosen and say which
  contact the value comes from; "After the merge" summarises the result.

## App icon

Galaxy orbit: a green sphere with a violet ring on deep space. Android's
launcher crops a maskable icon to its own shape, so the mark stays inside
the central 80% safe zone (it looked oversized before because the letters
filled the whole tile). Files: `public/icons/*` and `src/app/favicon.ico`,
rendered from one SVG.
