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
- **7-day appetite strip** — held. (The plan reference sheet that used to sit
  here shipped in phase 3, pass 31 — see below.)
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
  decision: "stay vanilla ES modules for the design-system and feature phases; the build/framework call is deferred to phase 7"
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

### phase 3 — grocery checklist with weekly reset ✅ done

**Passes 30–31 are done** — see `CHANGELOG.md`. The owner resolved the open
question in favour of **scaling**: `plan.js` `GROCERY_LIST` became structured
`{ name, qty, unit, step }` items (null `qty` = unmeasured staple) and a new
`scaleGroceryQty` selector multiplies the Phase 2 baseline by the active phase's
kcal ratio (30). `core/grocery.js` is a new standalone record
(`wgt:grocery -> { weekStart, checked }`) anchored on the week's Monday via a new
`core/dates.js` `startOfWeekISO` — a read past that Monday reads the ticks as
empty, so the list resets itself weekly with no write until the next toggle; no
schema bump, as the pass-23 note predicted (30). A fourth **Plan** tab
(`clipboard-list` glyph; `?tab=plan` via the existing `launchTab()`) carries the
aisle-grouped checklist plus a read-only **plan reference sheet** — phase
targets, the active phase's meals with rotations, and the `FOOD_DB` table (31).
`core/backup.js` carries `wgt:grocery` through the round trip (kept out of the
record count); `sw.js` `CACHE_NAME` → `rise-v17`, with `plan-view.js` and
`core/grocery.js` precached.

### phase 4 — configurable overview metrics ✅ done

**Pass 32 is done** — see `CHANGELOG.md`. `profile.overviewMetrics` (a
`{ [id]: false }` map of hidden readouts, no schema bump — it merges over the
defaults like `themePref`) now gates the day-total card's protein line and
"remaining" line; `today.js` `totalCard()` renders each only when
`overviewMetricShown()` is true, and a new **Overview** group in Settings draws
one Show / Hide `.seg` per metric, reusing the pass-19 Appearance block. No new
module, so `PRECACHE_URLS` was untouched; `sw.js` `CACHE_NAME` → `rise-v18`.

### phase 5 — the desktop layout ✅ done (one open call held over)

The largest item, and a deliberate structural pass — the roadmap is explicit
that media queries bolted onto the mobile CSS do not count. Depends on phase 0
delivering a breakpoint scale.

**Pass 33 is done** — see `CHANGELOG.md`. The routing model now holds a list of
panes rather than one `activeTab`, and `core/broadcast.js` keeps simultaneous
panes in step. Nothing on screen changed; the phone still mounts exactly one.

**Pass 35 is done** — see `CHANGELOG.md`. The bottom tab bar becomes a left
side nav above 1024px, the column widens from `--app-max-width` to
`--container-app`, and hover landed scoped to
`(hover: hover) and (pointer: fine)`. The three open calls were settled with
the owner before building: **one main pane at 1024px** (two panes there leave
each screen ~450px, narrower than the phone they were designed for), a nav tap
**swaps that pane**, and `?tab=` **stays a single value**. That makes pass 35 a
pure CSS pass with no new `setPanes()` caller — the multi-pane routing from
pass 33 is untouched and waits for `--bp-wide`.

- [ ] **Open call — the second pane at `--bp-wide` (1440px).** Deferred out of
  pass 35 rather than dropped. At 1440 a 240px nav plus two 600px panes fits
  without squeezing either, which is the width where the pass-33 routing
  finally earns its keep. Undecided, and needs a real 1440px display to judge:
  which pairs are worth showing (Today + Weight is the obvious one), and
  whether the pairing is a user choice or fixed. Ask before building.

**If v2 runs long, this is the cut line.** Phases 0–4 are a coherent, shippable
release on their own; the desktop layout is the natural 2.1.

### phase 6 — the visual pass

Scoped with the owner after phase 5 was designed. Everything here is polish
over surfaces that already work, which is exactly why it sits **after** the
desktop layout and **before** motion: the `animations_last` reasoning applies
to static polish too. Empty states in particular have to be checked at wide
widths, and doing them before pass 35 would have meant doing them twice.

Two things were weighed and **excluded**, so don't re-propose them without a
new reason:

- **Recipe photos.** Images do not fit localStorage's ~5MB budget, so any real
  version means adding IndexedDB as a second storage path beside `storage.js` —
  new migration surface, a rewritten backup format, and an export that stops
  being human-readable JSON. Not worth it for a text-first recipe book.
- **Hover states.** Already on `design-system.md`'s open list and already noted
  there as belonging with desktop. It folded into pass 35, not here — shipped.

- [ ] **pass 36 — empty and first-week states.** Closes the "Empty, loading and
  error states" item on `design-system.md`'s *Still open* list. Four surfaces
  have nothing to say yet and currently say it in bare sentences: Today before
  the first tick, Weight with no weigh-ins, an empty recipe book, and an
  untouched grocery list. The treatment is one large muted Lucide glyph over a
  single line of copy — no illustration budget, no new token invented. Copy
  states a fact and offers the next action; the never-nag principle applies
  here as much as anywhere.
- [ ] **pass 37 — the day-total progress bar.** A hairline bar under Today's
  hero kcal figure, filled to the day's fraction of target and coloured by the
  `intakeStatus()` value the card already computes. Deliberately a bar and not
  a ring or a dial: it is a readout of a number that is already on screen, not
  a reward. Nothing about it may read as a score.
- [ ] **pass 38 — the PWA icon set.** `assets/` ships one `icon.svg`, which
  means Android crops it (no maskable variant with the safe-zone padding), iOS
  falls back rather than using an `apple-touch-icon`, and there is no
  monochrome variant for themed icons. Small, self-contained asset work, and
  it is the first thing anyone sees on a home screen.
- [ ] **Open call — meal-block glyphs.** Whether each block (Breakfast, the
  Shakes, Lunch, Snack, Dinner, Pre-bed) gets an identifying Lucide glyph, and
  where. The recommendation is the Plan reference sheet only: those rows are
  read, whereas a Today checklist row is a daily tap target that already
  carries a name, a description and a number, and a fourth element competes
  with the thing being tapped. Undecided — ask before building.

### phase 7 — motion, and the framework question  (last, by decision)

- [ ] **pass 39 — the framework call.** With every surface final, decide
  whether the reactbits.dev components justify a build step. Options in
  ascending cost: port the effects to vanilla, add Vite for bundling only, or
  adopt a component framework. Deferring to here means the decision is made with
  full knowledge of what v2 actually became.
- [ ] **pass 40 — motion polish.** Subtle, not showy; scoped per surface.
  The `--duration-*` / `--ease-*` tokens and the `prefers-reduced-motion` block
  already exist and must be honoured.
- [ ] **pass 40b — the interactive desktop side nav.** *(feature request)* The
  side nav that pass 35 introduced is a static 240px column: it is always there,
  it always costs the same width, and on the Tauri desktop build that is 240px
  of chrome the user never asked for. Make it interactable.

  Three parts, in order:

  1. **A collapsed rail.** The nav shrinks to an icon-only rail (roughly
     `--touch-target` wide) that keeps the four destinations reachable. The
     content column reclaims the difference. The glance block collapses with it
     — it has no legible icon-only form, so it hides rather than truncates.
  2. **Expand on hover.** Pointing at the rail floats the full 240px nav back
     over the content rather than pushing it, so the layout underneath never
     reflows and text never rewraps mid-hover. Hover only — this whole feature
     is gated behind `@media (hover: hover) and (pointer: fine)`, so a touch
     device and the phone layout are untouched by all of it.
  3. **A user toggle, persisted.** A control in the nav switches between
     *always visible* and *show on hover*, stored on the profile beside
     `themePref` (and so carried by backup/restore for free). Default is
     *always visible*, which is exactly today's behaviour — nobody is opted
     into a moving sidebar without asking.

  The animation is the reason this sits in phase 7 rather than beside pass 35:
  it needs the `--duration-*` / `--ease-*` tokens settled first, and a nav that
  slides has to honour `prefers-reduced-motion` by snapping instead. Animate
  `transform` and `opacity` only — animating `width` on a fixed-position column
  relayouts the whole page every frame.

  Two things to get right, since both are easy to miss: the hover-expanded nav
  must not trap focus differently from the pinned one (keyboard tabbing into a
  collapsed rail has to expand it), and the expanded overlay needs to sit above
  the content without covering anything interactive at the content column's
  left edge — check the Plan sheet's disclosure rows, which start closest to it.

### phase 8 — the 2.0 release

- [ ] **pass 41.** Version to `2.0.0` across `appinfo.js`, `build.gradle.kts`
  (+ `versionCode` 4), `tauri.conf.json`, `Cargo.toml`, and `README.md`. `sw.js`
  `CACHE_NAME` → `rise-v22` or later (pass 35 took `v21`), with every module added across phases 1–7 appended
  to `PRECACHE_URLS` — a missed entry is an offline break that only shows up
  after install.

## resuming on another machine
`git clone`, then serve the folder over http (`python -m http.server`). `file://` breaks ES-module imports. 
Ensure `CLAUDE.md` is manually copied to the root, as it is gitignored.
