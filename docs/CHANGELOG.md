# CHANGELOG.md

where the build is, and what each completed pass did. numbers for the plan itself live in `plan-spec.md`; design tokens in `design-system.md`.

## v2.0.0 — in progress

*Status — building on `release-2`. Not released.* The phased plan lives in `roadmap.md`.

- **pass 21 — the design system reconciliation:** The full Claude Design export arrived (`design-export-prompt.md` is the prompt that produced it) and proved to be the *same* source system already implemented, so palette, spacing, radii, elevation, motion, font stacks and the display/title/body type scale were byte-identical to `tokens.css` — this was additive, not a rewrite. `design-system.md` rewritten around what actually ships, gaining a **deliberate departures** table (the six places Rise knowingly differs from the export, with reasons) and a **Still open** queue of unconfirmed `PROPOSED` values. Token changes: metric roles left mono for serif (hero figure) + sans (inline), every call site already declaring `tabular-nums` — which dropped JetBrains Mono and 43KB of woff2 from the precache and re-measured `.block-row__kcal` `min-width` 88px → 72px to match the narrower face; `--text-link` coral-500 → coral-700, fixing a live ~3.0:1 AA failure on body-sized links; `--icon-button-size` 36px → 44px; new `--night-sunken`; dark elevation re-expressed as hairline outline + inner top highlight, since a black shadow is invisible on a near-black surface; and `--duration-entry` / `--transition-entry` for phase-2 sheets. `sw.js` `CACHE_NAME` → `rise-v14`. Two of the export's three flags (font CDN, icon CDN) were already solved in Rise and were dismissed as stale. Held against the export: the 44px tab bar (pass 18, device-tested), the pass-19 night ramp, coral toggles, and `--surface-overlay`'s existing meaning.

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