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
  Deferred out of v1.0.0 as non-blocking; carried into 1.5 as a release chore,
  still non-blocking. Do this when a device's in hand.

## 1.5 — planned

The incremental release after v1. Numbered **1.5**, not 1.1, to keep the version
line clean; v2 is the whole-number jump for the bulk redesign. Character: small
features and a design-polish pass, owner-driven. Everything below lands on the
`release-1.5` branch and merges to `main` in one go at release time.

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

**pass 12 — the 1.5 release**

- Version bump to **1.5.0** in all four places it is written: `settings.js:26`
  (`VERSION`, which feeds the About block), `android/app/build.gradle.kts:16`
  (`versionName`, and step `versionCode`), `desktop/src-tauri/tauri.conf.json:4`,
  and the README status block. `schema wgt v1` is unchanged — no pass above
  bumps it.
- `sw.js` — add any new module to the precache list (pass 11 adds at least one
  file) and bump `CACHE_NAME` past `rise-v10`. A new file missing from that list
  is the failure that only shows up offline.
- The Android PWA verification from "next" above, if a device turns up.
- Merge `release-1.5` to `main`, tag `v1.5.0`, publish the Release —
  `android.yml` and `desktop.yml` both trigger on `release: published` and
  attach the APK and the NSIS installer themselves.
- README and this file updated to record 1.5 as shipped.

**Considered and left out of 1.5.** The grocery checklist — the data is already
transcribed in `plan.js`, but it is a new screen plus weekly-reset state, so it
stays a v2 item. A rotation picker for the 2nd shake — A3 is fixed at 580 kcal
while B2 rotates through standard / no-blender / heavy, a real inconsistency but
not one that has bitten yet. Meal reminders — they need notification permissions
and a scheduling path iOS PWAs don't reliably give; recorded below as before.

**v2** — the bulk redesign and the larger feature set below.

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
