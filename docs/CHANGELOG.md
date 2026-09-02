# CHANGELOG.md

where the build is, and what each completed pass did. numbers for the plan itself live in `plan-spec.md`; design tokens in `design-system.md`.

## v1.6 — in progress (completed passes)

**Status.** Passes 14–17 are built on `release-1.6`:
- **pass 14 — rotations:** Sticky rotations seeded from `allDays().at(-1)`, and A3 gets its own `shake2` slot pinned to the same option list to prevent under-counting kcal.
- **pass 15 — the past:** Adherence dot strip added (coloured by `intakeStatus`) on Today. Date stepper was built and removed after review. Browsing earlier days goes solely through the dot strip and backfill prompt.
- **pass 16 — the week:** Weekly review card (avg kcal, adherence, weight change) and most-skipped block readout added to Weight tab. 
- **pass 17 — the data round trip:** Export replaced with `Blob` download (fixes clipboard secure-context issue). Paste JSON import added. Backup freshness line and pre-import/reset undo snapshot added.

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