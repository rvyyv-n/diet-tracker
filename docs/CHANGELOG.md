# CHANGELOG.md

where the build is, and what each completed pass did. numbers for the plan itself live in `plan-spec.md`; design tokens in `design-system.md`.

## v2.1.0 — shipped

*Status — released as `v2.1.0`.* Passes 50–51 built on `release-2.1`,
fast-forwarded to `main`, tagged, and published as a GitHub Release with the
APK + Windows installer attached. A small follow-on to v2: one motion fix and
the recipe book promoted to its own screen on desktop.

- **pass 50 — smoother side-rail collapse:** The hover-to-expand desktop nav
  (pass 47) snapped between its 72px and 240px widths with no `transition` at
  all, on the reasoning that tweening `width` forces a per-frame layout pass.
  On mouse-out that snap read as janky — it chopped the labels, glance card
  and pin toggle out of the DOM before their opacity/transform fade could
  play, so the fade was never seen. The width now eases over `--duration-base`
  `--ease-standard` both ways: the rail is `position: fixed` and the reading
  column's gutter is reserved off `--panel-nav-width-collapsed`
  independently, so the per-frame relayout is confined to the rail's own
  handful of rows and the column never reflows. The nav labels' `max-width`
  now tweens on the same curve (a real length, not `max-width: none`, which
  cannot interpolate) so their existing opacity + `translateX(-4px)` fade
  finally plays over a box that is genuinely narrowing rather than one that
  already snapped to zero. `overflow` still flips to `hidden` instantly on
  collapse so nothing spills as the rail closes, waiting out the widen on
  expand via a 0s-duration transition with a delay. A `prefers-reduced-motion`
  block drops the whole rail back to the original instant snap, since
  `tokens.css`'s blanket rule neutralises `transition-duration` but not
  `transition-delay`.

  Two things had to stop moving rather than move more smoothly. The **nav
  icons** keep the `--space-sm` `padding-left` they already had in the
  expanded row — in a 72px rail, less the rail's own gutter and the 2px
  active-edge border, that lands a 20px icon dead centre — so the icon does
  not shift at all as the rail opens; an earlier attempt computed the centring
  against the full rail width instead of the button's content box and shoved
  every icon hard against the overflow edge. The **wordmark** was the harder
  one, and took three goes: animating a separate one-letter mark's width down
  to 0 while a full "Rise" grew beside it dragged the word's left edge
  leftward as it arrived, so the word appeared to fly in from the right;
  overlapping the two and crossfading their opacity fixed the direction but
  made the R flicker, since two copies of one glyph at 50% alpha composite to
  ~75%, not 100%. The shipped answer is structural, not a tuning: the markup
  splits the wordmark after its first letter, so `R` is a permanent
  unanimated span and `ise` is an ordinary label that clips to nothing and
  unspools rightward out of it. There is only ever one R on screen and it
  never animates, so there is nothing left that can flicker. The two spans
  still read "Rise", so the button's accessible name is unchanged and neither
  needs `aria-hidden`; the global `.tabbar__brand-mark { display: none }` went
  with the change, since `.tabbar__brand` is already `display: none` on a
  phone and its children need no separate hide.
- **pass 51 — Recipes on the desktop nav:** The recipe book has existed since
  pass 26 but only ever inside Today's "Log food" panel, three disclosures
  deep — a first-class feature reachable only through another screen. It now
  gets a fifth nav item, **Recipes** (`book-open` glyph), on the desktop side
  rail. The phone tab bar stays four icons edge to edge: the `SCREENS` entry
  carries `desktopOnly: true`, the button carries `tabbar__btn--wide-only`,
  and CSS hides it below `--bp-desktop` where Today → Log food → Recipes is
  still the way in. `launchTab()` falls back to `today` for a `?tab=recipes`
  deep link on a narrow viewport. The new `Recipes.jsx` pane adds no new UI —
  it mounts Today's own `ExtrasRecipeForm` (now exported) with a local copy
  of the `recipeEditor` state slice that component reads and a `day` of
  today, so tapping a recipe row still logs it as an extra, here always onto
  the current day; New / Edit / rename / delete are unchanged. Recipes sits
  above Settings in `SCREENS` so Settings stays the last item in the rail. `sw.js` `CACHE_NAME` → `rise-v37`; version to `2.1.0` across
  `appinfo.js`, `package.json`, `build.gradle.kts` (`versionCode` 5),
  `tauri.conf.json`, `Cargo.toml`, and `README.md`.

  This does **not** close roadmap pass 48. Only the recipe book moved; the
  Plan tab's reference sheet, meal rotations and food table are untouched and
  still need a decision on where they belong.

## v2.0.0 — shipped

*Status — released as `v2.0.0` on 2026-09-08.* Passes 21–49 built on
`release-2`, fast-forwarded to `main`, tagged, and published as a GitHub
Release. Repo Pages was switched to the "GitHub Actions" source at the same
time, which is what `.github/workflows/pages.yml` needed to take over the
deploy. The phased plan lives in `roadmap.md`.

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
- **pass 44 fix — the add-a-block panel's rows now fill it:** Reported against the bonus-block panel: hovering *Shake 2* lit a fill that stopped 5px short of the panel's top and bottom edges and had square corners inside a 12px-radius box. `.rotation` is built as a full-bleed recessed strip nested in a block row — no radius, a hairline on top only, `--space-xxs` of vertical breathing room — and that is still right where it is used that way. Bounded inside `.addblock__panel` it is a different object, and there the padding was what held every fill (hover, press and `.is-picked`) off the edge. Scoped to the composite `.rotation.addblock__panel` so the plain picker is untouched, which the 0,2,0-vs-0,1,0 specificity settles without relying on source order. Rows now sit 1px inside the panel on all four sides — the border, and nothing else — and the first and last round to `calc(var(--radius-card) - var(--border-width-hairline))`, the outer radius less the border it sits inside, derived rather than a new value. `overflow: hidden` would have done it in one line and was rejected: a `.rotation__opt` focus ring is a box-shadow 4px outside the row, so the first and last row would have lost half their ring. `sw.js` `CACHE_NAME` → `rise-v31`.
- **loose ends — screen-reader announcements, focus-preserving re-renders, the What's New card, and three smaller fixes:** Every screen here rebuilds its subtree wholesale on each render via `replaceChildren()`, which is fine for a tap but silently drops a keyboard user's focus to `<body>` on every interaction, and leaves nothing for a screen reader to catch since a live region destroyed and recreated with its final text already in place doesn't reliably announce. Two new primitives in `ui/dom.js` close both gaps: `renderPreservingFocus(root, renderFn)` captures the focused element's `data-focus-key` before a rebuild and refocuses the matching new node after, now wrapping `today.js` and `plan-view.js`'s own `render()`; `announce(message)` writes to one shared `aria-live="polite"` region created once outside any screen's subtree, cleared then set on the next frame so a repeated identical message still fires. Checklist ticks, swap/drop buttons, appetite chips, and grocery rows all carry a `data-focus-key` now; the day total and grocery checklist announce the one fact that changed (kcal/blocks remaining, ticked count) rather than narrating the whole re-render, per `insight_copy_states_facts`. Alongside that: **the What's New card** (`core/whatsnew.js`, `whatsNewCard()` in `today.js`) shows once on Today for a device upgrading from v1.6 into v2, naming where each new feature lives rather than describing it; a fresh setup through `welcome.js` marks itself exempt immediately, since it has no "before" to compare v2 against. **Recipe delete gained a two-step confirm**, reusing Settings' `.set-confirm` rather than the rejected undo-toast pattern — a recipe is real effort to rebuild and this was the app's only unconfirmed destructive tap outside Settings. **The recipe list gained a filter field** above eight recipes, filtering already-rendered rows via `hidden` directly from the input's own handler rather than a full re-render, so a keystroke never drops the cursor. **The export freshness line is back** on the Export row itself ("Never exported." / "Exported 3 days ago.") — pass 40 had removed it as a stray paragraph breaking that row's spacing, not because the fact was wrong to show; no staleness flag and no nudge to export again, since either reads as the guilt mechanic the never-nag principle rules out. And **the day-total bar is narrower** — `max-width: 12rem` (reusing the width `.today-actions` already settled on for its trigger buttons) and `align-self: flex-start`, rather than full-bleed under the card: at the card's full width it read as a hard rule splitting it in two, dead centre under the kcal figure, rather than a small accent belonging to that number. `sw.js` `CACHE_NAME` → `rise-v32`.
- **pass 41c — the animation-replay fix, and closing 41b:** The riskiest item on the pre-launch review, because it touches the shared full-rebuild render model every screen here relies on. `.rotation` / `.set-panel` / `.set-confirm` all carry the `accordion-drop` keyframe to announce themselves as newly open, but every screen rebuilds its whole subtree with `replaceChildren()` on each render — so an already-open panel is destroyed and recreated, and replays its own "just opened" drop, on every unrelated re-render (ticking one block replayed every other open picker's animation). Fixed with a new `justOpened(key, isOpen)` in `ui/dom.js`: a module-level `Set` of keys tracks what was open on the *previous* render, and the function returns true only the render `isOpen` first turns truthy for that key. Callers add an `is-entering` class only then, and `accordion-drop` now only fires behind that class. It has to be called every render, unconditionally, from a function that always runs regardless of `isOpen` — a picker that stops being called would leave its "was open" bookkeeping stale — and per-instance keys (`today.picker.${block.id}`) keep multiple pickers independent so switching from one straight to another still counts as opening. Wired into nine call sites: the rotation picker and add-a-block panel and recipe-delete confirm on Today, and the undo row, paste panel, import panel, import-error panel, update panel and reset confirm on Settings. `weight.js` was explicitly scoped out — it never carried `renderPreservingFocus` or `announce` either, and pass 41b never confirmed it should. Alongside the same render model, a dead `.block-row` / `.block-row__tick` background/border-color transition was removed rather than faked: full-rebuild means a ticked row is a freshly inserted node with its final colour already set, so the transition had nothing to run from and never fired — the tick-acknowledgement redesign this actually wants is pass 45's job, once the render model can carry a transition across a change. **Closing 41b:** the appetite chips gained `role="group"` + `aria-label="Appetite"` on their container, matching Settings' `.seg` pattern, but were deliberately *not* converted to `role="radiogroup"`/`role="radio"` as first proposed — tapping the already-picked chip clears it via `day.setAppetite`, a state a native radio group can't represent once one option is checked, and the control uses independent Tab stops rather than a radio group's roving-tabindex arrow-key navigation. Settings' `.seg` controls were audited and already had correct `role="group"` / `aria-label` / `aria-pressed` semantics — no change needed there. Verified live in-browser: all four `is-entering` sites correctly animate on a genuine open and correctly suppress replay on an unrelated re-render; `announce()` still fires on a block tick; the appetite group and `.seg` semantics read correctly via the accessibility tree; checked at 390px and 1280px and in both light and dark theme. `sw.js` `CACHE_NAME` → `rise-v33`.
- **pass 45, step 1 — the framework call decided, and the build tooling scaffolded:** The owner's call: full adopt, React + Vite, so reactbits.dev components can be used close to as-authored rather than hand-ported — recorded with full reasoning in `roadmap.md` and a dedicated `docs/pass-45-plan.md` (dependency choices, migration order, how `justOpened()` and `renderPreservingFocus()` map onto React idioms). This entry is step 1 only: the build pipeline exists, nothing has been converted to JSX yet, and the app is still 100% the vanilla renderer it was before. The dev machine had no working Node.js at all — a stale `PATH` entry pointed at a nodejs folder with nothing in it — so `OpenJS.NodeJS.LTS` was installed via `winget` before anything else could happen. `npm`, `vite` and `@vitejs/plugin-react` landed as the first `package.json`/`package-lock.json` this repo has ever had. `manifest.json`, `sw.js` and `assets/` moved into a new `public/` (Vite's convention for build-output passthrough); `index.html`'s references to them became root-absolute (`/manifest.json`, `/assets/icon.svg`, `/sw.js`) since a relative path made Vite's HTML asset scanner try, and fail, to resolve them as source files instead of leaving them alone — `tokens.css`'s three `@font-face` `url()`s got the same fix. Both `npm run build` and `npm run dev` were verified: a clean production build (hashed JS/CSS, `public/` copied verbatim to `dist/`) and a dev server correctly serving both `index.html` and `/manifest.json`. The move broke the two native shells' raw-copy builds, which still expected those three paths at repo root — fixed by pointing Android's `copyWebAssets` Gradle task and `desktop/scripts/sync-desktop-assets.sh` at `public/` for those three, while both still copy `src/` raw rather than the Vite build output; that switch is deferred until a screen actually goes JSX and raw `src/` stops being directly servable. The roadmap's "resuming on another machine" note now says `npm run dev`, not `python -m http.server`, which doesn't understand `public/` and would 404 on all three moved paths. `sw.js`'s own content and `CACHE_NAME` are untouched — this step changed where three files live, not what any of them contain. Two more references to the old root-level paths were caught and fixed: `.github/workflows/android.yml` and `desktop.yml` both rasterise `assets/icon.svg` for their native launcher icons (now `public/assets/icon.svg`, in both the path trigger and the rasteriser command), and `tools/make-icons.py`'s output list wrote straight to `assets/*.png`. The most consequential catch: **GitHub Pages deploys `main` from the raw repo root with no build step**, so once this branch reaches `main` the live site would have started 404ing on `/manifest.json`, `/sw.js`, and every icon — `index.html` asks for them root-absolute, but Pages would only ever have served them at `/public/...`. A new `.github/workflows/pages.yml` builds via `npm run build` and deploys `dist/` through `actions/deploy-pages`, but it only takes effect once the repo's Pages source is switched from "Deploy from a branch" to "GitHub Actions" in Settings → Pages — **that switch has not been made yet and has to happen before `release-2` merges to `main`**, or the live site breaks the moment it does.
- **pass 45, step 2 — the shell goes React, and two deferrals came due early:** `src/js/app.js` is gone; `src/main.jsx` (entry point: theme, mount, persistence/update checks) and `src/App.jsx` (router + shell) replace it, with `index.html`'s script tag now loading `/src/main.jsx`. Every screen is still its original, unmodified vanilla `render()`/`repaint()` pair — `VanillaPane` mounts the four tabbed screens into a plain `<div>`, `VanillaFullScreen` does the same for welcome/intro behind a `display: contents` wrapper (so an extra DOM node doesn't disturb `.app-shell`'s flex-column sizing of its direct children). `computeView()` is a direct port of `route()`'s branching; React's own key-by-screen-id reconciliation stands in for the old `mounted` Map's "move, don't re-render," and a pane's mount effect is now where the entry crossfade fires. `core/broadcast.js` needed no change at all — its `subscribe()` already supported many independent listeners, so each pane and the nav glance subscribe on their own instead of one central dispatch loop repainting everything. Verified with a clean `npm run build` and a `npm run dev` + `Invoke-WebRequest` smoke check, not the preview MCP, per standing instruction for this build. Two things the plan doc had marked deferred turned out not to survive contact with a JSX shell: a WebView/Tauri webview can't parse JSX unbundled, so raw-copying `src/` — which both native shells still did after step 1 — stopped being viable the moment the shell itself went JSX, not just a future screen. Android's `copyWebAssets` and `desktop/scripts/sync-desktop-assets.sh` now run `npm run build` themselves and copy `dist/`; both CI workflows gained a Node setup + `npm ci` step ahead of the native build. And `sw.js`'s hand-maintained `PRECACHE_URLS` could no longer name the JS/CSS bundle — Vite hashes those filenames per build — so it now precaches only the small set of static, unhashed `public/` files and leans on the existing fetch-and-cache-as-requested handler (unchanged) to pick up the hashed bundle and any lazy-loaded screen chunk the first time each is actually needed. `sw.js` `CACHE_NAME` → `rise-v34`.
- **pass 45, step 3 — Settings converts to React, the first screen:** `src/js/settings.js` is gone; `src/Settings.jsx` replaces it and `App.jsx`'s `SCREENS` array now carries a `Component` field for converted screens (still-vanilla screens keep `open`/`repaint` for the `VanillaPane` adapter, which got simpler now that it only serves three screens). Conversion recipe, reusable for what's left: module-level `let`s → `useState`; DOM refs (`querySelector`, the persisted file-input node) → `useRef`; the vanilla `render()`'s trailing `publish(screenId)` → a no-dependency-array `useEffect` that runs after every render; the router's old "repaint if a sibling published and I didn't" → a local `subscribe()`-based counter that forces a re-render; the entry crossfade → a mount-only (`[]`) effect on the pane ref; storage-derived values not worth lifting into state (`loadProfile()`, snapshot info, update status) are just recomputed at the top of the render function every time. `ui/dom.js`'s `justOpened()` is reused unmodified — safe to call mid-render because `main.jsx` doesn't mount under `StrictMode`, so there's no double-invoke to corrupt its one-shot "was open" bookkeeping. Caught and fixed a real bug in the already-shipped `App.jsx` while doing this: `icon()` (`ui/icons.js`) returns a detached DOM `Node`, not a valid React child, so `{icon(screen.icon)}` in `Tabbar`/`NavGlance` was broken at runtime despite a clean build and a passing smoke check — neither executes React rendering, so only code review caught it. Fixed by switching to `iconSvg()` (the string-returning sibling export) behind a shared `Icon` component using `dangerouslySetInnerHTML`, in two modes chosen per call site: a real classed `<span>` where the original markup had one (`tabbar__icon`, `group__label-icon`), or a `display:contents` span where the caller already renders its own sized wrapper (`set2-row__icon`, `set2-row__chev`, `set2-profile__avatar`) — checked against each wrapper's `svg` descendant-sizing CSS so no extra box breaks icon sizing. Verified with a clean `npm run build` and a `npm run dev` + `Invoke-WebRequest` smoke check against `/`, `/src/main.jsx`, and `/src/Settings.jsx`.
- **pass 45, step 4 — Weight converts to React, the second screen:** `src/js/weight.js` is gone; `src/Weight.jsx` takes its `SCREENS` slot. The wrinkle Settings didn't have: the entry card and history rows lean on two self-contained vanilla widgets, `dateCalendar()` and `weightInput()`, that build their own DOM and popover/focus state and hand back an imperative API (`.node`, `.onChange`, `.getKg()`, `.setInvalid()`) rather than being React components. Rewriting either wasn't worth it for this pass — they're small, correct, and used nowhere that would benefit from a React port — so they're rebuilt fresh on every render, matching the full-rebuild model the vanilla screen always used, and mounted into the tree with a new one-line `Imperative` adapter (a `display: contents` host whose no-dependency-array `useEffect` calls `replaceChildren()` with whatever node this render just built). The save button's invalid-entry path stays a direct DOM mutation on the freshly-mounted hint/field nodes, same as the vanilla version, rather than a `useState` round trip — it never called `render()` either. Everything else on the screen (stats, weekly review, the inline SVG trend chart, group labels) converted to plain JSX the same way Settings did. Verified with a clean `npm run build` and a `npm run dev` + `Invoke-WebRequest` smoke check against `/` and `/src/Weight.jsx`.
- **pass 45, step 5 — Plan converts to React, the third screen:** `src/js/plan-view.js` is gone; `src/Plan.jsx` takes its `SCREENS` slot. No stateful vanilla widgets to carry over here (unlike Weight) — just markup and one bit of local state, `openMeal` (which meal block's rotation options are expanded), so this was a straight JSX port with no adapter needed. One real simplification, not just a port: the vanilla screen wrapped every render in `renderPreservingFocus()`, because its full `replaceChildren()` rebuild would otherwise drop a keyboard user's focus to `<body>` on every grocery tick. React's own reconciler doesn't tear the tree down that way — an element that's still present next render keeps its DOM identity and its focus — so that wrapper and its `data-focus-key` attributes were dropped rather than ported; nothing replaces them because nothing needs to. Verified with a clean `npm run build` and a `npm run dev` + `Invoke-WebRequest` smoke check against `/` and `/src/Plan.jsx`.
- **pass 45, step 6 — Today converts to React, the fourth screen:** `src/js/today.js` (the biggest screen, 1,600 lines) is gone; `src/Today.jsx` takes its `SCREENS` slot. Same `renderPreservingFocus()` removal as Plan, but this file leaned on it far more heavily (it wrapped the entire render body). It also went further in three places, bypassing `render()` altogether via direct DOM mutation to dodge losing keystroke focus on a full rebuild: the recipe-book filter box toggled row visibility from its own `oninput` without ever calling `render()`; the recipe editor's name field and both quick-type ingredient/extra forms mutated captured variables and a save/add button's `.disabled` the same way. All three are now plain controlled inputs backed by `useState` — a controlled input's own DOM node persists across a React re-render, so there was nothing left to protect. Two more self-contained vanilla widgets joined `dateCalendar()` (reused a second time, for the 7-day adherence strip's older-day popover) behind the `Imperative` adapter: `listbox()`, the `FOOD_DB` picker shared by the extras "Foods" tab and the recipe editor's add-ingredient form. A second instance of the `icon()`-as-React-child bug turned up in `emptyState()` (`ui/dom.js`) — it also builds and returns a real DOM `Node` under the hood, so the recipe book's empty state is a small local `EmptyState` component instead of that import. Two near-duplicate pairs the vanilla file had accumulated — `extrasTypeForm`/`recipeAddTypeForm` and `extrasPickForm`/`recipeAddPickForm` — collapsed into one shared `TypeForm` and one shared `PickForm`, parameterised by label text, button style/label, and the `onAdd` callback's differing side effects. Every `justOpened()` call site kept its original gating exactly: `"today.addOpen"` only fires when there's an add-on left to offer, `"today.recipeDelete"` only fires inside the (already-gated) recipe editor, and `` `today.picker.${block.id}` `` fires for every block row on every render regardless of whether that block has a rotation, per the original's own comment that a closed block's key must keep clearing reliably. Verified with a clean `npm run build` (52 modules) and a `npm run dev` + `Invoke-WebRequest` smoke check against `/` and `/src/Today.jsx`.
- **pass 45, step 7 — Welcome and Intro convert to React; the migration is done:** `src/js/welcome.js` and `src/js/intro.js` are gone; `src/Welcome.jsx` and `src/Intro.jsx` replace them, and `App.jsx` no longer has a vanilla-screen adapter at all (`VanillaPane`/`VanillaFullScreen` and every `render()`/`repaint()` import are gone — every screen is now a plain `Component` in `SCREENS`, or one of these two, rendered directly). Intro is a straight port: a hold timer and a click both call one `finish()`, guarded by a ref so it can't fire twice, that sets an `exiting` class and defers `onDone` by the fade duration (or calls it immediately under `prefers-reduced-motion`). Welcome doesn't fit the "rebuild everything from state" model the other screens use, because the vanilla version never needed one — it only validated on submit, not on every keystroke, and its four compound rows (birth date, height, weight, start date) already managed their own internal state and DOM mutation. Those four row builders ported unchanged and are mounted once (not rebuilt every render, unlike Weight's/Today's `Imperative` widgets) via a new `MountOnce` adapter; the two plain fields (name, target rate) are ordinary uncontrolled inputs read by ref at submit time, exactly as they read `.value` before. Two view states, "form" and "done", replace `renderForm()`/`renderDone()`. One thing preserved deliberately rather than simplified: the vanilla router lazy-loaded `welcome.js`/`intro.js` so a returning user with a complete profile never paid for that code — `App.jsx` now does the same with `React.lazy()` + `Suspense`, confirmed in the production build (separate `Welcome-*.js` / `Intro-*.js` chunks, main bundle unchanged in size). Verified with a clean `npm run build` and a `npm run dev` + `Invoke-WebRequest` smoke check against `/`, `/src/Welcome.jsx`, and `/src/Intro.jsx`. This closes the screen migration (`docs/pass-45-plan.md`'s migration order) — every screen in the app is React, no vanilla `render()`/`repaint()` screen module remains.
- **pass 45, step 8 — the hero kcal figure gets its count-up, closing out pass 45:** `docs/pass-45-plan.md` called for this landing "when Today converts" (step 6, above) and it was missed at the time — caught on review before pass 46 started. `motion` is now a real dependency; reactbits.dev's `CountUp` (JavaScript + CSS variant) is copied in unmodified at `src/components/reactbits/CountUp.jsx`, per the migration plan's "copy-paste, not an npm package" convention. `TotalCard`'s hero figure in `Today.jsx` renders `<CountUp to={totals.kcal} duration={0.8} separator="," className="daytotal__kcal ...">` in place of a plain formatted span — it animates up from zero on first mount, and because its target prop is read fresh from `dayTotals(day)` on every render, it re-animates smoothly from whatever it's currently showing whenever the total changes (ticking a block, logging food), rather than just snapping to the new number. Verified with a clean `npm run build` (motion pulled in ~400 modules; main bundle grew about 26 KB / 10 KB gzip, the first real animation dependency in the app) and a `npm run dev` + `Invoke-WebRequest` smoke check against `/`, `/src/Today.jsx`, and `/src/components/reactbits/CountUp.jsx`. Pass 45 is fully closed; phase 7 moves on to pass 46 (motion polish).
- **pass 47 — the interactive desktop side nav, built ahead of pass 46:** *(feature request)* The static 240px side nav from pass 35 can now collapse to a `--panel-nav-width-collapsed` (72px) icon-only rail and expand back over the content on hover or keyboard focus, via a new `profile.navPref` ("visible" | "hover", default "visible" — today's unchanged behaviour) set from a new "Pinned" / "On hover" toggle at the bottom of the nav column. Gated behind `@media (min-width: 1024px) and (hover: hover) and (pointer: fine)` in full — not just the hover-expand part — because a touch-capable device at desktop width has no hover state to trigger the expand with; such a device (and the phone) never even sees the toggle and keeps the plain always-visible column regardless of the stored pref. The rail's width snaps instantly between the two figures with no `transition: width`, since animating width forces a layout pass every frame even on a `position: fixed` element that visually overlaps nothing; the "sliding open" feel is entirely a `transform`/`opacity` fade-in on the content a bare icon can't carry (the wordmark, each button's label, the glance card, the toggle itself), which never itself needs to move because the collapsed and expanded states reserve the exact same vertical footprint for every row. `:focus-within` triggers the same expansion as `:hover`, so tabbing into a collapsed rail opens it rather than trapping a keyboard user behind icons with no visible labels. `navPref` lives on the profile beside `themePref` with no backup/restore changes needed — the existing export/import already round-trips the whole profile object. Verified with a clean `npm run build` and a `npm run dev` + `Invoke-WebRequest` smoke check, not the preview MCP; the hover/focus interaction itself has not been eyeballed live (no visual verification tool available in this workflow), so the CSS was reasoned through carefully but is worth a manual look on an actual pointer+keyboard desktop session before calling it done.

  **Follow-up fix (same day, browser-driven pass):** a real bug turned up on
  live testing — `.tabbar:hover .tabbar--icons .tabbar__btn` (and its
  `:focus-within` twin) used a descendant combinator between `.tabbar` and
  `.tabbar--icons`, but the markup carries both classes on the same `<nav>`
  element (`class="tabbar tabbar--icons"`), so the selector required
  `.tabbar--icons` to be a *child* of `.tabbar` and never matched anything.
  The practical effect: on hover/focus-within the icon buttons would never
  get their `justify-content: flex-start` + padding restored, so the newly
  revealed labels would sit centered under a still-centered icon instead of
  lining up beside it. Fixed by compounding the classes on one selector —
  `.tabbar.tabbar--icons:hover .tabbar__btn` — confirmed against the live
  DOM and a fresh `npm run build`. The rest of the pass (rail collapse
  width, the pin toggle's persistence, and the phone/touch gate) was
  exercised through the browser tool and held up as designed; CSS
  transitions could not be observed animating live in that tool (frames
  don't appear to advance in it), but the discrete, non-transitioned `width`
  snap it does drive confirmed the collapse/expand state logic itself is
  correct.
- **three loose CountUp/render fixes, caught before pass 46 started:** Found in review of pass 45 step 8's hero kcal count-up. `CountUp` was reconstructing an `Intl.NumberFormat` on every spring tick instead of once, and the hero duration was cut twice (0.8s → 0.45s → 0.25s) for feeling sluggish against how fast a block tick actually lands. Separately, the count-up was replaying on every remount of Today (a tab switch, not just a genuine kcal change) — fixed so it only plays on the page's first paint, matching what a "count up" reads as. The most consequential catch: an infinite render loop between `App.jsx`'s Shell and every screen's own dependency-less publish effect. Today/Weight/Plan/Settings each publish on every render with no dependency array (a straight port of the vanilla model), and Shell subscribes globally and bumps state on any publish, unconditionally; because Shell's bump re-rendered the whole pane subtree (the active screen wasn't memoized), that re-render re-fired the screen's own publish effect, which flowed straight back to Shell and bumped again. The vanilla `broadcast.js` this is ported from relied on a subscriber's reaction being synchronous — a sibling's `render()` call, straight down the same call stack — so its "a publish raised while the queue drains is dropped" guard could catch the bounce-back; a React state update is deferred to its own commit, landing after that guard has already reset, so the loop got through unchecked. Fixed by memoizing Shell's pane subtree on identity (`panes`/`onEditSetup`/`onReset` are all stable across a bump-only re-render), so React bails out of reconciling it entirely on a bump — which only ever needed to repaint the nav glance, not the active screen.
- **pass 46 — motion polish:** Scoped to two concrete gaps rather than a
  broad invented pass, both flagged by name in earlier entries rather than
  picked fresh here. **The tick acknowledgement pass 41c explicitly
  deferred:** `.block-row__tick`'s background/border-color transition was
  dropped under the vanilla renderer because a ticked row was a freshly
  inserted node with its final colour already set — nothing to transition
  from. Today's React conversion (pass 45) changed that: the row keeps its
  DOM identity across a tap (stable `key={block.id}`), so the same
  `--transition-control` treatment every other interactive control already
  carries now actually fires, and the grocery checklist on Plan gets it for
  free since it reuses the same `.block-row__tick` class on rows keyed by
  `item.name`. **The day-total progress bar** (`.daytotal__bar-fill`, pass
  42) gained a `width`/`background-color` transition for the same reason —
  same node every render, width changes as `dayTotals()` changes — so the
  bar now grows into place on a tick or a logged extra instead of jumping.
  Both ride the existing blanket `prefers-reduced-motion` rule in
  `tokens.css` with no extra opt-out needed. Verified with a clean
  `npm run build`.
- **pass 47 fix — the collapsed rail's icons were being squeezed to nothing,
  and it gained a brand mark:** Reported against the "On hover" nav at rest:
  the rail rendered as an empty pill and a stray sliver rather than four
  icons. The cause was worse than clipping. A collapsed row's content box is
  47px, but the label was only ever set to `opacity: 0` — which still
  reserves its full 41px of layout width, plus the row's 12px gap, for 53px
  of demand in a 47px box. The icon span is `flex: 0 1 auto` and the label
  text won't shrink below its min-content width, so the icon absorbed the
  entire overflow and computed to **0px wide**; `justify-content: center`
  then centred *icon + gap + label* as one group, pushing what little was
  left past the rail's own `overflow: hidden`. Fixed by taking the label out
  of the flow when collapsed (`max-width: 0; overflow: hidden`) and zeroing
  the row's gap, so the icon is the only flex item and centres on its own —
  both untransitioned, snapping with the rail width exactly as the discrete
  state change it belongs to, leaving the opacity/transform fade to do the
  visible work as before. Measured live: icon 0px → 20px, centred at x=37 in
  a 72px rail. The **wordmark gained a collapsed face** in the same pass,
  since an empty 72px strip above the icons read as a broken header: the
  brand button now carries a `tabbar__brand-mark` ("R", `aria-hidden` so the
  accessible name stays "Rise") beside the full `tabbar__brand-word`, which
  is clipped out of flow exactly as a nav label is. The two crossfade rather
  than one leaving before the other arrives, which would blank the strip for
  a whole `--duration-base` mid-expand, and the collapsed brand takes the
  same 2px transparent `border-left` every nav button carries for its active
  coral edge — without it the mark sat 2px left of the icon column below it.
  One incidental find while verifying: a stale `rise-v35` service-worker
  cache was serving old assets against a changed app, which is the likeliest
  explanation for a "frozen" page reported earlier in the same session.
- **pass 22 — closing the genuine design-system gaps:** Three items the "Still open" queue flagged as truly missing, not merely undocumented. **Focus ring:** adopted the export's canvas-gap + coral double ring, replacing the 3px 15%-alpha coral wash — `--border-focus: var(--coral-500); --focus-ring: 0 0 0 2px var(--surface-canvas), 0 0 0 4px var(--border-focus)`. The dark-theme override was deleted outright rather than re-specified: `--surface-canvas` already flips per theme, so the one declaration resolves correctly in both, and every one of the 21 existing `:focus-visible` call sites in `app.css` picked up the new ring for free since they all read the token, never a literal. **Breakpoints:** the 5-token scale landed as reference-only constants (`--bp-compact` 360 · `--bp-medium` 600 · `--bp-expanded` 840 · `--bp-desktop` 1024 · `--bp-wide` 1440, plus `--gutter-*`, `--panel-nav-width`, `--panel-detail-width`, `--container-app`) — correctly not wired into media queries yet, since a custom property can't drive `@media`; that wiring is phase 4's job. **Form controls:** no code change. `design-system.md` documents the existing `.field` / `.seg` system as already coherent and defers checkbox/radio/toggle/slider until a feature actually needs one, on the standing rule that unused component CSS rots. Phase 4 is now unblocked.
- **pass 49 — the 2.0 release:** Version bumped to `2.0.0` in `appinfo.js`,
  `package.json`, `build.gradle.kts` (+ `versionCode` 4), `tauri.conf.json`,
  `Cargo.toml`, and `README.md`. `sw.js` `CACHE_NAME` → `rise-v35` for the
  pass-46 CSS changes; `PRECACHE_URLS` needed no audit beyond that — pass 45
  step 2 already stopped it naming hashed JS/CSS bundles, so it doesn't drift
  per-pass the way the roadmap's older phase entries once worried about.
  Pass 48 (splitting Recipes out of Plan) stays open, explicitly theoretical
  pending a nav-shape decision, and is deferred to 2.1 rather than blocking
  this release — phase 5's own note already marked phases 0–4 as a coherent,
  shippable cut line, and phases 5–7 (desktop layout, visual pass, the React
  migration, motion) round it out cleanly without it.

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