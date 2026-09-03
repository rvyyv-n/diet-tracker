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
  with it in phase 3.
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
  decision: "stay vanilla ES modules for the design-system and feature phases; the build/framework call is deferred to phase 6"
  why: "a framework migration before any user-visible feature is a rewrite of 3,000 working lines that also touches sw.js precaching, the Android WebViewAssetLoader path, and the Tauri build"
animations_last:
  decision: "motion polish and any component-framework adoption come last, after every feature phase"
  why: "effects applied to surfaces that aren't final have to be ported twice; keeping them last lets them be scoped per surface"
design_export_gate:
  decision: "SATISFIED 2026-09-03 — but never invent a token value; anything the export marks PROPOSED needs sign-off before it is load-bearing"
  why: "design-system.md already forbids inventing tokens silently — building against assumed values is how the app drifts from the system"
```

### phase 0 — the design system ✅ done

**Passes 21–22 are done** — see `CHANGELOG.md`. The export landed, proved to be
the same source system already implemented, and `design-system.md` now
documents what ships. Pass 22 closed the three genuine gaps: the focus ring
adopted the export's canvas-gap + coral double ring (displacing the old 15%-
alpha wash), the five-token breakpoint scale landed as reference constants in
`tokens.css`, and form controls were confirmed already coherent and documented
as-is. **Phase 5 (the desktop layout) is unblocked.**

### phase 1 — off-plan food and recipes ✅ done

**Passes 23–27 are done** — see `CHANGELOG.md`. `SCHEMA_VERSION` went to 2 and
the migration ladder ran for the first time, backfilling `extras: []` onto old
days (23); `core/extras.js` and the Today entry surface landed and `dayTotals()`
took on bonus semantics for extras (24–25); `core/recipes.js` added the
reusable recipe book, ordered by what you actually repeat, with Save on a
logged extra and a one-tap Recipes tab as its two operations (26); and the
backup round trip was extended to carry `wgt:recipes`, closing the
`backup_round_trip` gap (27). Pass 27 also caught `core/extras.js` missing from
the service-worker precache and fixed it (`CACHE_NAME` → `rise-v15`).

**Not doing in v2:** re-introducing `src/js/data/food-source.js`. The roadmap
holds it for "when the network path is needed", and v2 does not need it —
`tokens.css` states the app must work with no network, and a 20-entry local
`FOOD_DB` plus user recipes covers the feature. Revisit only if online food
lookup is ever actually wanted.

### phase 2 — the recipe book, expanded ✅ done

**Passes 28–29 are done** — see `CHANGELOG.md`. `SCHEMA_VERSION` went to 3 with
a `MIGRATIONS[3]` step backfilling `items: [{ name, kcal, proteinG }]` onto every
stored recipe (28); `core/recipes.js` grew `recipeTotals` / `getRecipe` /
`createRecipe` / `updateRecipe` and the Recipes tab gained an expand-in-place
**recipe editor** for compound recipes, rename and delete, still logging one
extra per insert (28); and the Weight tab's weekly review card gained a
most-logged-recipe line beside the most-skipped-block readout (29). Pass 28 also
fixed a pre-existing `listbox` staleness in the extras "From the list" picker and
rounded the reused `.block-row__drop` strip inside free-standing `.extras__row`
cards. `sw.js` `CACHE_NAME` → `rise-v16`.

### phase 3 — grocery checklist with weekly reset

Cheapest real feature on the list: `GROCERY_LIST` already exists in `plan.js`
with four sections, under a comment reading "Resettable weekly in the UI."

- [ ] **pass 30 — grocery state and the reset.** Store checked items against a
  week anchor (`{ weekStart, checked: {} }`); on load, if the current week has
  rolled past `weekStart`, clear the checks. Week arithmetic goes through
  `core/dates.js`, not new date code.
- [ ] **pass 31 — the screen.** A fourth tab is the honest home for it; the tab
  bar is 44px and takes a fourth icon without structural changes. Ships
  alongside the held **plan reference sheet**, which the "Not doing" list parks
  until it can be designed *with* the grocery checklist — this is that moment.

**Open question for the owner:** `GROCERY_LIST` is hardcoded "at Phase 2
volume". Should quantities scale with the user's current phase, or stay a fixed
list? Scaling is more correct and more work; a fixed list is honest if it is
labelled as a Phase 2 baseline.

### phase 4 — configurable overview metrics

- [ ] **pass 32.** Let the user show/hide readouts on the day total (the
  protein line is the motivating case). Stored as `profile.overviewMetrics`;
  the Settings surface follows the segmented-group pattern established by
  Appearance in pass 19. Small and self-contained — sequenced here as a
  breather between two heavy phases.

### phase 5 — the desktop layout

The largest item, and a deliberate structural pass — the roadmap is explicit
that media queries bolted onto the mobile CSS do not count. Depends on phase 0
delivering a breakpoint scale.

- [ ] **pass 33 — routing.** `app.js` `route()` currently swaps a single
  `activeTab`. A wide layout shows all three screens at once, so simultaneous
  rendering is a real change to the routing model, not a CSS problem. Do this
  before any layout work.
- [ ] **pass 34 — side nav and wide layout.** The bottom tab bar becomes a side
  nav above the desktop breakpoint. Chief beneficiary is the Tauri desktop
  build, which today ships the phone layout stretched wide.

**If v2 runs long, this is the cut line.** Phases 0–4 are a coherent, shippable
release on their own; the desktop layout is the natural 2.1.

### phase 6 — motion, and the framework question  (last, by decision)

- [ ] **pass 35 — the framework call.** With every surface final, decide
  whether the reactbits.dev components justify a build step. Options in
  ascending cost: port the effects to vanilla, add Vite for bundling only, or
  adopt a component framework. Deferring to here means the decision is made with
  full knowledge of what v2 actually became.
- [ ] **pass 36 — motion polish.** Subtle, not showy; scoped per surface.
  The `--duration-*` / `--ease-*` tokens and the `prefers-reduced-motion` block
  already exist and must be honoured.

### phase 7 — the 2.0 release

- [ ] **pass 37.** Version to `2.0.0` across `appinfo.js`, `build.gradle.kts`
  (+ `versionCode` 4), `tauri.conf.json`, `Cargo.toml`, and `README.md`. `sw.js`
  `CACHE_NAME` → `rise-v16` or later (pass 27 took `v15`), with every module added across phases 1–6 appended
  to `PRECACHE_URLS` — a missed entry is an offline break that only shows up
  after install.

## resuming on another machine
`git clone`, then serve the folder over http (`python -m http.server`). `file://` breaks ES-module imports. 
Ensure `CLAUDE.md` is manually copied to the root, as it is gitignored.
