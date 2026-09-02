# roadmap

where the build is, and what each remaining pass does. numbers for the plan
itself live in `plan-spec.md`; design tokens in `design-system.md`.

## done

**pass 1 — models and the first-run screen**

- `src/js/core/plan.js` — the plan as data: blocks, phases, rotations, shakes,
  the food table, the grocery list, and the adjustment-rule table. pure, with no
  storage or DOM.
- `src/js/core/day.js` — one day's intake: toggle blocks, choose rotations,
  derive kcal and protein, intake status (the weight-gain inversion — "well
  under" is the failure state), adherence. pure functions.
- `index.html` and `src/css/app.css` — the shell and the shared UI primitives
  (button, field, restyled native date input, unit toggle), taken from the
  design system.
- `src/js/welcome.js` — first-run profile screen. collects height (cm or
  ft/in), current weight, date of birth, target rate and start date, and stores
  them locally through `profile.js`. this is the only screen so far, and it is
  what `index.html` loads directly.

**pass 2 — the daily checklist (the reason the app exists)**

- `src/js/today.js` — the blocks active for the day's phase, in time-of-day
  order; tap a row to mark it eaten. B2 (the shake) carries a coral edge because
  it is the highest skip risk (`plan-spec.md`).
- running kcal and protein from completed blocks, the intake-status colour on
  the total, and a "N kcal to go · M blocks left" line
- inline rotation picker per block (breakfast / lunch / dinner / shake) that
  re-totals the day
- `src/js/core/days.js` — day records in one `wgt:days` map through
  `storage.js`. No `SCHEMA_VERSION` bump: a brand-new record type needs no
  migration, and `loadProfile()` now merges over the defaults so added profile
  fields (`currentPhaseId`) don't need one either.
- `src/js/core/dates.js` — local-time date helpers. `Date.toISOString()` is UTC
  and would file an evening entry under the wrong day.
- `src/js/app.js` — routing: the welcome screen until the profile is complete,
  then the daily screen. Also advances the plan phase with the weeks (1 → 2,
  never 3). `index.html` loads this now instead of `welcome.js`; `welcome.js`
  became `renderWelcome(mount, { onComplete })` and is imported on demand.
- backfill: yesterday stays editable through the whole of the next day, then
  closes; a quiet prompt shows if it was left part-done

**pass 2b — date components and checklist polish**

- `src/js/ui/` gained a small control kit: `popover.js` (open / outside-click /
  Escape), `listbox.js` (a styled `<select>` replacement), `date-dropdowns.js`
  (day / month / year, for the date of birth) and `date-calendar.js` (a
  month-grid popover, for the plan start date). `welcome.js` uses these instead
  of native `type="date"` inputs.
- rotation picker reworked: recessed panel, left indent, a `● / ○` radio dot,
  the current pick coral-tinted — reads as a nested choice, not more rows
- phase banner cut to `<phase name> · Week N` — name over number, kcal dropped
  (already on the total card). Phases gained a short `name` in `plan.js`.
- capitalisation: `Ramp-up` in the banner; `D3`'s description lower-cased to
  match its siblings. The quantity-led descriptions were left as they are.
- "Today" heading bumped 28 → 36 px (`.today__title`; delete the rule to revert)
- `day.extras` was reserved in `newDay()` back in pass 2a; its UI is a v2 item

**pass 2c — polish from screenshot feedback**

- phase line moved beneath the "Today" title, not above it
- "kcal" shown quietly on each meal row's number (not on the big total), so the
  figure isn't a bare unexplained number
- Swap sits on its own recessed strip so it reads as a control
- `listbox.js` gained keyboard support: type-ahead, ↑/↓, Home/End, Enter/Esc
- stale "lands in the next build pass" copy on the setup summary fixed

**commit timestamps** — the earlier "flatten to noon UTC" scheme future-dated
every commit (local date runs ahead of UTC). History was rewritten again to the
real instant in UTC (`+0000`): correct "N ago" everywhere, no explicit `+05:00`.
The post-commit hook is gone; `TZ=UTC` on the machines keeps new commits at real
UTC. Full local time would show a correct absolute clock but state the zone.

**pass 2c addendum** — "Edit setup" on Today now opens the profile form
directly (`renderWelcome(..., { edit: true })`), skipping the summary hop. The
summary still shows on first-run, right after saving.

**pass 3 — weight and the adjustment engine**

Pure logic:

- `core/weights.js` — a `wgt:weights` date→kg record
- `core/trend.js` — one weight per plan week, week-over-week gain, an N-week
  rolling average of that gain, and per-week adherence
- `core/adjust.js` — `evaluate()` matches the trend + adherence to the rule
  table and returns one result (add / drop an add-on, checkup, on-track, or
  not-enough-data) with its reasoning; `applySuggestion()` returns a new
  profile. Never mutates, never auto-applies.

Screens:

- Weight tab — weekly kg entry, the fasted-morning reminder, 4-week gain vs the
  target band, this week's adherence, a history list, and an inline SVG trend
  chart (weekly line over a shaded 0.25–0.4 kg/week cone)
- a bottom tab bar (`Today | Weight`); `app.js` is now an app shell
- the suggestion shows under the phase line on Today, with Apply / dismiss;
  both hush that rule for ~a week

Resolved — the add-on question: **per-block, not per-phase.** A day snapshots
its own `addOns` list; the phase sets the default set and the kcal target, and
`activeBlocks()` resolves from the snapshot. `syncPhase()` unions the profile's
add-ons with the phase defaults (forward only). Apply mutates `profile.addOns`
directly and never touches `currentPhaseId`.

Deferred to v1 packaging, to land with the settings/about screen: the setup
screen's "Start tracking" / "Edit details" layout, and title lengths across
screens.

**pass 4 — the Settings / About screen + a consistency pass**

Built from `docs/handoff/` (a Claude Design export: `SPEC.md`, `BUILD-PROMPT.md`,
`additions.css`), now removed.

- `settings.js` — a third tab. Setup (Edit setup, back into the profile form),
  Data (Export data — clipboard primary, a small "Download file" secondary —
  and Import data with a preview panel), a reset row behind a confirm panel,
  and a dark-navy About block (`Diet Tracker · v1.0.0`, `schema wgt v1`, the
  on-device note, a Source-on-GitHub link). One delegated `data-act` handler.
- `core/backup.js` — `exportAll()` bundles the three `wgt:*` records into one
  envelope; `importAll()` writes them back and refuses a newer `schemaVersion`.
  `core/storage.js` gained `clear()` for the reset.
- `ui/icons.js` — the app's inline Lucide 0.469 glyph set, stroke 1.75. The
  tab bar is now `.tabbar--icons` (glyph above label, three tabs); Today's
  tick and Weight's row pencil use it too.
- Consistency: `.group__label` (an uppercase tracked label above a card) is
  shared by Settings and by Weight's Trend / History. The adjustment
  suggestion lost its coral left edge — which collided with the shake edge —
  and became a recessed panel; coral stays on its Apply button only.
- Carried-in fixes cleared: Weight history rows no longer overflow on a phone
  (single-line rows, week label hidden on read rows, kg back to ~20px), and
  the Settings rows are quiet list rows rather than heavy filled cards.

**pass 4b — port from the parallel v1.2 branch**

A second pass at pass-4's scope was built independently with Gemini in a
separate clone. The non-overlapping and better parts were ported onto this
branch; the rest (a mechanical plan-model change) was rejected.

- App renamed **Rise** in every user-facing string.
- Settings: the "Edit setup" row becomes a **Profile card** — name over a
  phase / height / target-rate line.
- `welcome.js` gained a real **edit mode**: "Edit profile" title, "Save
  changes" button, no summary card on save, Enter to confirm. Editing returns
  to the Settings tab, not Today.
- **Micro-interactions**: tab-change crossfade, accordion drop-in on the
  rotation / import / confirm panels, ack fade, tab-icon press-scale, colour
  easing on the checklist and day total. All disabled under
  `prefers-reduced-motion`.
- Weight: **backdated weigh-ins** — the form takes a date through the same
  `dateCalendar` popover as the plan start date (new `max` option disables
  future days).
- **PWA shell**: `manifest.json`, iOS/theme meta, an offline cache-first
  `sw.js` (precache list regenerated against the real tree), an app icon, and
  a fluid `--app-max-width: clamp(380px, 94vw, 580px)` with a flex-column
  shell that tightens its padding on a phone.
- **Rejected — plan model change.** Gemini's version promoted the Snack
  block (A1) to a mandatory core block and raised the Phase 1 target from
  2,565 to 2,855 kcal. The gentle ramp-up is a considered decision (appetite
  is the bottleneck; the engine adds the snack itself if the gain stalls),
  and it contradicts `plan-spec.md`. Not ported.

**pass 4c — merge and repo cleanup**

`pass-4a` (4 + 4b + polish) merged to `main` via PR #1. Then: the app renamed
**Rise** in the README and this file; the stale `README.md` rewritten around the
three screens and the PWA; `src/js/data/food-source.js` (an unused v2 stub) and
an unreferenced `favicon.svg` removed, with `sw.js` trimmed to match and its
`CACHE_NAME` bumped.

**pass 5 — v1 packaging polish**

- **Phase ladder** on Today — a line under the phase banner showing all three
  targets (`Ramp-up 2,565 · Working target 3,110 · Pushed 3,690 kcal`) with the
  current rung picked out. Rendered from `PHASES` in `plan.js`, so a plan-data
  change carries through. `.phase-ladder` in `app.css`, muted so it reads as
  reference, not instruction.
- **Safe-area insets finished** — `.app-shell` now folds `env(safe-area-inset-*)`
  into its top and side padding (was bottom-only, through `.app-content`), and
  the tab bar gains left/right insets. The insets resolve to 0 on non-notched
  devices, so `calc()` just returns the base value.
- **Settings rows below 360px** — `.set2-row--static` wraps and drops its
  Copy JSON / Choose file button onto its own full-width line, indented under the
  row name, so the body no longer competes with the button. Above 360px the row
  is unchanged.

**pass 6 — storage durability + Pages deploy**

- `core/persist.js` — `requestPersistence()` calls `navigator.storage.persist()`
  once per load from `app.js`, fire-and-forget. It short-circuits if the grant
  is already in place, swallows every error, and never blocks the first render.
  This closes the silent-eviction gap: localStorage already survives a reboot,
  but the OS can drop it under pressure, and iOS clears a PWA's storage after
  ~7 idle days. Nothing but the in-app **Reset all data** clears it on purpose;
  the Export button is the backstop.
- **GitHub Pages** enabled on `main` / repo root, no build step, served at
  `https://rvyyv-n.github.io/diet-tracker/`. Every path in the app was already
  relative, so it works unchanged under the `/diet-tracker/` sub-path — the SW
  scope, `manifest.json`'s `./` `start_url` / `scope`, the font `url()`s in
  `tokens.css`, all of it. Added an empty `.nojekyll` so Pages serves the tree
  as-is. `manifest.json` `name`, the `<title>` and the README heading set to
  **Rise: Diet Tracker** (the installed-app label).
- Post-install fixes from PC screenshots — the installed PWA window (a
  ~500px desktop window with a classic 15px scrollbar) showed dead space
  down the right and a strip beside the bottom tab bar:
  - **two scrollbars** — `overflow-y` was set on `<body>` as well as `<html>`,
    so the body became its own scroll container. Removed the override
    entirely; the browser default is one viewport scrollbar, shown only when
    needed. `scrollbar-gutter: stable` went too — it was reserving a strip
    that pushed the centred column off-side on screens that didn't scroll.
  - **`--app-max-width`** dropped from `clamp(380px, 94vw, 580px)` to a flat
    `580px`. The `94vw` term left a 3vw margin on every phone-width window;
    now the column fills to the viewport and only caps past 580px. The old
    380px floor also forced a horizontal scrollbar under 380px.
  - **tab bar** is `width: 100vw` (not `left:0; right:0`), so it runs the full
    width with a classic desktop scrollbar overlaying its trailing edge
    rather than leaving a ~15px strip beside it. Tab labels are centred in
    their cells, so nothing is clipped. From 600px up it's capped at
    `--app-max-width` and centred on the column via `left: 50%` +
    `translateX(-50%)`. A purpose-built wide-screen layout is a v2 item.
  - `CACHE_NAME` → `rise-v7`.
- The About block on Settings sat 1px proud on each side of the cream cards
  above it — those carry a hairline border and it didn't. Gave it the same
  box with the `--border-on-dark` hairline token. `CACHE_NAME` → `rise-v8`.
- Header prominence pass. The top-level title took **display-lg (48px)** via a
  new `--text-screen-title` APP LAYER token (serif, 400, −1px track), used by
  `.screen__title--lg` and the setup screen — the source system keeps 48px for
  marketing heroes, but the page title is the app's loudest on-screen text and
  should anchor the screen. The line beneath it (`.phase-banner`) became an
  uppercase tracked caption in the `.group__label` register, so it reads as an
  eyebrow. The backfill header shows a full date, not a one-word screen name,
  so `.screen__title--date` steps it back to display-sm (28px) — at 48px
  "Wednesday 24 September" ran to three lines on a phone. Screen-name titles
  stay one line to 320px; "Set up your plan" wraps to two only at 320px (SE
  1st-gen). `CACHE_NAME` → `rise-v10`.
- README gained an **install** section — Add to Home Screen / Install app steps
  for iPhone (Safari only), Android and desktop, with the iOS storage-eviction
  note. iPhone 11 verified: home-screen install, standalone launch and the icon
  all working.

**pass 7 — v1 packaging: executables + the release**

The Pages PWA verification: **iPhone** ✅ (home-screen install, standalone
launch, icon — multi-day idle persistence is the one thing only time
confirms; `storage.persist()` + Export are the mitigations for iOS's ~7-day
eviction) and **Desktop** ✅ (Chrome PWA window, offline after first load).
**Android** device install/standalone/persistence check is still open —
deferred, non-blocking (see "next"); the same PWA code path is already
proven on iPhone and desktop, and Chrome's install support on Android is
well-trodden ground, so this wasn't held up waiting on a device.

- **Android APK** — `android/` is a minimal WebView shell (no second copy of
  the app: `app/build.gradle.kts` copies `index.html`/`src/`/etc. from the
  repo root into `assets/` on every build). `MainActivity.kt` serves it
  through `WebViewAssetLoader` on a virtual `https://rise.local/` origin
  rather than `file://`, since Chromium blocks the ES-module imports
  `app.js` pulls in when loaded from `file://`. Chosen over a Bubblewrap TWA
  so the app carries no dependency on the Pages URL staying put —
  self-contained, offline from first launch, no permissions requested. Cost:
  no auto-update (ship a fresh APK per release).
  `.github/workflows/android.yml` builds and signs the release APK in CI —
  this machine has no Android SDK and only a Java 8 runtime, both short of
  what Gradle/AGP need, so the build runs on GitHub's runners instead of
  locally. It triggers on pushes touching the app or `android/`, on demand,
  and on publishing a GitHub Release (attaches the APK as a release asset).
  The signing keystore is generated once, kept out of the repo, and read by
  CI from GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64` +
  passwords/alias) — see `android/README.md`'s Signing section for what
  losing it would break. Verified: a run on `main` produced a
  correctly-signed ~1.9MB APK with the app's assets bundled inside.
  AAB (for a Play Store listing rather than a sideloaded APK) is a later
  add if that distribution path is ever wanted — not needed for a GitHub
  Release artifact.
- **Desktop `.exe`** — Windows only (macOS `.dmg` skipped — not the target
  platform for now). `desktop/` is a thin Tauri wrapper over the same build:
  no second copy of the app (`desktop/scripts/sync-desktop-assets.sh`
  copies `index.html`/`src/`/etc. from the repo root into `desktop/dist/`
  before every build), and `src-tauri/main.rs` just opens the window
  `tauri.conf.json` describes. Tauri serves the bundle over its own local
  origin rather than `file://`, so — unlike the Android shell — no
  asset-loader workaround was needed for the ES-module imports.
  Weighed against the already-working browser-installed PWA: this adds a
  normal "download and run setup.exe" install with no browser round-trip,
  at the cost of no auto-update (a new installer per release, same as the
  APK), a separate WebView2 storage partition from whatever browser has the
  PWA installed (Export/Import moves data between them), and — since
  there's no code-signing certificate — a SmartScreen "unknown publisher"
  warning on first run. None of that is a functionality gap: Tauri renders
  through WebView2, the same Chromium engine the browser PWA uses.
  `.github/workflows/desktop.yml` builds an NSIS installer on
  `windows-latest` — this machine has no Rust/MSVC toolchain, so the build
  runs on GitHub's runners, same reasoning as the Android pipeline. Icon
  rasterising went through two failed attempts before landing: `cairosvg`
  needs a native Cairo library pip can't provide on Windows, so it was
  swapped for `resvg` (pure Rust, no native dependency, and Rust was already
  in the job for `tauri-cli`). The `beforeBuildCommand` hook approach for
  syncing web assets also failed — its working directory didn't match what
  a relative script path assumed — so the sync runs as an explicit CI step
  with a known cwd instead. Verified: installed and launched by hand from a
  CI-built `Rise_1.0.0_x64-setup.exe` — SmartScreen prompt as expected, then
  a normal NSIS wizard, then the app rendering and persisting data
  correctly in its own window.
- **The release** — tagged `v1.0.0` and cut as a GitHub Release with source
  (attached automatically by GitHub) + the Android APK + the Windows
  installer. Both `android.yml` and `desktop.yml` attach their build to a
  published Release automatically (`on: release: types: [published]`), so
  publishing the Release is what triggers both builds to attach against it.

## next

- **Android PWA verification** — the browser-installed path (install /
  standalone / persistence) on an actual Android device, from the Pages URL.
  Deferred out of v1.0.0 as non-blocking; carried through 1.5 and into 1.6 as a
  release chore, still non-blocking. Do this when a device's in hand.

## 1.5 — shipped

The incremental release after v1. Numbered **1.5**, not 1.1, to keep the version
line clean; v2 is the whole-number jump for the bulk redesign. Character: small
features and a design-polish pass, owner-driven.

**Status — released as `v1.5.0`.** Passes 8–13 built and merged to `main`,
`release-1.5` fast-forwarded in and tagged, the Release published (`android.yml`
and `desktop.yml` attached the APK and NSIS installer on publish). Pass 12
shipped as the deep-link floor only — the two in-place updaters (Tauri updater
plugin, Android FileProvider install) were left out on purpose; see that pass.
The earlier `v1.5.0-beta.1` prerelease is kept as a historical artifact — a
prerelease is excluded from `releases/latest`, so it never reaches the update
check.

**One check remains, and it does not gate the tag.** Verify the update check
against the real `v1.5.0` tag from an installed build — it can only be done once
the tag exists. A failure there is a `v1.5.1`, not a reason to have held 1.5.
The Android PWA device check stays non-blocking and carries into 1.6.

**Nothing else went into 1.5.** The QoL set raised after the beta is scoped as
**1.6** below; it was not started on `release-1.5`.

**Decisions taken up front.** Settled with the user before these passes were
written — implement them, don't reopen.

```yaml
manual_add_on_scope:
  decision: "that day only — a manual add writes to the day record, never the profile"
  why: >
    day.addOns is already a per-day snapshot, and the use case is "I want a
    second shake today", not a plan change. A lasting change is what the
    adjustment engine's Apply is for; keeping the two paths separate means a
    manual add can never quietly re-target the plan.

manual_add_on_adherence:
  decision: "an added block is a bonus — it adds kcal when ticked but never grows the denominator"
  why: >
    Adherence has to keep meaning "did I eat the plan". If adding a block could
    lower the percentage, the feature would carry a disincentive to use it, and
    the number feeding the adjustment engine would move for a reason that has
    nothing to do with adherence.

appetite_note_form:
  decision: "a three-way tap scale (stuffed / fine / still hungry), not free text"
  why: >
    One tap, no keyboard, and structured enough that the engine could read it in
    v2 — appetite is the documented bottleneck (plan-spec.md), so a value that
    can be computed over is worth more than prose. Changes day.appetite from a
    nullable string to a nullable enum.
```

**pass 8 — manual add-on blocks on Today**

The anchor feature. The engine-only path to an add-on block feels too indirect
for a block you just want today — noticed while using v1 on a phone.

- A new `day.bonus` list: block ids added by hand for that day. It sits
  alongside `day.addOns` rather than inside it, because the two carry different
  meaning — `addOns` is the plan for the day and counts toward adherence,
  `bonus` is extra and counts only toward kcal. `newDay()` gains the field;
  `dayAddOns()` is unchanged.
- `dayTotals()` folds ticked bonus blocks into `kcal`, `proteinG` and `done`,
  but leaves `total` at the plan count — so `dayAdherence()` can read above 1
  and can never be pushed down by an added block. Check `trend.js`'s
  `weeklyAdherence` handles that ceiling rather than assuming 0–1.
- Today gains an **add a block** affordance under the checklist: the add-ons not
  already on the day (from `ADDON_IDS`), each with its kcal, in a recessed panel
  in the same register as the rotation picker — a nested choice, not more tap
  rows.
- Bonus rows render in `order` position with a quiet marker separating them from
  plan rows, and a way to drop one back off.
- **Dropping a plan add-on** — a phase default you're not having today — removes
  it from `day.addOns`, and so does shrink the denominator. This is the one path
  where adherence can be moved by hand. The mitigation is that the kcal target
  stays `phaseTarget()` and does not move, so `intakeStatus` still measures the
  day against the full phase figure. Flagged rather than prevented: the honest
  case ("I'm genuinely not having the snack") is the common one.
- Editable days only (`isDayEditable` — today, and yesterday until it closes).
- The A1 → A2 → A3 order the engine steps through is not a constraint here; a
  manual add can pick any of the three.

**pass 9 — appetite check per day**

`day.appetite` and `setAppetite()` have sat in `core/day.js` since pass 2a with
nothing reading or writing them. This wires the field up.

- `setAppetite()` narrows to the enum (`"stuffed" | "fine" | "hungry" | null`)
  and validates its input; re-tapping the current value clears it back to null.
- Today gains three chips, low on the screen under the checklist, under nothing
  heavier than a `.group__label`. Optional and skippable — the never-nag
  principle: no prompt, and no red state for a day left blank.
- No `SCHEMA_VERSION` bump. Nothing ever wrote the field, so every stored day
  already holds `appetite: null` and there is nothing to migrate.
- Nothing computes over it in 1.5. It's a record for the user, and the seam the
  v2 engine reads.

**pass 10 — header polish + design sweep**

The three items carried out of pass 6's prominence pass, plus a look for
whatever else the same eye catches.

- **#4** — drop the filler "Setup, data and about" subline (`settings.js:62`).
  Settings is the one screen whose eyebrow says nothing its title doesn't;
  Weight's and Today's carry real data and stay.
- **#3** — more air under the header block. `.screen` is a flex column at
  `--space-lg` (24px); the header wants more separation from the first card than
  the cards want from each other.
- **#5** — title-to-eyebrow gap 4 → 2px. `.screen-head` uses `--space-xxs`
  today; 2px sits below the 4pt scale, so this needs either a literal or a new
  `--space-xxxs` token. Take the token, and note in `tokens.css` why it exists.
- Then look at the three tab screens side by side for anything the changes
  expose.

**pass 11 — first-run intro splash**

Deferred through v1 "on purpose until there is an app to introduce". v1 has
shipped, so the condition is met.

- A short branded card — the Rise mark and one line on what the app does — that
  fades through to the welcome screen. `app.js` routes it ahead of
  `renderWelcome()`.
- It needs a stored "seen" flag, or a reload part-way through setup replays it.
  A boolean on the profile record is enough: `loadProfile()` merges over the
  defaults, so an added field needs no migration (same reasoning as
  `currentPhaseId` in pass 2).
- Honours `prefers-reduced-motion` like the pass-4b micro-interactions — the
  splash still shows, the fade doesn't run.
- A skip affordance and a hard cap on how long it holds the screen. An intro
  that can't be got past is worse than no intro.

**pass 12 — the update check**

**Sequenced last on purpose, and the one pass that may slip.** It is by some way
the most expensive item in 1.5 — the two real updaters together are plausibly
more work than passes 8–11 combined — and nothing in 8–11 depends on it, so it
is deliberately built when there is budget to do it properly rather than
squeezed in beside the others. If the budget isn't there when the rest is done,
take one of two exits rather than half-building it: ship the deep-link floor
described below, which is a handful of lines and gets the same v2 route, or drop
the pass to 1.6 and cut 1.5 without it. What must not happen is a
half-implemented check going out in 1.5 — see the "right first time" note below
for why that one is unrecoverable.

Added to 1.5 after the plan above was first written. The PWA already updates
itself — `sw.js` calls `skipWaiting()` on install and `clients.claim()` on
activate, so a `CACHE_NAME` bump reaches a browser-installed copy on the next
load. The APK and the NSIS installer do not: both shipped as "no auto-update, a
fresh file per release", which leaves the people most likely to be using Rise
day to day with no route to v2 but remembering to look at the Releases page.

**This is the one pass that has to be right first time.** Whatever ships in 1.5
is the code that will be running when v2 lands, and a wrong endpoint or a wrong
version compare cannot be fixed remotely — it strands every 1.5 user on 1.5.
Treat the compare and the fetch as the highest-care code in the release and test
them against a real tag before merging. Note also that none of this can help
anyone on **v1.0.0**: that build has no updater in it. 1.5 is a manual install;
the path this pass opens is 1.5 → v2 and onward.

Trigger — **a manual tap, plus a hard 7-day check**:

- A `Check for updates` row on Settings, tappable any time. (Built inside the
  About block; moved out in 1.5 to its own plain row beside "Reset all data",
  with the network-honesty note kept in the About block.)
- An automatic check at most once every 7 days, on launch. Fire-and-forget and
  off the first-render path, in the shape of `core/persist.js`.
- State lives in its own `wgt:update` record (`lastCheckedAt`, `latestSeen`) and
  not on the profile — it is device state, not user data, so `exportAll()` in
  `backup.js` should deliberately **not** bundle it. Say so there, or the
  omission reads as an oversight later.
- A failed check is silent. Offline is this app's normal case and a network
  error is not something the user did wrong: no error state, no retry loop, and
  leave `lastCheckedAt` unmoved so the next launch simply tries again.
- Never a modal and never a launch interruption — the never-nag principle holds.
  The result is a trailing word on the row (and, when there's an update, one
  panel with a download / reload button) and nothing more.

The check itself:

- `GET https://api.github.com/repos/rvyyv-n/diet-tracker/releases/latest` —
  unauthenticated, no token. The 60-per-hour-per-IP limit is unreachable at this
  volume, and `/latest` already excludes drafts and prereleases.
- No `sw.js` change is needed: the fetch handler returns early on a cross-origin
  URL, and GitHub sends `Access-Control-Allow-Origin: *`.
- `tauri.conf.json` sets no `security.csp`, so the Tauri webview won't block it.
  If a CSP is ever added, `connect-src` has to keep `api.github.com` — write
  that next to the key when it goes in.
- **The version compare must be numeric, part by part.** Tags read `v1.0.0` /
  `v1.5.0` / `v2.0.0`, the tag carries a leading `v` and `settings.js`'s
  `VERSION` does not, so strip it. A plain string compare passes today and fails
  at `v10`. Keep it a small pure function in its own module so it can be
  reasoned about, and tested, away from the network.

Which build is this? — three cases, each with its own route:

- **Browser / PWA** — served from the Pages host. Nothing to download; the
  service worker has handled it. Show "up to date", or "reload to finish
  updating".
- **Android APK** — `location.hostname === "rise.local"` (`MainActivity.kt:65`).
- **Windows / Tauri** — `window.__TAURI_INTERNALS__` is injected.

Updating in place, per platform. The user asked for a true in-app update where
one is possible, and a deep-link where it isn't:

- **Windows — the Tauri v2 updater plugin.** `tauri-plugin-updater` can download
  and install a new version in place. It needs a minisign keypair from
  `tauri signer generate` (public key in `tauri.conf.json`, private key and
  password as CI secrets), `createUpdaterArtifacts` switched on so the build
  emits a signed `.nsis.zip` + `.sig` beside the setup.exe, and an update
  manifest to poll — a static JSON on the Pages site the repo already publishes,
  or an endpoint pointed straight at the release assets. **That keypair is a
  second irreplaceable secret**, alongside the Android keystore: lose it and
  every installed copy loses its update path. Document it exactly as
  `android/README.md` documents signing.
- **Android — download, then hand off to the system installer.** A sideloaded
  APK cannot update itself silently. The best available is to fetch the new APK
  and pass it to the OS via `ACTION_VIEW` on a FileProvider URI, which requires
  the `REQUEST_INSTALL_PACKAGES` permission and shows the system install dialog.
  **This costs the "no permissions requested" property** the shell was built
  with in pass 7. If that trade isn't wanted, Android falls back to the
  deep-link below — decide when the pass is built and record which was taken.
  The downloaded APK must carry the same signing key or the install is refused;
  CI already signs with it.
- **The floor, everywhere — deep-link the asset.** Read
  `assets[].browser_download_url` off the release, match it to the detected
  build, and open the exact `.apk` or `-setup.exe`. A handful of lines that
  cannot really break. If either updater above turns out to cost more than the
  release is worth, ship this instead and move on.

Honesty about the network. This is the app's first outbound request. "Local-first,
offline, no accounts" and "data stays in your browser" all stay true, but *makes
no network requests at all* stops being true, so say so rather than let someone
find out. Nothing is sent — a GET with no token, no identifier and no body;
GitHub sees an IP, as it would for any download. The About row should state what
it contacts, and the README's offline claim should carry the exception.

Scope warning: the two real updaters together are plausibly more work than passes
8–11 combined. The deep-link fallback is there so 1.5 is never held hostage to
them.

**pass 13 — the 1.5 release**

*Done as a beta: passes 8–13 merged to `main`, deployed to Pages, cut as
`v1.5.0-beta.1` (prerelease). The `desktop/src-tauri/Cargo.toml` version was
synced to 1.5.0 too, and `desktop.yml` was fixed to clear stale bundle output
before building (a cached older installer was being swept into the release by
the `*.exe` glob). Left for the final `v1.5.0`: the real-tag verification below.*

- Version bump to **1.5.0** in all four places it is written:
  `src/js/core/appinfo.js` (`APP_VERSION` — the single JS source of truth since
  pass 12; feeds the About block and the update compare), and it replaced the
  old `settings.js` `VERSION` const), `android/app/build.gradle.kts:16`
  (`versionName`, and step `versionCode`), `desktop/src-tauri/tauri.conf.json:4`,
  and the README status block. `schema wgt v1` is unchanged — no pass above
  bumps it. **Done.**
- `sw.js` — add every new module to the precache list (passes 11 and 12 each add
  at least one) and bump `CACHE_NAME` past `rise-v10`. A new file missing from
  that list is the failure that only shows up offline.
- The Tauri updater did **not** go in (pass 12 shipped the deep-link floor), so
  `desktop.yml` attaches only the `setup.exe`. If the updater is added later,
  it also has to sign and attach the `.nsis.zip` + `.sig` and publish the update
  manifest before the Release.
- **Verify the update check against the real tag**, from an installed 1.5 build.
  This is the one thing that cannot be repaired after the fact: if 1.5 can't see
  v1.5.0, it won't see v2 either. It runs *after* the publish, not before — the
  tag has to exist for there to be anything to see. See the ordered close-out
  list in the Status block above.
- The Android PWA verification from "next" above, if a device turns up.
- Merge `release-1.5` to `main`, tag `v1.5.0`, publish the Release —
  `android.yml` and `desktop.yml` both trigger on `release: published` and
  attach the APK and the NSIS installer themselves.
- README and this file updated to record 1.5 as shipped, and the README's
  offline claim amended for the update check.

**Considered and left out of 1.5.** Custom recipes and off-plan food entries were
raised again and confirmed as **v2**, where they already sat: they are what
`day.extras` was reserved for, and a recipe book with history is a feature set,
not a small addition. The grocery checklist — the data is already transcribed in
`plan.js`, but it is a new screen plus weekly-reset state, so it stays a v2 item
too. A rotation picker for the 2nd shake — A3 is fixed at 580 kcal while B2
rotates through standard / no-blender / heavy, a real inconsistency but not one
that had bitten yet; **now scheduled as part of pass 14 in 1.6**. Meal reminders
— they need notification permissions and a scheduling path iOS PWAs don't
reliably give; recorded below as before.

**After 1.5** — the QoL set in 1.6 below, then v2 for the bulk redesign.

## 1.6 — in progress

The quality-of-life release. Scoped after the `v1.5.0-beta.1` beta by reading the
roadmap and the README against what the mainstream trackers do, then picked from
a ballot by the user. Numbered **1.6** rather than folded into 1.5 for two
reasons: it is roughly the size of passes 8–13 again, which is not what "small
features and a design-polish pass" meant; and holding 1.5 open to fit it would
leave the update check unverified against a real tag for the whole of that time.

**Status.** Passes 14–17 are built on `release-1.6`: rotations; the past (date
stepper + adherence dot strip on Today); the week (a weekly review card and a
most-skipped-block readout, both on Weight, above Trend); and the data round
trip (paste-JSON import beside Choose file, a "last export" freshness line, and
a one-slot undo snapshot taken before every import and reset — surfaced on
Settings, and on the welcome screen after a reset since that routes away).
Passes 18–20 remain.

Character: nothing here is a new capability. Every pass either removes a daily
tap, exposes data the app already stores but never shows, or repairs something
that is quietly broken.

**What this borrows from elsewhere.** Rise's premise — ticking a fixed block is
the only daily action — means the usual "faster food logging" QoL does not
translate. Three things do. Cronometer's copy-a-previous-day and MyFitnessPal's
habit dashboard both answer "make the repetitive day cost nothing", which here
becomes sticky rotations rather than copied food. MacroFactor's weekly check-in
answers "tell me what the week actually did", which `trend.js` can already
compute and nothing displays. Loop Habit Tracker's calendar answers "am I
actually doing this", which a single adherence percentage cannot.

**Decisions taken up front.** Settled with the user before these passes were
written — implement them, don't reopen.

```yaml
block_times_home:
  decision: "nominal meal times go into plan-spec.md first, then transcribe to plan.js"
  why: >
    Meal timing is plan data, not presentation. plan.js's header states it is a
    pure description of the plan — "a changed plan is a changed file, nothing
    more" — so putting the times in today.js would make them undocumented plan
    facts buried in a render function. BLOCKS gains a `time` beside `order`.

past_days_stay_closed:
  decision: "browsing back never reopens a day — isDayEditable is unchanged"
  why: >
    Adherence % feeds the adjustment engine, so history has to stay honest
    (plan-spec.md, missed_days). The stepper is a window onto stored days, not a
    second backfill route: anything outside the edit window renders exactly as a
    closed day renders today.

second_shake_slot:
  decision: "A3 gets its own rotation slot (`shake2`), not B2's"
  why: >
    blockValue() resolves through day.rotations[slot], so giving A3
    `rotation: "shake"` would make both shakes share one choice — picking heavy
    for the second would silently rewrite the first. A separate key over the same
    ROTATIONS.shake list is the only version that works.

backup_round_trip:
  decision: "close the existing export/import gap; no CSV export, no merging import"
  why: >
    Export writes JSON to the clipboard only and import accepts a file only, so
    the documented backup route cannot complete without the user hand-pasting the
    clipboard into a text editor and saving a .json. A download action and a
    paste-in route repair the actual defect. CSV and a merging import are new
    features stacked on a broken round trip, and were dropped from the ballot for
    that reason.

insight_copy_states_facts:
  decision: "the time-of-day cue and the most-skipped readout state facts, never verdicts"
  why: >
    Both sit one design slip from the guilt mechanic the never-nag principle
    rules out. "B2 is your most-missed block — 9 of the last 14 days" is a fact;
    the same number with an exclamation mark is a nag. No red rows, no streak
    that breaks loudly, no colour used as an alarm.
```

**pass 14 — rotations**

Both items touch `day.rotations` and `defaultRotations()`, so they go together.

- **Sticky rotations.** `newDay()` seeds each slot from the last choice instead
  of the hardcoded `defaultRotations()`, which resets every day to BR1 / L1 / D1 /
  standard and makes you re-pick what you almost always eat. Prefer deriving the
  seed from `allDays().at(-1).rotations` over storing a new profile field — the
  data is already there, and a profile field would need keeping in step with days
  that get edited. Fall back to `defaultRotations()` when there is no prior day.
- **The A3 rotation.** A3 (the 2nd shake) is pinned at 580 kcal while B2 rotates
  through standard 580 / no-blender 545 / heavy 790 / mass 1050 — so making the
  heavy shake as the second one records a 210 kcal under-count on precisely the
  block that exists to close a calorie gap. Add a `shake2` key to `ROTATIONS`
  pointing at the same option list, give A3 `rotation: "shake2"`, add the key to
  `defaultRotations()`, and the existing per-block picker does the rest. Delete
  the "keeps a fixed value for now" comment at `plan.js:38` when it goes.
- No `SCHEMA_VERSION` bump. A day saved before this has no `rotations.shake2`
  key; `blockValue()` already falls through to the block's nominal figure when
  `rotationOptionById` misses, which is the correct reading for a historical day.

**Design debt flagged mid-pass, since resolved.** Testing pass 14 on a local
server surfaced pass 10's title-to-eyebrow gap change (`--space-xxxs`, 4 → 2px,
`.screen-head` — the header polish + design sweep pass) as too tight — 2px reads
as misaligned rather than tight, and sits below what Material 3 typically uses
for a title/subtitle pair (~4dp). First recorded here as deferred ("revert in
the next pass that touches `.screen-head`, not pass 14"), then reverted directly
once the user asked again and it turned out to be a two-line fix backed by an
actual guideline, not a redesign: `.screen-head`'s gap moved back to
`--space-xxs` (4px), and separately, `.app-shell`'s top padding (shared by every
screen) moved from `--space-md` (16px) to `--space-lg` (24px) — iOS HIG's
16–20pt top-margin range read as cramped at our floor once a display-lg serif
title sat this close to the status bar / notch. Side gutters were untouched;
nothing flagged those. The same testing pass also surfaced and fixed two live
bugs in `block-row` (`app.css`): the bonus tag wrapping onto its own line under
the block name on narrow rows, and A3's `mass` shake option (1,050 kcal, the
first 4-digit block value) crushing the name/desc column next to it. A third,
the Settings export/import row's fallback button stretching to near-full card
width under 360px (Galaxy S8+ and narrower) rather than staying a compact
secondary action, was fixed the same way. None of the four were folded into
pass 14's scope, which stays rotations-only; they're cross-cutting fixes applied
directly because each was a breakage or a guideline miss, not taste.

**pass 15 — the past**

The app stores every day and shows you one. `allDays()` feeds the adjustment
engine; the UI's only door to the past is the backfill button that appears when
yesterday was left part-done.

- **A date stepper on Today.** `‹ ›` beside the title, stepping `viewDate`
  through recorded days. The plumbing exists — the backfill button already sets
  `viewDate` and re-renders — so this is mostly guards: don't step past
  `profile.startDate`, don't step into the future, and keep "Back to today".
  Days outside the edit window render as they already do, with the existing
  "This day is closed." line.
- **An adherence dot strip.** One small dot per day over roughly six weeks,
  coloured by that day's `intakeStatus`, with untouched days left blank. It shows
  the clusters a single percentage averages away. Tapping a dot sets `viewDate`,
  which is why it follows the stepper rather than leading it.
- Placement is the open design question: under Today's checklist, or on Weight
  above Trend. Decide it against the two screens side by side, as pass 10 did.

**pass 16 — the week**

Two readouts over data that is already computed and never shown. Both are pure
reads — no new stored state, no schema implications.

- **A weekly review card.** One completed plan week: average kcal/day, adherence
  %, that week's weigh-in and its change from the week before, and whether the
  4-week rolling average sat inside the 0.25–0.4 kg/wk band. `trend.js` already
  exposes `weeklyWeights`, `weeklyGains`, `rollingGain` and `weeklyAdherence`.
  This is reporting, not coaching — the adjustment engine keeps its own separate
  suggestion card on Today, and the two must not start arguing with each other.
- **The most-skipped block.** Count, across recorded days, how often each plan
  block went unticked, and name the worst. `plan-spec.md` marks B2 as the highest
  skip risk and the whole shake mechanism exists because liquid calories bypass
  fullness — but the app never tells you whether that risk is materialising for
  you. New maths, so it wants a small pure function next to `weeklyAdherence`
  rather than a count inlined in a render.
- Copy discipline per `insight_copy_states_facts` above. Both readouts are
  descriptive; neither gets an exhortation.

**pass 17 — the data round trip**

The one repair pass. Export copied JSON to the clipboard **only**; import accepts
a file **only**. There was no download and no paste-in, so the backup route the
README points at — for iOS storage eviction, and for moving between the APK and
the browser — couldn't complete unless the user pasted the clipboard into a text
editor and saved a `.json` by hand.

- **Export is now Download JSON, done.** Turned out worse than "no download
  path exists": `navigator.clipboard` is `undefined` outside a secure context —
  any origin that isn't `https` or `localhost`, which includes a plain LAN IP —
  so `navigator.clipboard?.writeText(json).then(...)` threw before either branch
  of that `.then()` ever ran. Copy JSON did visibly nothing, full stop; it
  wasn't a narrower "clipboard blocked" case as the old comment claimed. Rather
  than add a download beside a working copy button, **Copy JSON was replaced
  outright** with a `Blob` + object-URL download (`exportDownload()` in
  `settings.js`) — no permission needed, no secure-context requirement, works
  everywhere the app does. Filename is `rise-backup-<date>.json`.
- **Paste JSON** as a second import route beside Choose file, still open. Only
  half the round trip is fixed — Choose-file import was never broken, but
  there's still no way in without a file picker (e.g. pasting a backup someone
  sent you as text).
- **Backup freshness** — Settings shows when data was last exported, with a quiet
  line once it goes stale. The timestamp is device state, not user data: it must
  live outside the export envelope, the way `wgt:update` already does
  (`backup.js` explains that omission). Bundling it would make an imported backup
  claim you had just exported on the receiving device.
- **A snapshot before import and reset.** One slot holding the pre-change
  envelope, offering a single undo, cleared once taken. These are the only two
  destructive actions in the app and both are currently one tap past a confirm.
  Note the storage cost — it briefly doubles the footprint — so it is one slot,
  not a history.

**pass 18 — small platform**

Three independent items, none large enough to carry a pass alone.

- **The time-of-day cue.** `plan-spec.md` gains a `times:` block with a nominal
  time per block (breakfast ~08:00, shake ~11:00, lunch ~13:30, snack ~16:00, 2nd
  shake ~17:00, dinner ~19:30, pre-bed ~22:00); `plan.js` transcribes it as a
  `time` on each entry. Today marks the block due now and lets passed ones
  recede, turning six identical rows into a list that says where you are in the
  day. Weight and typography only — no red row, no "overdue".
- **Manifest shortcuts.** Long-press the icon for "Log weight" / "Today". A few
  lines in `manifest.json`, but `app.js` has no history API and always opens on
  Today, so a shortcut needs a landing route: read a `?tab=` param in `route()`
  and set `activeTab` before `renderShell()`.
- **lb / stone display.** Height already toggles cm ↔ ft/in; weight is kg-only
  end to end. Follow the `heightCm` / `heightUnit` discipline exactly — kg stays
  the stored unit, `profile.weightUnit` records how to render it, and the
  conversion is display-side. This touches `welcome.js`, every kg readout on
  Weight, the entry field's validation copy, and the chart's axis, so it is the
  largest of the three.

**pass 19 — dark mode**

Last on purpose: it has to cover everything the five passes above add, and doing
it earlier means doing it twice.

- `tokens.css` already carries a `--night-*` palette, used by the About block —
  that is the starting point, not the finished set. The work is a token pass, not
  per-component overrides.
- Default to the system preference via `prefers-color-scheme`, with an explicit
  override in Settings for people whose OS setting doesn't match how they use the
  app at night. Stored on the profile, so the merge-over-defaults rule covers it.
- The `theme_color` in `manifest.json` and the meta tag in `index.html` both need
  a dark counterpart, or the standalone window keeps a cream chrome around a dark
  app.
- The About block is the trap. It uses `--surface-dark` **as a contrast device** —
  a dark panel on a cream page. In dark mode that contrast evaporates and it
  becomes an invisible box, so it needs a deliberate re-think rather than a token
  swap. `app.css:1477` says as much about its intent.
- Honour `prefers-reduced-motion` on any theme transition, matching pass 4b.

**pass 20 — the 1.6 release**

Same shape as pass 13, and the same trap: a new module missing from the precache
list is the failure that only shows up offline.

- Version bump to **1.6.0** in the places 1.5 documented:
  `src/js/core/appinfo.js` (`APP_VERSION`), `android/app/build.gradle.kts`
  (`versionName` and `versionCode`), `desktop/src-tauri/tauri.conf.json`,
  `desktop/src-tauri/Cargo.toml`, and the README status block.
- `sw.js` — every module added by passes 14–19 into the precache list, and
  `CACHE_NAME` bumped.
- `schema wgt v1` is expected to stay put. No pass above bumps it: pass 14 leans
  on the `blockValue()` fall-through, and every new profile field is covered by
  `loadProfile()` merging over the defaults.
- Tag `v1.6.0` and publish the Release; both workflows attach their build.
- The Android PWA device check, if a device turns up.

**Considered and left out of 1.6.** *Mark the rest done* (one tap to tick the
remaining blocks) and a general *undo toast* were on the ballot and not taken.
*CSV export* and a *merging import* were dropped in favour of repairing the
round trip first — see `backup_round_trip` above. A *streak count* was dropped as
the classic guilt mechanic the never-nag principle rules out. *Free-text day
notes* conflict with the pass-9 decision against prose. A *7-day appetite strip*
and a *read-only plan reference sheet* (the blocks, rotations and foods already
in `plan.js`) were both raised and held: the reference sheet in particular
overlaps the v2 grocery checklist and should be designed with it. A contextual
*"you're short and it's late — add a shake"* nudge follows `plan-spec.md`'s own
appetite tactic and would wire to the pass-8 add panel; held as the closest thing
to a nag on the list.

## later

- grocery checklist with a weekly reset
- daily meal reminders — local notifications at the best time to eat each
  block. confirmed for the late stages of the build

## v2 — post-MVP

- **custom recipes / off-plan food entries.** add a food that isn't in the plan
  (quick-type name + kcal + protein, or build it from the `FOOD_DB` table in
  `core/plan.js`); it shows under the checklist and the day's totals adjust to
  include it. entries can be saved as named recipes — a reusable recipe book
  with history — so a repeat meal is one tap. this is what `day.extras` was
  reserved for. the old `src/js/data/food-source.js` stub (an async seam for a
  future nutrition API) was removed in the v1 cleanup; recreate it here when the
  network path is actually wanted.
- **configurable overview metrics.** add / remove / hide the readouts on the
  daily total — the protein line toggled off, other metrics added.
- **a real desktop layout.** the app is phone-first and just centres a narrow
  column on a wide screen. A purpose-built wide layout — side nav instead of the
  bottom tab bar, the three screens laid out together rather than swapped — is
  its own design pass, not a media query bolted onto the current CSS.

## resuming on another machine

`git clone`, then serve the folder over http (`python -m http.server`, or any
static server) and open it. `file://` breaks ES-module imports. there are no
dependencies and no build step.

`CLAUDE.md` and the source `.docx` / `.xlsx` are gitignored and will not be in a
fresh clone. copy `CLAUDE.md` across by hand for the full brief; otherwise this
file, `plan-spec.md` and `design-system.md` together are enough to run the next
pass.
