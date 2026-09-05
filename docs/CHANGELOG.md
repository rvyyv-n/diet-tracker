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
- **pass 28 — compound recipes and the recipe editor:** A recipe grows an
  `items` list — each ingredient a `{ name, kcal, proteinG }` snapshot picked
  from `plan.js`'s `FOOD_DB` or quick-typed — and the recipe's own `kcal` /
  `proteinG` become the sum of them (kept denormalised so callers and a backup
  file don't re-add every read). `core/recipes.js` gains `recipeTotals`,
  `getRecipe`, `createRecipe`, `updateRecipe` and `recipeKey`-guarded rename
  (the editor blocks a name collision up front, `updateRecipe` is the
  backstop); `saveRecipe` is now a thin wrapper that stores a logged extra as a
  one-item recipe, so the dedupe and sanitise rules live in one place. On
  Today, the Recipes tab gains a **recipe editor** that expands in place — a
  name field, the ingredient list with add / remove, a pick/type
  add-ingredient sub-form mirroring the extras entry, and a running total —
  opened blank from a "New recipe" trigger or on an existing recipe (where
  Delete also lives, so a destructive tap isn't sitting on every list row).
  Inserting a compound recipe still logs **one** extra under the recipe's name.
  `storage.js` `SCHEMA_VERSION` 2 → 3 with a `MIGRATIONS[3]` step that
  backfills `items: [{ name, kcal, proteinG }]` onto every stored recipe from
  its flat values (pass 23's rule: bump the version, don't lean on a read-site
  `?? []`); the step passes `profile` / `days` / `weights` through untouched.
  `backup.js` already carries the whole `wgt:recipes` record, so the round trip
  needed no change. `sw.js` `CACHE_NAME` → `rise-v16`. Verified live in the
  browser preview: migration backfill, create / rename / delete, the
  one-extra-per-insert rule, and the rename-collision backstop.
  **Found and fixed in passing:** the "From the list" picker in both the new
  recipe editor and the existing pass-25 extras entry captured the `listbox`
  selection at build time and never re-rendered on change — picking any option
  but the first then hitting Add logged the *first* food; both `onChange`
  handlers now `render()`, matching the calendar popover. Two `disabled`
  toggles in the editor assigned `el.disabled = ""` (falsy — never disables);
  switched to a real boolean. The reused `.block-row__drop` / `.block-row__swap`
  strips rendered sharp-cornered inside a free-standing `.extras__row` (which,
  unlike a plan `.block-row`, is padded and doesn't clip) — scoped them to
  `--radius-control` and dropped the now-orphaned divider in that context.
- **pass 29 — most-logged meals readout:** On the Weight tab's weekly review
  card, beside the most-skipped-block line (pass 16), a muted line naming the
  recipe(s) with the highest `useCount` — "Most logged: Chai — 12 times".
  `core/recipes.js` `topLoggedRecipes(minCount = 2)` returns the book
  most-logged first, name as the tiebreak; the line is all-time (the book keeps
  only a running `useCount`, no per-use log) and stays hidden until a recipe
  has been logged at least twice, so a new book is quiet. A tie at the top
  names both. A fact, like the skip line — never a "you always reach for X"
  verdict (`insight_copy_states_facts`).
- **pass 30 + 31 — the grocery checklist and the Plan tab:** Phase 3, built as
  one pass. `plan.js` `GROCERY_LIST` went from strings to structured
  `{ name, qty, unit, step }` items (a null `qty` is an unmeasured staple —
  flour, honey — shown by name and never scaled), and a new `scaleGroceryQty`
  selector multiplies each Phase 2 baseline quantity by the active phase's
  kcal ratio (over the existing `phaseTarget`) and rounds to the item's `step`,
  so the list tracks what's actually being eaten rather than a fixed sheet —
  the roadmap's open question, resolved by the owner in favour of scaling.
  `core/grocery.js` is a new standalone record (`wgt:grocery ->
  { weekStart, checked }`, mirroring `weights.js`): `weekStart` is the Monday
  (new `core/dates.js` `startOfWeekISO`) the ticks belong to, and any read past
  that Monday reads the ticks as empty, so the list resets itself weekly with
  no need for the app to be open on the day — the stale record isn't rewritten
  until the next toggle, so opening the app in a new week costs no write. No
  schema bump: a new record just starts existing at `SCHEMA_VERSION` 3, as the
  pass-23 note predicted. A fourth **Plan** tab (`app.js` `TABS`, a new
  `clipboard-list` glyph in `ui/icons.js`; `?tab=plan` works through the
  existing `launchTab()`) carries the checklist — aisle-grouped tick rows, a
  factual "N of 20 ticked" line, a "Clear ticks" action shown only when
  something is ticked — above a read-only **plan reference sheet** built from
  `plan.js`: the three phase targets with the active one picked out, the active
  phase's meals with their times and rotation options, and the `FOOD_DB` table.
  `core/backup.js` now carries `wgt:grocery` through the export/import round
  trip (kept out of the record count — a week of ticks that self-clears isn't a
  "record" the user counts). `sw.js` `CACHE_NAME` → `rise-v17`, with
  `plan-view.js` and `core/grocery.js` added to `PRECACHE_URLS`.
- **pass 32 — configurable overview metrics:** Phase 4. The two optional
  readouts on Today's day-total card — the protein line and the "N kcal to go ·
  N blocks left" line (which also carries "Target met…" and "All done.") — are
  now each behind a Settings toggle. The kcal figure and its target are not
  toggleable; they are the screen's reason to exist. Stored as
  `profile.overviewMetrics`, a `{ [id]: false }` map naming only the readouts
  the user has *hidden* — so the default is `{}` (everything shown), an absent
  id reads as shown, and a metric added in a later pass defaults visible for
  existing users. No schema bump: `loadProfile()` already spreads the stored
  record over `DEFAULT_PROFILE`, the same mechanism `themePref` rode in on at
  pass 19. `core/profile.js` gains `OVERVIEW_METRICS` (the id list, in render
  order) and `overviewMetricShown(profile, id)` (`!== false`); `today.js`
  `totalCard()` takes the profile and renders each line only when its metric is
  shown, so a hidden line leaves no node rather than empty space. Settings gains
  an **Overview** group between Appearance and Data — one row per metric,
  reusing the pass-19 Appearance block (name + hint over a full-width segment)
  with a Show / Hide `.seg` and a hairline between the stacked rows. The toggle
  is the existing segmented control, not the switch the design export specifies
  and `design-system.md` defers, so the export gate stays closed and no tokens
  moved. No new module, so `PRECACHE_URLS` is unchanged; `sw.js` `CACHE_NAME` →
  `rise-v18`. The backup round trip carries `overviewMetrics` for free — it is
  part of the profile record `exportAll()` already reads.
- **pass 33 — the routing model:** Phase 5, and deliberately invisible — not one
  pixel moved. `app.js`'s single `activeTab` became a list of **panes**, because
  the desktop layout needs several screens rendering at once and that is a
  routing change, not a CSS one. Three things were actually in the way, and only
  the first was the obvious one. `setPanes(ids)` now diffs the requested screens
  against what is already up: arrivals are rendered, departures are dropped, and
  **a pane that survives is moved rather than re-rendered** — every screen keeps
  its view state (Today's viewed day, an open rotation picker, a half-typed
  extras form) in module scope and resets it on `render*()` entry, so blindly
  re-entering a surviving pane would have thrown that away on every layout
  change. Each pane gets its own `.pane` element, since all four screens render
  by calling `replaceChildren` on the node they are handed and would otherwise
  overwrite each other. And the third gap only exists once screens share a
  display: a block ticked on Today has to move Weight's adherence readout *now*,
  where before, reopening the screen was enough. New `core/broadcast.js` carries
  that signal — each screen publishes its own id at the end of its `render()`,
  the router repaints every mounted pane that is not in the fresh set, publishes
  are coalesced into one microtask, and any publish raised while the queue drains
  is dropped, which is what stops two panes repainting each other forever.
  Publishing on *render* rather than per write is what keeps it to one line per
  screen — today.js alone commits from a dozen places. Each screen gained a
  `repaint*()` export beside its `render*()`: same paint, without the state
  reset. The tab bar's "current" test became membership rather than equality, so
  it can already light more than one entry. Verified in the browser: a single
  pane on launch, tab taps swapping it, two panes up together, a surviving pane
  keeping its exact DOM node across a reorder, and Today's checklist moving
  Weight's "this week's adherence" (50% → 63% → 50%) live in a two-pane layout.
  `sw.js` `CACHE_NAME` → `rise-v19`, with `core/broadcast.js` precached.
- **pass 35 — the side nav and the desktop layout:** Above 1024px
  (`--bp-desktop`, repeated as a literal since a custom property cannot drive an
  `@media` condition) the bottom tab bar becomes a left side nav at
  `--panel-nav-width`, and the reading column widens from `--app-max-width`
  (580px) to `--container-app` (960px), centred in what is left. The nav gains a
  "Rise" wordmark, hidden at phone widths where the bar is four icons edge to
  edge; its rows put the icon *beside* the label rather than above it, since the
  stack only ever existed to buy label width at 390px; and the active marker
  moves from a coral top border to a coral left border plus a card-surface fill.
  Three calls were settled with the owner first, and the first is why this pass
  is almost entirely CSS: **one main pane at 1024px**, because two panes there
  leave each screen about 450px — narrower than the phone they were designed
  for; a nav tap **swaps that pane**; and `?tab=` **stays a single value**. So
  `setPanes()` gained no new caller and the pass-33 multi-pane routing is
  untouched, waiting for a `--bp-wide` layout that is now a recorded open call
  rather than a to-do. The one piece of JS is `setTabbedShell()`: the desktop
  shell reserves a left gutter for the nav, and the first-run intro, the setup
  form and the storage-off notice have no nav, so they must not reserve one —
  they keep the plain centred column via an `.app-shell--tabbed` class the
  router sets and clears. Verified in the browser at 1280 and 390: side nav with
  the active screen marked, a nav tap swapping the pane and moving the marker,
  no horizontal overflow on any of the four screens at 960px, the phone
  unchanged (fixed bottom bar, wordmark hidden), and the setup screen still a
  centred 580px column at desktop width.
- **hover, at last (pass 35):** Closes the **Hover** item on
  `design-system.md`'s *Still open* list, scoped to
  `(hover: hover) and (pointer: fine)` exactly as agreed there, so every touch
  device keeps the shipped two-state model and only the Tauri desktop build
  gains the third state. It is the single documented exception to the "there is
  NO hover styling anywhere" note at the top of `app.css`, and the note now says
  so. The rule new components have to follow: **hover is one step below the
  element's press state**, never a new colour — a row pressing to
  `--surface-cream-strong` hovers to `--surface-card`, an icon trigger pressing
  to `--surface-card` hovers to `--surface-soft`. Filled coral buttons are the
  exception to the exception: there is no token between coral-500 and the
  coral-700 press, and inventing a coral-600 is precisely what the
  design-export gate forbids, so they dim with `filter: brightness(0.96)`
  instead. Nothing moves, grows or animates on hover; motion stays with
  `:active`. `sw.js` `CACHE_NAME` → `rise-v21`; no new modules, so
  `PRECACHE_URLS` was untouched.
- **pass 36 — desktop polish from annotated review:** Four fixes from a
  screenshot pass at 1280px. The food table gained real grid columns
  (`.planref__food-portion` / `-kcal` / `-protein` as separate cells instead of
  one run-on meta string) so figures line up down the page instead of trailing
  the name on a single line. Pre-bed's meal row now shares
  `mealDisclosure()` with every other meal instead of a bespoke layout, so it
  gets the same chevron and single trailing kcal figure (protein dropped from
  the head, as the other rows already do). The weight history row's kg value
  is centred (`align-items: center`) rather than baseline-aligned. And the
  pass-35 row-padding cap — `padding-right: max(var(--row-pad-right, 0px), 100%
  - var(--app-max-width))`, which keeps full-bleed rows from stretching past
  the 580px measure they were designed at — turned out to be silently losing
  to two later, higher-specificity rules: `.weight--v2 .weight__row { padding:
  … }` and `.set2-actions .set2-row { padding-inline: 0 }`, both `0,2,0`
  against the cap rule's plain `0,1,0`. Equal-or-lower specificity loses
  regardless of source order, so the desktop cap was a no-op on both rows —
  visible as the "Up to date" trail text sitting flush against the Settings
  card edge. Fixed by scoping the cap selector to match:
  `.weight--v2 .weight__row` and `.set2-actions .set2-row` alongside the
  existing entries. `sw.js` `install` also rewritten to fetch each precache URL
  with `{ cache: "reload" }` instead of a bare `cache.addAll()` — the browser's
  own HTTP cache could satisfy `addAll()`'s internal fetches with a pre-edit
  file even right after a `CACHE_NAME` bump, so a stale file could survive an
  unregister + cache-delete cycle until this was forced past. `CACHE_NAME` →
  `rise-v23`. Verified in the browser at 1280 (all four fixes) and 390 (no
  regression — the row-cap media query and food-table grid are desktop-only).
- **pass 37 — the row-padding cap, reverted:** A second annotated round on the
  same screens showed the pass-35/36 fix looking worse than the problem it
  solved: capping a row's content to the 580px measure kept "Up to date" close
  to its label, but visually it now sat marooned in the middle of a 960px
  Settings card with a dead stretch of empty space after it before the true
  edge, and the same thing made the Plan meal figures and chevrons drift
  inward instead of sitting flush at the card's trailing edge. Fixed by
  deleting the whole cap block — `.set2-row`, `.set2-actions .set2-row`,
  `.set2-profile`, `.weight--v2 .weight__row`, `.grocery__row`,
  `.planref__target`, `.planref__meal-head` and `.planref__opt` all go back to
  a plain full-bleed `space-between`, so labels sit at the row's left edge and
  values/chevrons sit at its right edge, however far apart that puts them.
  Also fixed while re-checking these rows: `.planref__targets` is a `<ul>` with
  no reset, so it had been inheriting the browser's default 40px
  `padding-inline-start` as an unexplained gap before "Ramp-up" — this was
  never a desktop-only bug, just never previously screenshotted at a width
  where it stood out. `sw.js` `CACHE_NAME` → `rise-v24`. Verified in the
  browser at 1280 (Settings trail text and Plan figures/chevrons now flush to
  the true right edge, Targets flush to the true left edge) and 390 (no
  change, since the deleted rules only applied above 1024px).
- **pass 38 — the Plan sheet's section marks, and colour on the week:** A third
  annotated round, this one asking for prominence rather than alignment. The
  reference sheet's subheads (`Targets`, `Meals`, `Food table`, and the grocery
  aisle headings that share the class) were 12px `--text-caption-upper` in
  `--text-muted-soft` — quieter than the rows they introduced, which is what
  made the sheet read as one undifferentiated run. They move to 13px
  `--text-caption` in full `--text-ink`, keeping the uppercase tracking so the
  eyebrow register survives, and the three fixed sections each gain a muted
  Lucide glyph (`target`, `utensils`, `table` — new to `icons.js`, drawn from
  the same 0.469 set as the rest). The glyph stays `--text-muted`: coral is
  reserved for action and acknowledgement and does not become decoration. The
  card's inter-section gap went `--space-md` → `--space-lg`, since at the old
  value a heavier subhead just read as another row.
  **Two more `<ul>` padding bugs**, the same one pass 37 fixed on
  `.planref__targets`: `.planref__foods` and `.grocery__list` were also lists
  with no reset, so the food table and every grocery aisle carried the
  browser's default 40px `padding-inline-start` — the food table's names sat
  40px right of the section head that introduced them. All three lists now
  share the `margin: 0; padding: 0; list-style: none` reset, and
  `.planref__opts` had its `padding-left` restated as a full `padding`
  shorthand so it zeroes the other three sides explicitly.
  **The week gets colour.** `weight.js` grew two shared classifiers,
  `paceClass()` and `adherenceClass()`, and both the stats card and the weekly
  review now put an intake-status class on their figures: adherence, the
  4-week gain, the 4-week pace and the week-over-week weigh-in change. The
  gain inversion in `tokens.css` applies throughout — *under* the target band
  is the failure that reads red, over it is only off-pace and reads amber. The
  pass-16 note that this card uses "no colour as an alarm" is updated rather
  than quietly broken: the colour reports where the week landed, and the copy
  stays descriptive. One thing caught in review: a weigh-in delta of about
  -0.001 kg formats as "+0.00 kg", and colouring *that* red looked like a
  rendering fault rather than a flat week — so `weighInDelta()` decides its
  class from the formatted string, and anything that rounds away to zero stays
  muted. The two review notes gained small muted glyphs to match the Plan
  subheads.
  **The side nav's dead space is used.** Below 1024px nothing changes; above
  it, the four nav items left ~240px of empty column, so `navGlance()` pins a
  reference block to its foot with today's intake against target (carrying the
  intake-status colour), plan blocks remaining, and the latest weigh-in.
  Nothing in it is tappable and the type is caption-sized — it answers the
  three questions the app is otherwise navigated to for. It repaints off the
  same `subscribe()` broadcast the screens do, so ticking a block on Today
  moves it immediately. `sw.js` `CACHE_NAME` → `rise-v25`. Verified in the
  browser at 1280 (subheads and food rows now share one left edge at x=298,
  all three glyphs drawn, review figures carrying the right status colours,
  glance pinned to the nav foot) and 390 (glance `display: none`, no
  horizontal overflow, list resets applying identically).
- **pass 39 — icons everywhere, the ladder in colour, and a Title Case food table:** Four notes from an annotated round, plus a roadmap entry. **The eyebrow grew an icon slot.** Every screen had its own copy of `el("span", { class: "group__label" }, label)` — four inline in `settings.js`, two in `today.js`, and a private `group()` helper in each of `weight.js` and `plan-view.js`. They are now one exported `groupLabel(label, glyph, tag)` in `ui/dom.js`, which meant `dom.js` importing `icons.js` for the first time (safe — `icons.js` imports nothing, so there is no cycle). `.group__label` became `inline-flex` rather than `flex` specifically because `.daystrip__head` lays the "7 days" label out beside the calendar button, and a block-level label there eats the row. Eleven labels took a glyph: Profile · Appearance · Overview · Data on Settings, "7 days" and Appetite on Today, Weekly review · Trend · History on Weight, Groceries · The plan on Plan. The four grocery aisles took one each through a `AISLE_GLYPH` map keyed by the `section` string in `GROCERY_LIST` — an aisle added there without an entry renders without an icon rather than throwing, since `subhead()` already treats a missing glyph as "no icon". Ten new Lucide 0.469 glyphs inlined: `palette`, `layout-dashboard`, `database`, `calendar-days`, `shopping-cart`, `gauge`, `egg`, `archive`, `drumstick`, `leaf`. **The target ladder got its colour.** The three rungs were one muted string per row (`"2,565 kcal · 30 g"`), which is why the whole block read flat. Split into cells: a 6px rung dot (hairline ring by default, filled `--color-primary` on `.is-now`), the kcal figure at `--text-body` / `--weight-medium` rising to full ink on the live phase, and protein in `--accent-teal`. The "·" is drawn in CSS now, the same way the food table already did it. Coral here is a state marker — which rung is live — not decoration. **The food table is Title Case.** `FOOD_DB` names capitalised at the source rather than through `text-transform`, so the strings are right everywhere they surface — the table, the extras picker, and the recipe ingredient listbox all read from the same field. Hyphenates capitalise both halves ("Full-Fat Milk"); the one minor word stays down ("Clarified Butter or Oil"). **Two fixes.** `.set2-actions .set2-row` was `padding-inline: 0`, which put "Up to date" hard against the card's content edge — now `0 var(--space-xs)`, zero on the start side so the row icons still line up, the inset on the end side only. And the desktop nav's glance block became an actual card (`--surface-card` on the nav's `--surface-soft`, `--radius-card`, sides inset by the nav gutter) instead of a bordered strip taped to the bottom of the column: an eyebrow over a card is what Settings, Weight and Plan all say, and the hairline was the one place saying it differently, which is what made it read as bolted on. Its label is a `groupLabel("Today", "gauge")` now too. `sw.js` `CACHE_NAME` → `rise-v26`. Filed as a roadmap item, not built: **pass 40b**, the interactive desktop side nav — a collapsed icon rail, hover-to-expand as a floating overlay, and a persisted always-visible/on-hover toggle, sequenced into phase 7 because the slide has to honour `prefers-reduced-motion` and wants the motion tokens settled first.
- **pass 40 — the second annotated desktop round:** Nine notes plus one thing the annotations caught that the list did not. **The target ladder's names were centred**, which pass 39 caused: adding the rung dot gave `.planref__target` a third child, and `justify-content: space-between` duly pushed the middle one — the phase name — into the centre of a 960px card. Dropped `space-between` for `.planref__target-name { flex: 1 }`, so the name takes the slack and pins left at any width. **The nav glance was inset further than the nav buttons** by its own `--space-sm` side margins, on a column that already pads itself by the same amount; now `margin: auto 0 0`, flush with the tabs. **"Clear ticks" is a `Clear` secondary button** rather than a text link. **Meals got a share rail** — a 3px hairline under each meal head filled to that meal's largest option as a fraction of the day's target. Deliberately a *size* readout: colour in this app already means on-track/partway/under (inverted for a gain tracker), so a second meaning for colour on the same screen would misread. It says "breakfast is about a quarter of your day" and nothing about whether that is good, which is the only honest thing a plan sheet can say about a meal not yet eaten. Teal, matching the protein figures — the sheet's established "second number" accent. **The food table gained a column key** (Food · Amount · Kcal · Protein), desktop-only and sharing the row's exact grid tracks, since on a phone the row is a name over a run-on `250 ml · 160 kcal · 8 g` line where the units are already in the text. **`.set2-row` gained `border-radius: var(--radius-card)`** — the hover and press fills are drawn on that element, so without it they landed as a hard-edged rectangle inside a 12px-radius card, the one sharp corner on the screen. **The export freshness line is gone** — it sat as an orphan paragraph between the Export and Import rows and broke their spacing; `freshnessRow()` and the `exportFreshness` import were removed outright, which also drops the stale-export nudge. **The wordmark routes to Today**, as a `<button>` rather than a `<span>`, with a coral hover: a wordmark at the top of a nav reads as "home". **Today's two entry triggers share one strip.** `+ Log food` and `+ Add a block` were two loose pills between the block list and the appetite chips; `extrasSection()` now renders only the logged rows and the two triggers moved into a `.today-actions` footer with a hairline above, each bounded by the same hairline and radius as the panel it opens, so closed and open read as one object. Appetite stays last on the screen. **And the annotations caught the grocery list**, which pass 39's Title Case pass had missed — `GROCERY_LIST` names now match `FOOD_DB` ("Potatoes, Onions, Tomatoes"). Grocery tick keys are `section|name`, so existing ticks orphan on the rename; the list resets every Monday regardless. `sw.js` `CACHE_NAME` → `rise-v27`. Filed, not built: **pass 40c**, splitting the reference sheet and the recipe book out of Plan into a Recipes tab — blocked on the fact that the phone bar is four icons edge to edge and has no room for a fifth.
- **housekeeping — dead code out, roadmap renumbered:** A clear-out that found the folder already clean: no build output, no `node_modules`, no strays, and the only untracked files the release keystore and `dev-seed.html`, both deliberately local. What was dead was code. Forty-five lines of CSS went — `.planref__meal-desc`, `.set2-item`, the whole `.set2-sub` cluster (its `span`, `:active`, `:focus-visible`, `:hover` and `__icon` rules) and `.set2-note` — all styling elements no screen builds any more; the `.set2-sub` rules had dressed a stacked file-download action under the export row, and `.set2-note` the freshness line pass 40 removed. `core/backup.js` lost `exportFreshness()` and `STALE_AFTER_DAYS`, orphaned by that same pass; `noteExport()` stays because `settings.js` still calls it, and its section comment now says the record is kept but deliberately not surfaced so the next reader does not go hunting for the UI. Left alone on purpose: the exports no other file imports today (`plan.js` `BLOCKS` / `ROTATIONS` / `CORE_BLOCK_IDS`, `version.js` `parseVersion` / `compareVersions`, `icons.js` `iconSvg`). Those are their modules' public surface, not dead weight. The roadmap's open items were still numbered 36–41 while passes 36–40 had shipped; they are now 41–48. `sw.js` `CACHE_NAME` → `rise-v28`.
- **passes 41–43 — phase 6, the visual pass:** Three passes and one open call, shipped together because 41 and 42 land in the same two files. **Pass 41 — empty states, and a correction to the roadmap's own premise.** The roadmap listed four empty surfaces; only two of them are ever empty. Today's checklist always renders the day's blocks and the grocery list always renders its aisles from `GROCERY_LIST` — those are at *zero progress*, not empty, and dropping a glyph block over either would have covered rows that are already useful. Confirmed with the owner before building, then built for the two real ones: the weight history before the first weigh-in, and the recipe book before the first save. A shared `emptyState(glyph, line)` in `ui/dom.js` draws one 32px muted Lucide glyph over one line of copy — no illustration budget, no invented token, and no button, because on both surfaces the action that fills them is already on screen directly above and a second one would compete with the real one. The glyph is `--text-muted-soft` rather than a status colour: nothing here is a warning, and colour in this app already carries on-track/partway/under. `.extras__empty` was removed with its only caller. **The meal-block glyph open call is settled** — Plan reference sheet only, as recommended. Those rows are read, so a glyph helps you find Dinner in a list of seven; a Today checklist row is a daily tap target already carrying a name, a time, a description and a number, and a fifth element competes with the thing being tapped. `BLOCK_GLYPH` in `plan-view.js` is keyed by block **id**, not name, so renaming a block in `plan.js` cannot silently drop its glyph. Both shakes share `milk` — same drink at two times of day, and separate glyphs would imply a difference that isn't there. Breakfast reuses `egg` and Dinner `utensils`; six new Lucide 0.469 glyphs were inlined verbatim (`scale`, `book-open`, `milk`, `sandwich`, `cookie`, `moon`), `sandwich` in the raw-markup form because Lucide draws its bread as a `<rect>`. The icon sits `align-self: center` in a row that is otherwise baseline-aligned, since an `<svg>` box has no useful baseline and hangs below the name it sits beside. **Pass 42 — the day-total bar.** A 3px hairline under Today's hero figure, filled to the day's fraction of target and coloured by the same `intakeStatus()` the figure already uses. Deliberately a bar and not a ring or a dial: it is a second reading of a number that is already on screen in full, so it may add shape but must not add meaning — no label, no percentage text, no flourish when it fills, and `aria-hidden` because a screen reader gets the real numbers. Clamped at 100%: over target it simply stops full rather than overflowing, since going over is not an error in a gain tracker. **Pass 43 — the PWA icon set.** `assets/` shipped one SVG doing every job, which meant Android had no maskable variant with safe-zone padding, iOS ignored it for `apple-touch-icon` and fell back, and themed icons had no monochrome source. Now four PNGs (192, 512, a 512 maskable, and a 180 `apple-touch-icon`) plus `icon-mono.svg`, with the manifest split by `purpose` and the shortcut icons pointed at the 192. The maskable draws the art at 0.7 scale so everything that must survive the mask sits inside the centre 80% circle, and it and the apple-touch icon are square rather than pre-rounded — both platforms apply their own mask, and a pre-rounded corner shows up as a double curve. `icon-mono.svg` is one path with two subpaths and `fill-rule="evenodd"`: the egg filled, the yolk knocked out, because a solid oval is a generic blob at 24px and the hole is what makes it read as an egg. There is no rasteriser on the build machine and the app has no build step, so `tools/make-icons.py` redraws the four shapes directly with Pillow at 4× and downsamples — run by hand when the mark changes, output committed. All five files added to `PRECACHE_URLS`. `sw.js` `CACHE_NAME` → `rise-v29`.
- **pass 44 — a theme-aware favicon, and a service worker that stopped lying:** The icon set from pass 43 is a black tile, which is right on a light tab strip and wrong on a dark one — it sits there as a slightly-darker hole. `assets/icon-dark.svg` is the fix, chosen by `media="(prefers-color-scheme: dark)"` on the icon link. It is not a recolour: recolouring the tile cream was drawn and rejected, because on cream the white egg disappears and all that survives at 16px is a pale square with an orange dot. Dropping the tile keeps the actual mark, and the egg and yolk are both light enough to read on any dark chrome unaided. With the tile gone the art no longer needs its padding, so it is scaled 1.2 about the centre — measured as the largest scale that does not clip (1.2 spans y 22–495; 1.32 runs off the top) — and scaled by `transform` rather than baked numbers so the geometry stays a visible delta from `icon.svg`, which is still canonical and still what `tools/make-icons.py` mirrors. Link order matters and is commented: dark first, plain last, because Firefox ignores `media` on an icon link and takes the last one declared, so the fallback has to be the shipped mark rather than the dark variant on a white tab strip. Nothing to do for the installed icons — Android themed icons already have `icon-mono.svg` from pass 43, and neither the manifest nor `apple-touch-icon` has a colour-scheme mechanism to hook. **The service worker** stopped caching `dev-*` files. Its fetch handler is cache-first for every same-origin GET, which is what makes the app work offline, but it also meant an edited file kept serving its old copy until `CACHE_NAME` was bumped. That is a documented step for the app and a trap for a dev tool you are actively editing: it had frozen a broken `dev-seed.html` in the cache, so a syntax error that had already been fixed kept reproducing and looked exactly like the fix not working. `sw.js` `CACHE_NAME` → `rise-v30`, with `icon-dark.svg` precached.
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