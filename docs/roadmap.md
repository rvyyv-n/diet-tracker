# roadmap.md

What's still unbuilt. Shipped history in brief is `docs/CHANGELOG.md`; the
pass-by-pass detail through pass 17 is `docs/roadmap-history.md`.

## Architectural Decisions & Constraints

Settled with the user and shipped — standing constraints on future work, not
open questions. The one-line `why` is what keeps each closed; full reasoning is
in `docs/roadmap-history.md`.

```yaml
block_times_home:
  decision: "nominal meal times go into plan-spec.md first, then transcribe to plan.js"
  why: "meal timing is plan data, not presentation — it can't live only in a render function"
past_days_stay_closed:
  decision: "browsing back never reopens a day — isDayEditable is unchanged"
  why: "adherence % feeds the adjustment engine, so history has to stay honest"
second_shake_slot:
  decision: "A3 gets its own rotation slot (`shake2`), not B2's"
  why: "a shared slot would make picking heavy for the 2nd shake silently rewrite the 1st"
backup_round_trip:
  decision: "close the existing export/import gap; no CSV export, no merging import"
  why: "CSV and a merging import are new features stacked on a round trip that was broken"
insight_copy_states_facts:
  decision: "the time-of-day cue and the most-skipped readout state facts, never verdicts or gamified streaks"
  why: "both sit one design slip from the guilt mechanic the never-nag principle rules out"
tokens_reuse_first:
  decision: "reuse tokens.css first; new UI may add its own tokens without sign-off, recorded in tokens.css and design-system.md (relaxed 2026-09-24)"
  why: "the export is settled; asking before every new value slowed new screens, and one home for tokens is what actually stops drift"
design_overhaul_v3:
  decision: "v3.0 is a full visual and UI/UX overhaul; the designer has full freedom over the look, adapting the owner's Bookcook design system to Rise. The product rules (never nag, inverted intake colours, past days closed, no Today date stepper, suggest-never-apply, offline) still hold (2026-09-26)"
  why: "the owner loved the design made for Bookcook; the 2026-09-03 export was a marketing-site system reconciled into an app, and a design made for the app should replace it rather than be patched onto it"
animations_last:
  decision: "motion polish and component-framework adoption come after every feature phase"
  why: "effects applied to surfaces that aren't final have to be ported twice"
reminder_push_no_personal_data:
  decision: "the web push server stores only a subscription endpoint, timezone, and the bare clock times to ping — never meal names, plan or log data"
  why: "closed-app web reminders need a server, but the no-accounts/no-network line still holds for actual diet data — the service worker decides what to show at delivery time from a local copy of today's plan. The times were added in pass 53: a ping for a switched-off add-on would reach a worker with nothing to show, and browsers penalise a push that shows no notification"
```

## Not doing

Raised on a release ballot or since, and deliberately excluded — don't
re-propose without a reason that wasn't already weighed:

- **Mark the rest done** (one tap to tick all remaining blocks) and a general
  **undo toast** — on the ballot, not taken.
- **CSV export** and a **merging import** — dropped in favour of repairing the
  round trip first (see `backup_round_trip`).
- **Streak count** — the classic guilt mechanic the never-nag principle rules out.
- **Free-text day notes** — conflict with the pass-9 decision against prose.
- **7-day appetite strip** — held. (The plan reference sheet that used to sit
  here shipped in phase 3, pass 31.)
- **A contextual "you're short and it's late — add a shake" nudge** — follows
  plan-spec.md's own appetite tactic, but held as the closest thing to a nag on
  the list.
- **A second desktop pane** — one pane stays the layout at every width. The
  pass-33 multi-pane routing (the `panes` list in `App.jsx`,
  `core/broadcast.js`) stays in place unused rather than being ripped out.
- **Online food lookup** (`src/js/data/food-source.js`) — a 20-entry local
  `FOOD_DB` plus user recipes covers the feature, and `tokens.css` requires the
  app work with no network. Revisit only if it's actually wanted.
- **Recipe photos** — images don't fit localStorage's ~5MB budget, so a real
  version means IndexedDB as a second storage path: new migration surface, a
  rewritten backup format, and an export that stops being human-readable JSON.

## v3.0 — the design overhaul

The brief is `docs/design-overhaul-brief.md`. The design handoff landed on
2026-10-01 and supersedes `tokens_reuse_first` for everything it covers. It
ships two Looks, Paper (default) and Reel, each with light and dark, switched
by `data-look` and `data-theme` on `<html>`. Components read semantic tokens
only. The export is kept private and is not committed.

### How to run a build pass

Say the build pass by number or name ("build pass 1", "foundation", or one
of its targets like "tokens" or "pass 63"). It runs to the protocol in the
`build-pass` skill: for each target in order, read its design refs, build it,
verify it and make one commit; then stop and report. Build passes run in
order because each builds on the one before, and a build pass whose
predecessor is unticked is flagged before it starts. Start each build pass in
a fresh thread. The design refs are paths inside the private design export
(`design-system/…`, `screens/…`).

| Build pass | Name                       | Targets (pass numbers)                       | Model                   |
| ---------- | -------------------------- | -------------------------------------------- | ----------------------- |
| 1          | Foundation                 | `tokens` (63), `looks` (64)                  | Sonnet 5.5, high effort |
| 2          | Components and shell       | `components` (65), `shell` (66)              | Opus, high effort       |
| 3          | Daily screens              | `today` (67), `weight` (68)                  | Sonnet 5.5, high effort |
| 4          | Plan, settings and recipes | `plan` (69), `settings` (70), `recipes` (71) | Sonnet 5.5, high effort |
| 5          | First run and identity     | `firstrun` (72), `icons` (73)                | Sonnet 5.5, high effort |
| 6          | Audit and README           | `sweep` (74), `readme` (75)                  | Opus, high effort       |
| 7          | Motion                     | `motion` (76)                                | Sonnet 5.5, high effort |

Then a full `/code-review` over everything since `v2.3.0` (Opus), a phone
and desktop test pass, and the release.

### Build passes

#### Build pass 1 — Foundation

Model: Sonnet 5.5, high effort. Targets: tokens, looks. This is the design foundation: tokens, fonts and Look plumbing. Nothing looks finished yet.

- [ ] **Pass 63 · `tokens`** — the new token layer, fonts and service worker.
  - Reads: `tokens/*.css`, `styles.css`, `guidelines/porting-to-code.md`
    steps 1 and 3, `design-system.md`'s old-to-new alias map.
  - Does: replaces `tokens.css` with the foundation, Paper, Reel and
    screen-level layers; maps every old token name to the new semantic name
    across `app.css`; accent becomes `#E0673F` with `--accent-text` for coral
    text; vendors Fraunces and Atkinson Next (from the export) and downloads
    Newsreader 400, 500, 400 italic and Barlow Semi Condensed 500, 600, 700
    as woff2; drops Inter and the old Newsreader file; adds the fonts to the
    service worker precache and bumps `CACHE_NAME`; rewrites `design-system.md`
    against the new tokens.
  - Done when: the app builds and renders in Paper light with no broken
    styles; `test:offline` passes with the fonts local; the literals ratchet in
    `literals.test.js` is lowered to match.

- [ ] **Pass 64 · `looks`** — Look and theme plumbing.
  - Reads: `guidelines/looks.html`, the Looks and themes notes in the design
    system readme.
  - Does: `lookPref` on the profile next to `themePref` (default `paper`,
    migration-safe); `theme.js` writes `data-look` and `data-theme` and
    resolves "System" in JS, with no duplicated dark block in a media query;
    `index.html`'s first-paint script sets both; `<meta name="theme-color">`
    values follow the Look; unit tests for the profile and the resolution
    logic.
  - Done when: both attributes are set on load with no flash, and switching
    either persists across a reload and an export/import.

#### Build pass 2 — Components and shell

Model: Opus, high effort. Targets: components, shell. This is the shared component set and the navigation frame. Every later screen copies the patterns set here, so this one gets the stronger model.

- [ ] **Pass 65 · `components`** — the shared component set.
  - Reads: `components/**` (`.jsx`, `.d.ts`, `.prompt.md`),
    `guidelines/porting-to-code.md` step 4.
  - Does: ports Button, IconButton, Chip, Segmented, Toggle, Radio, TextField,
    Card, Eyebrow, SectionHeading, StatusDot, DotStrip, DayTotal, BlockList,
    BlockRow, NowMarker, DueCard, SuggestionCard, StatRow, PhaseLadder,
    GroceryList, WeightChart, Sheet, Toast, Banner, ConfirmPanel, EmptyState,
    ListRow, ListGroup, OptionRow and CalendarGrid into `src/components/` as
    class-based CSS in `app.css` (variable names kept); hover under
    `(hover: hover) and (pointer: fine)`, press scale .97, a `:focus-visible`
    ring; draws the inferred states (Toggle off, Button disabled and pressed);
    restyles the `src/js/ui/` popover, listbox and date pickers; reconciles
    `shared.jsx`.
  - Done when: every component renders in both Looks and themes on a scratch
    page, and the screens still work unchanged.

- [ ] **Pass 66 · `shell`** — navigation and layout frame.
  - Reads: `components/surfaces/PhoneNav.jsx`, `SideNav.jsx`,
    `screens/Rise Desktop.dc.html`, `ui_kits/rise/DesktopApp.jsx`.
  - Does: the floating 64px phone pill, 12px from the edges, with the sun on
    the active tab; the 256px desktop nav with Recipes as the fifth item and
    the Today glance card in its foot; the 1080px content column and the 340px
    support column; `tabParent` keeps Plan lit on Recipes.
  - Done when: navigation works at 390, 320 and 1440 in both Looks.

#### Build pass 3 — Daily screens

Model: Sonnet 5.5, high effort. Targets: today, weight. This is the two screens used every day.

- [ ] **Pass 67 · `today`** — Today, phone and desktop.
  - Reads: `screens/Rise Today Phone.dc.html`, the Today frames in
    `Rise Desktop.dc.html`, `ui_kits/rise/TodayScreen.jsx`.
  - Does: DotStrip, DayTotal with the sun and horizon, BlockList, BlockRow,
    NowMarker and DueCard (emphasis only, earlier blocks recede but stay
    tappable); Shake's "Most skipped" tag while it is upcoming; "Yesterday
    isn't finished" and "This day is closed."; the Log food, Swap, Add a block
    and Calendar sheets (520px dialogs on desktop) in `LogFood.jsx`; the tick
    toast with Undo; the storage-full banner.
  - Done when: a Today grid matches the design in both Looks, light and dark,
    at 390 and 1440, with nothing clipping at 320.

- [ ] **Pass 68 · `weight`** — Weight, phone and desktop.
  - Reads: `screens/Rise Weight Phone.dc.html`, `WeightChart.jsx`,
    `SuggestionCard.jsx`, `ui_kits/rise/WeightScreen.jsx`.
  - Does: the chart with its full-bleed horizon and HTML axis labels, the pace
    dot (nothing on Weight is red), StatRow, the suggestion card with Apply and
    Not now (never self-applying), the weigh-in sheet and dialog with the save
    toast and Undo, and the weight-history empty state.
  - Done when: the grid matches in all combinations, and the engine's
    suggestion still only applies on the button.

#### Build pass 4 — Plan, settings and recipes

Model: Sonnet 5.5, high effort. Targets: plan, settings, recipes. This is the remaining main screens, including the Look picker.

- [ ] **Pass 69 · `plan`** — Plan, phone and desktop.
  - Reads: `screens/Rise Plan Phone.dc.html`, `GroceryList.jsx`,
    `PhaseLadder.jsx`, `ui_kits/rise/PlanScreen.jsx`.
  - Does: GroceryList with the aisle marks, quantities that changed on a phase
    change shown in `--accent-text` until the Monday reset, carried-over ticks,
    and the Clear toast with Undo; PhaseLadder with status words (Now, Done, If
    stalled); the link to Recipes at the foot of Plan.
  - Done when: the grid matches, and `scaleGroceryQty` behaviour is unchanged.

- [ ] **Pass 70 · `settings`** — Settings and the Look picker.
  - Reads: `screens/Rise Secondary Phone.dc.html` (Settings frames),
    `ui_kits/rise/SettingsScreen.jsx`, `ListRow.jsx`, `Toggle.jsx`.
  - Does: the ListGroup and ListRow layout, the Toggle (on is ink, never
    green), Segmented controls, the Look picker tiles using a nested
    `data-look` and `data-theme` for live previews, and the reset-all confirm;
    adds `reel` to `LOOKS` in `e2e/visual.spec.js`.
  - Done when: picking a Look changes the whole app at once and persists.

- [ ] **Pass 71 · `recipes`** — Recipes, phone and desktop.
  - Reads: `screens/Rise Secondary Phone.dc.html` (Recipes frames), the
    Recipes frames in `Rise Desktop.dc.html`, `EmptyState.jsx`.
  - Does: the recipe book, the recipe editor sheet, the two-step delete
    confirm (no Undo), the recipe-book empty state, and the reference content
    that moved here from Plan.
  - Done when: the grid matches, reached from Plan on phone with Plan lit.

#### Build pass 5 — First run and identity

Model: Sonnet 5.5, high effort. Targets: firstrun, icons. This is the welcome flow and the redrawn app icon and logo.

- [ ] **Pass 72 · `firstrun`** — first run, intro and What's new.
  - Reads: `screens/Rise Secondary Phone.dc.html` (first-run frames),
    `Welcome.jsx`, `Intro.jsx`.
  - Does: the three-step first run with the Look as an optional step 2 (Skip
    keeps Paper, the preview changes on pick, the Look applies on Continue);
    the intro; the What's new card. These are the only places the slower
    theatrical motion is allowed, described here and built in `motion`.
  - Done when: a fresh profile walks through first run in both Looks.

- [ ] **Pass 73 · `icons`** — app icon and logo.
  - Reads: `Wordmark.jsx`, the brand notes in the design system readme.
  - Does: redraws the app icon and wordmark (the "Rıse" with the sun as its
    dot) on the new palette; regenerates the PNG, maskable and mono icons, the
    theme-aware favicon, `manifest.json` colours, and the Android and Windows
    icon sources through `tools/make-icons.py`.
  - Done when: the icon reads well at 16px and 512px, light and dark.

#### Build pass 6 — Audit and README

Model: Opus, high effort. Targets: sweep, readme. This is the cross-cutting audit that approves the visual baselines, then the README redesign from final screenshots.

- [ ] **Pass 74 · `sweep`** — the cross-cutting pass.
  - Reads: the Verify list in the design README, `guidelines/sizing.html`.
  - Does: every remaining sheet and confirm at phone and as 520px dialogs;
    320px nothing clips on every screen; body contrast at least 4.5:1; 44px
    targets; a status word beside every status dot; reduced motion; drives
    `literals.test.js` to zero (only `theme.js` hex stays); sets `LOOKS` to both
    and approves the visual baselines with `test:visual:update`.
  - Done when: `check`, `test:offline` and `test:visual` are green across Paper
    and Reel, light and dark.

- [ ] **Pass 75 · `readme`** — README redesign in the style of the owner's
      other project.
  - Does: centred header, badges, a screenshot row from `scripts/shot.mjs`,
    contents, install, features, privacy and development sections; keeps the
    status line honest.
  - Done when: it renders cleanly on GitHub and every link resolves.

#### Build pass 7 — Motion

Model: Sonnet 5.5, high effort. Targets: motion. This is animation, last. Switch to Opus only if the choreography needs planning.

- [ ] **Pass 76 · `motion`** — animation, last.
  - Reads: `guidelines/motion.html`, the motion notes in `product-rules.md`.
  - Does: daily interactions at 90 to 260ms on `cubic-bezier(.22,1,.36,1)`,
    press scale .97, tick pop and sun settle on the spring curve, sun travel
    520ms, the theme cross-fade, the slow theatrical moments for intro, first
    run and What's new only; a test that animations use the duration tokens and
    never their own milliseconds; reduced motion zeroes every duration.
  - Done when: nothing animates that the design doesn't describe, and reduced
    motion is fully still.

Decided with the design: Shake keeps its "Most skipped" tag (a fact, per
`insight_copy_states_facts`). The collapsible desktop rail (pass 40b) is
undesigned and waits until the redesign is done.

## later

- [ ] **v2.3.0 phone and desktop pass** — Plan → Recipes and back on a real
      phone, the storage-full banner, and reminder sync on the deployed build
      (reminders are unavailable locally). Scheduled for after the release.
- [ ] **Verify the in-app update check** picks up `v1.6.0` — on a v1.5.x
      install, that Settings → Check for updates now offers 1.6.0 and links the
      right asset. One-off, do it when a device is in hand.
- [ ] **Android PWA verification** — the browser-installed path (install /
      standalone / persistence) on a real Android device, from the Pages URL.
      Non-blocking, carried since v1.0.0; do it when a device is in hand.
- [ ] **Web push against the deployed Worker** — a live-site subscription
      reached the Worker's KV on 2026-09-15; a push from a real cron tick is still
      to see. The local rehearsal passed end to end, so this confirms the deploy.
- [ ] **Start with Windows** — needs a sign-in to see Rise come up in the tray.
- [ ] **Android reminders on a phone** — the permission prompt, a reminder
      arriving with the app closed, and one surviving a reboot. Slipped from the
      v2.2.0 checklist by the owner; do it when a device is in hand.

## v2 — shipped

All four confirmed features shipped: off-plan food and recipes, the grocery
checklist, configurable overview metrics, and the desktop layout. Pass-by-pass
detail is in `CHANGELOG.md`.

- **phase 0 — design system** ✅ passes 21–22
- **phase 1 — off-plan food and recipes** ✅ passes 23–27 (`SCHEMA_VERSION` → 2)
- **phase 2 — recipe book, expanded** ✅ passes 28–29 (`SCHEMA_VERSION` → 3)
- **phase 3 — grocery checklist with weekly reset** ✅ passes 30–31; added the Plan tab
- **phase 4 — configurable overview metrics** ✅ pass 32
- **phase 5 — the desktop layout** ✅ passes 33, 35 — side nav above 1024px, one main pane at every width
- **phase 6 — the visual pass** ✅ passes 41–44 — empty states, day-total bar, real PNG icons, theme-aware favicon
- **phase 7 — motion + the framework question** ✅ pass 45 (React + Vite migration), pass 46 (tick + progress-bar motion); pass 48 (Plan's reference split out to Recipes) shipped in v2.3
- **phase 8 — the 2.0 release** ✅ pass 49; **v2.0.0 shipped 2026-09-08**, Pages moved to GitHub Actions
- **phase 9 — v2.1** ✅ passes 50–51; **v2.1.0 shipped** — hover-rail easing, recipe book promoted to its own Recipes screen
- **phases 10–12 — v2.2** ✅ passes 52–56; **v2.2.0 shipped 2026-09-15** — meal reminders on the web, Windows and Android
- **phase 13 — v2.3** ✅ passes 57–62 and 48; **v2.3.0 shipped 2026-09-24** — failed and corrupt writes surface, a test floor in CI, accessible pickers, and Plan's reference moved to Recipes

## resuming on another machine

`git clone`, then `npm install` and `npm run dev` (pass 45 added Vite — it
understands the `public/` convention that `manifest.json`, `sw.js` and
`assets/` now live under, which a plain `python -m http.server` does not:
that would 404 on all three). `file://` breaks ES-module imports regardless of
server. `npm run build` produces the real deployable output in `dist/`.
Ensure the local project brief (gitignored) is copied to the root by hand.
