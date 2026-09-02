# roadmap.md

## Architectural Decisions & Constraints
```yaml
block_times_home:
  decision: "nominal meal times go into plan-spec.md first, then transcribe to plan.js"
past_days_stay_closed:
  decision: "browsing back never reopens a day — isDayEditable is unchanged"
second_shake_slot:
  decision: "A3 gets its own rotation slot (`shake2`), not B2's"
backup_round_trip:
  decision: "close the existing export/import gap; no CSV export, no merging import"
insight_copy_states_facts:
  decision: "the time-of-day cue and the most-skipped readout state facts, never verdicts or gamified streaks."
```

## 1.6 — Active Build Passes

**Pass 18 — Small Platform**
- [ ] **Time-of-day cue:** Add `times:` block to `plan-spec.md` (breakfast ~08:00, shake ~11:00, lunch ~13:30, snack ~16:00, 2nd shake ~17:00, dinner ~19:30, pre-bed ~22:00). Transcribe as `time` in `plan.js`. Today view marks the block due now (weight/typography only, no red "overdue").
- [ ] **Manifest shortcuts:** Add long-press icon shortcuts for "Log weight" and "Today". Read `?tab=` param in `route()` to set `activeTab` before `renderShell()`.
- [ ] **lb / stone display:** Mirror the `heightCm` / `heightUnit` pattern. Weight is stored strictly in `kg`. `profile.weightUnit` controls rendering in `welcome.js`, entry validation, and chart axes.

**Pass 19 — Dark Mode**
- [ ] Implement `prefers-color-scheme` via `tokens.css` `--night-*` palette.
- [ ] Add settings override stored on the user profile.
- [ ] Add dark `theme_color` counterparts to `manifest.json` and `index.html`.
- [ ] Refactor the Settings "About block" — remove the `--surface-dark` contrast device and ensure true dark mode visibility.
- [ ] Honour `prefers-reduced-motion` for theme transitions.

**Pass 20 — The 1.6 Release**
- [ ] Bump version to `1.6.0` in `appinfo.js`, `build.gradle.kts`, `tauri.conf.json`, `Cargo.toml`, and `README.md`.
- [ ] Add all new modules to `sw.js` `PRECACHE_URLS` and bump `CACHE_NAME`.
- [ ] *Note: `schema wgt v1` remains unchanged.*

## later
- [ ] Grocery checklist with a weekly reset.
- [ ] Daily meal reminders (local notifications at the best time to eat each block).

## v2 — post-MVP
- [ ] **Custom recipes / off-plan food:** Allow users to build non-plan entries (quick-type name/kcal/protein, or via `FOOD_DB`). Render under the daily checklist and adjust day totals.
  - Save entries as named, reusable recipes (recipe book with history).
  - Wire this into the reserved `day.extras` property.
  - Re-introduce `src/js/data/food-source.js` as an async seam when the network path is needed.
- [ ] **Configurable overview metrics:** Allow users to add/remove/hide readouts on the daily total (e.g., toggling the protein line).
- [ ] **Desktop layout:** Implement a purpose-built wide-screen native layout (side nav, all three screens laid out together). Must be a deliberate structural design pass, not just media queries bolted onto the mobile CSS.

## resuming on another machine
`git clone`, then serve the folder over http (`python -m http.server`). `file://` breaks ES-module imports. 
Ensure `CLAUDE.md` is manually copied to the root, as it is gitignored.