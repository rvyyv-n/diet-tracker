# CHANGELOG.md

where the build is, and what each completed pass did. numbers for the plan itself live in `plan-spec.md`; design tokens in `design-system.md`.

## v2.0.0 — in progress

*Status — building on `release-2`. Not released.* The phased plan lives in `roadmap.md`.

- **pass 21 — the design system reconciliation:** The full Claude Design export arrived (`design-export-prompt.md` is the prompt that produced it) and proved to be the *same* source system already implemented, so palette, spacing, radii, elevation, motion, font stacks and the display/title/body type scale were byte-identical to `tokens.css` — this was additive, not a rewrite. `design-system.md` rewritten around what actually ships, gaining a **deliberate departures** table (the six places Rise knowingly differs from the export, with reasons) and a **Still open** queue of unconfirmed `PROPOSED` values. Token changes: metric roles left mono for serif (hero figure) + sans (inline), every call site already declaring `tabular-nums` — which dropped JetBrains Mono and 43KB of woff2 from the precache and re-measured `.block-row__kcal` `min-width` 88px → 72px to match the narrower face; `--text-link` coral-500 → coral-700, fixing a live ~3.0:1 AA failure on body-sized links; `--icon-button-size` 36px → 44px; new `--night-sunken`; dark elevation re-expressed as hairline outline + inner top highlight, since a black shadow is invisible on a near-black surface; and `--duration-entry` / `--transition-entry` for phase-2 sheets. `sw.js` `CACHE_NAME` → `rise-v14`. Two of the export's three flags (font CDN, icon CDN) were already solved in Rise and were dismissed as stale. Held against the export: the 44px tab bar (pass 18, device-tested), the pass-19 night ramp, coral toggles, and `--surface-overlay`'s existing meaning.
- **pass 23 — the schema migration:** `storage.js` `SCHEMA_VERSION` 1 → 2, the
  first real bump since pass 1 — every field added since (`bonus` pass 8,
  `appetite` pass 9, the `shake2` slot pass 14) had shipped through an
  accessor-level `?? []` fallback rather than a version bump, so the
  `MIGRATIONS` ladder in `storage.js` had never actually run. `migrate()` steps
  now receive the record's `name` alongside its data, since `SCHEMA_VERSION` is
  one number shared across `profile` / `days` / `weights`, and a step has to
  pass through anything it doesn't own unchanged. The v2 step backfills
  `extras: []` onto every stored day that predates the field — `newDay()` has
  seeded it on new days since it was reserved for v2, but older users' history
  never got it — so pass 24 can sum `day.extras` directly instead of leaning on
  a fallback at the read site. No new storage keys yet: the recipe book (pass
  26) and grocery state (pass 28) are new records, not shape changes to an
  existing one, so they need no migration — they'll simply start existing.
- **pass 24 + 25 — extras, model and entry surface, together:** Built as one
  pass since the model had no real caller to validate its shape against
  otherwise. `core/extras.js` mirrors `day.js`'s style (pure, day in / day
  out): `addExtra` (name / kcal / protein, blank names rejected, bad numbers
  sanitised to 0, `crypto.randomUUID()` id), `removeExtra`, `dayExtras`.
  `day.js` `dayTotals()` now sums `extras` into kcal/protein and folds its
  count into `done` (extras genuinely touch a day, same as bonus blocks) —
  `total`, the adherence denominator, is untouched, so `intakeStatus()` picks
  up off-plan eating for free without it counting as adherence. On Today, a
  new **Extras** section renders under the checklist: existing entries as
  removable rows (reusing `.block-row__kcal` / `.block-row__drop` rather than
  a parallel treatment), then a "Log food" trigger opening a panel with a
  segmented pick/type toggle — pick a `FOOD_DB` entry through the existing
  `ui/listbox.js` (kcal/protein come along with it), or quick-type a one-off
  (Add stays disabled until a name is typed). Both paths respect
  `isDayEditable`, same as blocks. Verified live via the browser preview: both
  entry paths correctly moved the day total and protein line, removal worked,
  and the row survived a full page reload.
  **Found and fixed in passing:** `backup.js` `importAll()` wrote records
  straight through `save()`, bypassing `load()`'s migration entirely — since
  `save()` stamps the *current* `SCHEMA_VERSION` onto whatever it's given,
  importing a pre-pass-23 backup would have marked its un-migrated day records
  as already current, silently skipping the `extras` backfill forever.
  `storage.js` gained `migrateRecord()` (the same ladder `load()` uses, callable
  on a record from anywhere) and `importAll()` now runs every record through it
  before saving.
- **pass 26 — the recipe book:** `core/recipes.js`, a new standalone record
  (`wgt:recipes -> { recipes: [...] }`, mirroring `weights.js`) for named,
  reusable off-plan items — `{ id, name, kcal, proteinG, createdAt, lastUsedAt,
  useCount }`. Not day data and not on the profile: a recipe outlives any one
  day and never touches adherence. Two operations tie it into the app, both on
  Today's Extras section. **Save** on a logged extra's row (the rotation-Swap
  strip, `.block-row__swap`, reused rather than a new treatment) writes it to
  the book; it's hidden once that name is already saved. A new **Recipes** tab
  in the "Log food" panel lists the book as `.extras__row` cards with a button
  face — one tap logs that recipe as an extra on the day — each with the shared
  × to drop it from the book (not the day). Inserting calls `touchRecipe()`,
  which bumps `useCount` and stamps `lastUsedAt`, so `allRecipes()` floats what
  you actually repeat to the top — the "history" the roadmap asked for, without
  a full insertion log. Names dedupe case-insensitively (`recipeKey`):
  re-saving "Chai" over "chai" updates that entry's numbers instead of adding a
  twin. The Recipes tab is the default when the book is non-empty (repeat meal
  = one tap); the toggle falls back to the pass-25 pick/type pair when it's
  empty. No schema bump — a new record just starts existing at the current
  `SCHEMA_VERSION`, exactly as the pass-23 note predicted.
- **pass 27 — the backup round trip covers recipes:** `backup.js` `exportAll()`
  now reads `wgt:recipes` into the envelope and `importAll()` writes it back
  through `migrateRecord()` like the other three records, so the
  `backup_round_trip` constraint holds — an export then import no longer
  silently drops the recipe book. `countRecords()` gains a `recipes` count;
  Settings surfaces it in the import preview (always) and in the record
  subtitle and reset confirmation (only when non-zero, to keep the common
  wording clean). The pre-import / pre-reset undo snapshot covers recipes for
  free — it is just `exportAll()`. **Found and fixed in passing:**
  `core/extras.js` (added pass 25) was never appended to `sw.js`
  `PRECACHE_URLS`, so an offline or installed client would fail to load it —
  precisely the "a missed entry is an offline break that only shows up after
  install" the roadmap warns about. Added it alongside `core/recipes.js`;
  `CACHE_NAME` -> `rise-v15`.
- **pass 22 — closing the genuine design-system gaps:** Three items the "Still open" queue flagged as truly missing, not merely undocumented. **Focus ring:** adopted the export's canvas-gap + coral double ring, replacing the 3px 15%-alpha coral wash — `--border-focus: var(--coral-500); --focus-ring: 0 0 0 2px var(--surface-canvas), 0 0 0 4px var(--border-focus)`. The dark-theme override was deleted outright rather than re-specified: `--surface-canvas` already flips per theme, so the one declaration resolves correctly in both, and every one of the 21 existing `:focus-visible` call sites in `app.css` picked up the new ring for free since they all read the token, never a literal. **Breakpoints:** the 5-token scale landed as reference-only constants (`--bp-compact` 360 · `--bp-medium` 600 · `--bp-expanded` 840 · `--bp-desktop` 1024 · `--bp-wide` 1440, plus `--gutter-*`, `--panel-nav-width`, `--panel-detail-width`, `--container-app`) — correctly not wired into media queries yet, since a custom property can't drive `@media`; that wiring is phase 4's job. **Form controls:** no code change. `design-system.md` documents the existing `.field` / `.seg` system as already coherent and defers checkbox/radio/toggle/slider until a feature actually needs one, on the standing rule that unused component CSS rots. Phase 4 is now unblocked.

## v1.6.0 — shipped

*Status — released as `v1.6.0`.* Passes 14–20 built on `release-1.6`, fast-forwarded to `main`, tagged `v1.6.0`, and published as a GitHub Release with the APK + Windows installer attached.
- **pass 14 — rotations:** Sticky rotations seeded from `allDays().at(-1)`, and A3 gets its own `shake2` slot pinned to the same option list to prevent under-counting kcal.
- **pass 15 — the past:** Adherence dot strip added (coloured by `intakeStatus`) on Today. Date stepper was built and removed after review. Browsing earlier days goes solely through the dot strip and backfill prompt.
- **pass 16 — the week:** Weekly review card (avg kcal, adherence, weight change) and most-skipped block readout added to Weight tab. 
- **pass 17 — the data round trip:** Export replaced with `Blob` download (fixes clipboard secure-context issue). Paste JSON import added. Backup freshness line and pre-import/reset undo snapshot added.
- **pass 18 — small platform:** Three independent items. (a) Time-of-day cue: `plan-spec.md` gains a block-times table, transcribed to `BLOCKS[].time`; Today marks the block whose nominal time has most recently passed as "now" (coral), dims earlier ones, labels the rest — today only, typography-only. (b) Manifest shortcuts: "Log weight" / "Today" entries pointing at `./?tab=<id>`; `app.js` `route()` seeds `activeTab` from a `?tab=` param via `launchTab()`. (c) lb / stone display: new `core/units.js` + shared `ui/weight-input.js`; `profile.weightUnit` ("kg" | "lb" | "st") is a display/entry choice with kg still stored everywhere. Toggle lives on the setup form (heightUnit pattern); stone entry is a st + lb pair. Weight-change deltas render in kg or lb, never stone. Rates (kg/wk) and the plan target band stay metric.
- **tab bar trim:** the icon tab bar dropped from a 54px min-height to 44px (2px padding), removing a dead band on tall phones; `.app-content` bottom clearance 64px → 56px to match.
- **pass 19 — dark mode:** `tokens.css` gains a full `--night-*` ramp; the dark theme re-points the semantic aliases from it, driven by `prefers-color-scheme` and overridden by `[data-theme]` on `<html>`. New `profile.themePref` ("system" | "light" | "dark") with a full-width segmented toggle in a new **Appearance** group on Settings; `core/theme.js` applies it, keeps `<meta name="theme-color">` in step, and runs a `prefers-reduced-motion`-aware cross-fade on a switch. `index.html` pins the theme pre-paint and carries per-scheme `theme-color` meta tags. The Settings About block dropped its `--surface-dark` navy device for an ordinary soft card so it inverts cleanly. Three inline coral-wash literals were tokenised (`--surface-primary-tint`, `--chart-cone-fill`, `--divider-strong`) so they stay visible on night surfaces.
- **pass 20 — the 1.6 release:** Version bumped to `1.6.0` in `appinfo.js`, `build.gradle.kts` (+ `versionCode` 3), `tauri.conf.json`, `Cargo.toml`, and `README.md`. `sw.js` `CACHE_NAME` → `rise-v13`, with `core/theme.js`, `core/units.js` and `ui/weight-input.js` added to `PRECACHE_URLS`. `schema wgt v1` unchanged.
- **Today strip trim:** the adherence dot strip moved from under the checklist to just below the header, cut from six weeks to 7 days (labelled "7 days"). Older days are now reached through a compact calendar popover beside the label (`ui/date-calendar.js`, capped at today, seeded on the viewed day) rather than by scrolling a long dot row.
- **review-pass polish:** day-total "All blocks done." → "All done."; checklist rows read name-then-time (was time-then-name), and the current block is marked by a coral edge on the row rather than an inline "now" label that crowded the name — that coral edge moved off B2 (the shake), which now looks like any other row. Setup form title matches the tab-screen titles (`.screen-head--setup`) and its title/intro gap tightened. Weight history rows stack the week-over-week change under the date instead of a fourth column, colour-coded green/red/neutral by direction, and the per-row pencil is coral.

## v1.5.0 — shipped

*Status — released as `v1.5.0`.* Passes 8–13 built and merged to `main`, `release-1.5` fast-forwarded in and tagged. 

- **pass 8 — manual add-on blocks:** `day.bonus` list added for ad-hoc blocks that count toward kcal but do not inflate adherence denominator.
- **pass 9 — appetite check per day:** 3-way tap scale (stuffed / fine / hungry) wired to `day.appetite`.
- **pass 10 — header polish:** Eliminated filler sublines, adjusted title-to-eyebrow gaps, fixed layout bugs under 360px.
- **pass 11 — first-run intro splash:** Branded card fade to welcome screen, stored "seen" flag on profile.
- **pass 12 — the update check:** Hard 7-day background check + manual tap on Settings. Deep-links asset via GitHub API; network-honesty note added to About/README.
- **pass 13 — the 1.5 release:** Version bumps, `sw.js` precache list updated.

## v1.0.0 — shipped

- **pass 1 — models and first-run:** `plan.js`, `day.js`, `welcome.js`. Pure data modeling and profile collection.
- **pass 2 — the daily checklist:** `today.js`, running kcal/protein, inline rotation pickers, `storage.js` day records map.
- **pass 2b/2c — polish:** UI control kit (`popover.js`, `listbox.js`, `date-calendar.js`), UTC commit timestamps, capitalisation fixes.
- **pass 3 — weight & adjustment engine:** `core/weights.js`, `trend.js`, `adjust.js`. Weight tab + trend chart. Engine computes add-on suggestions natively.
- **pass 4 — Settings / About:** Setup edit route, data export/import, offline reset. Icon set swapped to Lucide. 
- **pass 4b — port from v1.2 branch:** App renamed Rise, micro-interactions added, backdated weigh-ins, PWA shell & `manifest.json`.
- **pass 5 — v1 packaging polish:** Phase ladder, safe-area insets (`env(safe-area-inset-*)`), settings row wrapping under 360px.
- **pass 6 — storage durability + Pages deploy:** `navigator.storage.persist()` wired up. GitHub pages deployed with `.nojekyll`. 
- **pass 7 — executables:** Android APK via WebViewAssetLoader built in GitHub Actions. Desktop `.exe` via Tauri + NSIS installer.