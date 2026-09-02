# roadmap.md

## Architectural Decisions & Constraints

Settled with the user and shipped — standing constraints on future work, not
open questions. The one-line `why` is what keeps each closed; full reasoning is
in `docs/legacy/roadmap-full-history.md`.

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
- **7-day appetite strip** and a **read-only plan reference sheet** — both held;
  the reference sheet overlaps the v2 grocery checklist and is now scheduled
  with it in phase 2.
- **A contextual "you're short and it's late — add a shake" nudge** — follows
  plan-spec.md's own appetite tactic, but held as the closest thing to a nag on
  the list.

## later
- [ ] **Verify the in-app update check** picks up `v1.6.0` — on a v1.5.x
  install, that Settings → Check for updates now offers 1.6.0 and links the
  right asset. One-off, do it when a device is in hand.
- [ ] **Android PWA verification** — the browser-installed path (install /
  standalone / persistence) on a real Android device, from the Pages URL.
  Non-blocking, carried since v1.0.0; do it when a device is in hand.
- [ ] Daily meal reminders (local notifications at the best time to eat each block).

## v2 — the build plan

Scope confirmed with the owner: **all four features ship in v2** — off-plan food
and recipes, the grocery checklist, configurable overview metrics, and the
desktop layout. Three standing decisions shape the ordering:

```yaml
vanilla_through_v2:
  decision: "stay vanilla ES modules for the design-system and feature phases; the build/framework call is deferred to phase 5"
  why: "a framework migration before any user-visible feature is a rewrite of 3,000 working lines that also touches sw.js precaching, the Android WebViewAssetLoader path, and the Tauri build"
animations_last:
  decision: "motion polish and any component-framework adoption come last, after every feature phase"
  why: "effects applied to surfaces that aren't final have to be ported twice; keeping them last lets them be scoped per surface"
design_export_gate:
  decision: "no implementation begins until the owner supplies the full Claude Design export"
  why: "design-system.md already forbids inventing tokens silently — building against assumed values is how the app drifts from the system"
```

### phase 0 — the design system

Everything downstream renders through this, so it lands first. It is a
**reconciliation, not a from-scratch build**: `src/css/tokens.css` is already
324 lines carrying the base palette, semantic aliases, spacing, radii,
elevation, a full type scale, motion tokens, and the `--night-*` dark ramp from
pass 19. `docs/design-system.md` is a 75-line print-oriented summary whose
"What's missing" list has largely been answered in code and never written back.

- [x] **pass 21 — reconcile the doc to the code and the export.** *(done)* The
  export arrived 2026-09-03 (`docs/design-export-prompt.md` is the prompt that
  produced it) and proved to be the same source system: base palette, spacing,
  radii, elevation, motion, font stacks and the whole display/title/body type
  scale were byte-identical to `tokens.css`, so this was additive rather than a
  rewrite. `design-system.md` rewritten around what ships, with a **deliberate
  departures** table recording the six places Rise knowingly differs. Applied:
  metric roles moved off mono to serif (hero) + sans (inline), which dropped
  JetBrains Mono and 43KB of woff2 from the precache; `--text-link` coral-500 →
  coral-700 (a live ~3.0:1 AA failure); `--icon-button-size` 36 → 44px; a
  `--night-sunken` step; dark elevation re-expressed as outline + inner
  highlight; and `--duration-entry` / `--transition-entry` for phase-2 sheets.
  `sw.js` `CACHE_NAME` → `rise-v14`.
- [ ] **pass 22 — close the genuine gaps.** Three things are truly missing
  rather than merely undocumented: **form controls** are not systematised,
  there is no documented **focus-visible** standard (51 interactive-state rules
  exist in `app.css`, but no stated rule), and there are no **desktop
  breakpoints** — only `600px` and `360px`, neither of which is a wide layout.
  Phase 4 cannot start until the breakpoint scale exists. The export supplies
  candidate values for all three (§10, §8, §15) but marks them `PROPOSED` and
  unvalidated against a real screen — the "Still open" list at the foot of
  `design-system.md` is the working queue. Note the focus ring is a genuine
  *conflict*, not a gap: the export proposes a canvas-gap + coral double ring,
  Rise ships a 3px coral wash at 15% alpha.

### phase 1 — off-plan food and recipes

The flagship item, and the one with the most groundwork already laid:
`day.extras` is reserved and initialised in `newDay()`, and `FOOD_DB` in
`plan.js` already carries 20 entries with portions.

- [ ] **pass 23 — the schema migration.** Do this *before* the feature, not
  alongside it. v2 adds three new shapes (extras in use, a recipe book, grocery
  state) to a store still on `schema wgt v1`. A dedicated migration pass with a
  version bump is cheap insurance against corrupting 1.6 users' history, and it
  gives every later pass a stable place to land its data.
- [ ] **pass 24 — extras in the model.** New `core/extras.js` of pure functions
  mirroring `day.js` style (add / remove / update; day in, new day out). Wire
  `dayTotals()` to sum `extras` into kcal and protein **without growing
  `total`** — extras take the `bonus` semantics exactly: they move intake, never
  the adherence denominator. `intakeStatus()` then picks them up for free, which
  is correct, since eating off-plan really does raise intake.
- [ ] **pass 25 — the entry surface.** Two paths into an extra: quick-type
  (name / kcal / protein) and pick-from-`FOOD_DB` through the existing
  `ui/listbox.js`. Renders under the daily checklist on Today. Must respect
  `isDayEditable` — the `past_days_stay_closed` constraint applies to extras
  exactly as it does to blocks.
- [ ] **pass 26 — the recipe book.** Named, reusable entries with history.
  These are *not* day data, so they live under their own storage key rather than
  on the day or the profile. Saving an extra as a recipe, and inserting a recipe
  as an extra, are the two operations.
- [ ] **pass 27 — extend the backup round trip.** The `backup_round_trip`
  constraint makes this non-optional: export and import must cover recipes and
  the new day shape, or pass 17's repaired round trip silently starts dropping
  data.

**Not doing in v2:** re-introducing `src/js/data/food-source.js`. The roadmap
holds it for "when the network path is needed", and v2 does not need it —
`tokens.css` states the app must work with no network, and a 20-entry local
`FOOD_DB` plus user recipes covers the feature. Revisit only if online food
lookup is ever actually wanted.

### phase 2 — grocery checklist with weekly reset

Cheapest real feature on the list: `GROCERY_LIST` already exists in `plan.js`
with four sections, under a comment reading "Resettable weekly in the UI."

- [ ] **pass 28 — grocery state and the reset.** Store checked items against a
  week anchor (`{ weekStart, checked: {} }`); on load, if the current week has
  rolled past `weekStart`, clear the checks. Week arithmetic goes through
  `core/dates.js`, not new date code.
- [ ] **pass 29 — the screen.** A fourth tab is the honest home for it; the tab
  bar is 44px and takes a fourth icon without structural changes. Ships
  alongside the held **plan reference sheet**, which the "Not doing" list parks
  until it can be designed *with* the grocery checklist — this is that moment.

**Open question for the owner:** `GROCERY_LIST` is hardcoded "at Phase 2
volume". Should quantities scale with the user's current phase, or stay a fixed
list? Scaling is more correct and more work; a fixed list is honest if it is
labelled as a Phase 2 baseline.

### phase 3 — configurable overview metrics

- [ ] **pass 30.** Let the user show/hide readouts on the day total (the
  protein line is the motivating case). Stored as `profile.overviewMetrics`;
  the Settings surface follows the segmented-group pattern established by
  Appearance in pass 19. Small and self-contained — sequenced here as a
  breather between two heavy phases.

### phase 4 — the desktop layout

The largest item, and a deliberate structural pass — the roadmap is explicit
that media queries bolted onto the mobile CSS do not count. Depends on phase 0
delivering a breakpoint scale.

- [ ] **pass 31 — routing.** `app.js` `route()` currently swaps a single
  `activeTab`. A wide layout shows all three screens at once, so simultaneous
  rendering is a real change to the routing model, not a CSS problem. Do this
  before any layout work.
- [ ] **pass 32 — side nav and wide layout.** The bottom tab bar becomes a side
  nav above the desktop breakpoint. Chief beneficiary is the Tauri desktop
  build, which today ships the phone layout stretched wide.

**If v2 runs long, this is the cut line.** Phases 0–3 are a coherent, shippable
release on their own; the desktop layout is the natural 2.1.

### phase 5 — motion, and the framework question  (last, by decision)

- [ ] **pass 33 — the framework call.** With every surface final, decide
  whether the reactbits.dev components justify a build step. Options in
  ascending cost: port the effects to vanilla, add Vite for bundling only, or
  adopt a component framework. Deferring to here means the decision is made with
  full knowledge of what v2 actually became.
- [ ] **pass 34 — motion polish.** Subtle, not showy; scoped per surface.
  The `--duration-*` / `--ease-*` tokens and the `prefers-reduced-motion` block
  already exist and must be honoured.

### phase 6 — the 2.0 release

- [ ] **pass 35.** Version to `2.0.0` across `appinfo.js`, `build.gradle.kts`
  (+ `versionCode` 4), `tauri.conf.json`, `Cargo.toml`, and `README.md`. `sw.js`
  `CACHE_NAME` → `rise-v15` or later (pass 21 already took `v14`), with every module added across phases 1–4 appended
  to `PRECACHE_URLS` — a missed entry is an offline break that only shows up
  after install.

## resuming on another machine
`git clone`, then serve the folder over http (`python -m http.server`). `file://` breaks ES-module imports. 
Ensure `CLAUDE.md` is manually copied to the root, as it is gitignored.
