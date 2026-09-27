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

## Laptop layout (chosen 2026-09-27: "A + C")

From 1024 px (Tailwind `lg`):

- **Sidebar** instead of the header and bottom bar: logo, a search box,
  Today / Contacts / Groups, Tools (Import, Duplicates, Skills & tags, QR
  card), and the owner's card at the bottom, which opens Profile &
  settings. Content uses the width (up to 1280 px).
- **List beside detail** for Contacts and Groups. Contacts: a parallel
  route slot (`contacts/@pane`) renders the list pane, with the same search,
  skill, sort, view and page as the list, so it stays put while a contact
  loads; links carry the list's query. Groups: the pane lives in
  `groups/layout.tsx`; group actions revalidate that layout.
- **Phones never download the pane**: a cookie `cs-wide` (set by the
  browser from `matchMedia`, like the theme cookie a display preference)
  tells the server the window is laptop-wide; the first laptop visit
  refreshes once to add it. The list call is cached per request, so the
  page and the pane share one API call.
- **Today** in two columns: the day's people (two thirds), quick actions
  and reminders beside them; New contact / Text a group in the header.
- **Profile** as a settings page: a header band (avatar, name, email,
  two-factor state, counts), a section menu on the left, flat sections
  divided by hairlines (not cards), Appearance added (the avatar menu is a
  phone thing). On phones the band runs edge to edge and the sections are
  the page itself.

Between 640 and 1023 px (tablets) the header with section links stays; the
bottom bar is for phones below 640 px.

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
