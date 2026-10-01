# CHANGELOG.md

where the build is, and what each completed pass did. numbers for the plan itself live in `plan-spec.md`; design tokens in `design-system.md`.

## v3.0 - in progress

Built on `release-3.0` in build passes; the design handoff is the spec.

- **pass 63 — the v3.0 token layer, fonts and service worker:** `tokens.css`
  is now the handoff's foundation, Paper, Reel and screen layers, with a small
  app layer for composite type and layout. Every v2 token name in `app.css`
  maps to its semantic replacement (old-to-new table in `design-system.md`),
  the accent is `#E0673F` with `--accent-text` for coral text, and the
  protein teal is gone. Fraunces, Atkinson Next, Newsreader and Barlow Semi
  Condensed are vendored and precached; Inter and the old Newsreader are
  dropped, `CACHE_NAME` is `rise-v40`. Paper light renders; Reel and "System"
  dark wait for the Look plumbing (pass 64). New tokens: `--accent-tint`,
  `--space-96`, `--text-eyebrow` and the composite `--text-*` shorthands.

- **pass 64 — Look and theme plumbing:** the profile gains `lookPref`
  ("paper" | "reel", default paper) beside `themePref`, and both survive a
  reload and an export/import. `theme.js` writes `data-look` and
  `data-theme` and resolves "System" in JS, so the stylesheet has no
  `prefers-color-scheme` block; `setLookPref` is ready for the Settings
  picker. `index.html` sets both attributes and one `<meta name="theme-color">`
  before first paint, and the status-bar colour follows the Look. A pinned or
  system Dark now works in either Look; Reel renders with its own fonts and
  tokens, but no screen is restyled for it yet. Unit tests cover the
  resolution, the profile default and the backup round trip.

- **pass 65 — the shared component set:** the handoff's 31 components plus
  its icon set are ported into `src/components/` (`core.jsx`, `tracking.jsx`,
  `surfaces.jsx`) as `r-` classes in `app.css`, reading semantic tokens only.
  One state model covers them all: hover (fine pointers only) lays a wash one
  step below the press wash, press scales to .97, `:focus-visible` adds the
  focus ring beside the control's own ring, and the inferred states (Toggle
  off, Button disabled and pressed) are drawn. The listbox and calendar
  popover take the new look: TextField trigger, IconButton month nav, ink for
  the picked day. `dev/components.html` (dev server only) shows every
  component in all four Look and theme pairs. The app layer of `tokens.css`
  now re-reads on any nested `data-look`, which the Look picker needs. The
  screens are unchanged; they adopt the components from pass 67. New tokens:
  `--hover-wash`, `--press-wash`, `--chart-sky-top`, `--chart-sky-bottom`,
  `--radius-sheet`.

- **pass 66 — the navigation and layout frame:** the tab bar is replaced by
  the handoff's two navs (`src/components/nav.jsx`). On a phone, a floating
  64px pill sits 12px in from the edges over a fade into the canvas, with the
  sun on the active tab, and keeps to the centred column from 600px. From
  1024px, a 256px side nav shows the wordmark (now a shared `Wordmark`), all
  five destinations and a Today glance card in its foot: intake against
  target with its status word, and the latest weigh-in. The content column
  is 1080px padded 48px, and `.r-columns` sets up the 340px support column
  that the screen passes use. On a phone, Plan stays lit while Recipes is
  open (`tabParent`). The on-hover rail (pass 47) carries over to the new
  nav unchanged. New tokens: `--panel-support-width`, `--nav-inset`,
  `--nav-lift`; `--panel-detail-width` is gone.

- **pass 67 — Today, phone and desktop:** Today is rebuilt on the tracking
  components. On a phone it runs edge to edge: the seven-day dot strip with
  Calendar, one banner at most ("Yesterday isn't finished" with Open, or
  "This day is closed."), the day total on its horizon, and the block list
  with the now marker and the due card. The due card is the latest unticked
  block whose time has come; earlier ones recede but stay tappable, and the
  most-skipped block carries its tag while it is still to come. On desktop
  the screen sits in `.r-columns`, with the week card, Log food / Add a
  block and Appetite in the support column, and rows gain their description
  and protein. Log food, Swap, Add a block and the Calendar are sheets in
  `LogFood.jsx`, 520px dialogs on desktop; Swap applies on Done, and a phase
  add-on is dropped for the day from its Swap sheet. A tick, a log or an add
  shows a toast with Undo. Logged food keeps the time it was logged (`at`)
  and sits among the blocks by it; the Custom tab can save to the recipe
  book, replacing the Save button on a logged row. The storage banner is a
  `Banner` whose Backup downloads the file (`ui/download.js`, shared with
  Settings). No new tokens.
- **pass 67 fix — add-ons and logged food:** an add-on with no Swap sheet
  (Pre-bed) now carries a Remove link while it is upcoming, so it can be
  dropped for the day like Snack; the toast offers Undo. Logged food
  records which Log food tab it came from (`from`); on desktop the row
  reads "off plan" beside the name and "Logged from Recipes" (or Foods, or
  "Typed in") under it, as in the design, and the time column drops its
  own "off plan" there. Food logged before this has no source and keeps
  "Logged food".

- **pass 68 — Weight, phone and desktop:** Weight is rebuilt on the
  tracking components. The latest weigh-in leads in the numeric face with
  its pace beside a dot and a word: green on pace, gold below or above it,
  grey before four weigh-ins; nothing on Weight is red. The chart runs its
  horizon full-bleed with HTML axis labels, the on-pace cone from the first
  weigh-in, the four-week average and the sun on it; desktop adds a legend.
  The stat row gives blocks eaten and kcal a day over the last four plan
  weeks (plus the gain so far on desktop). The engine's suggestion card
  moves here from Today and still changes the plan only on Apply. The
  next-weigh-in card opens the weigh-in sheet (a dialog on desktop) with the
  change since the last reading as it is typed; Save shows a toast with
  Undo. History rows edit in place, and an empty history has its empty
  state. The weekly review card and its notes are gone, as the design has
  no place for them; the most-skipped fact now tags the block on Today. On
  desktop the screen fills `.r-columns`. `useWide` is shared by Today and
  Weight. No new tokens.

- **pass 69 — Plan, phone and desktop:** Plan is rebuilt on the tracking
  components. It opens with the week and date, "Phase 2, Target" and the
  day's kcal and protein. Groceries are a `GroceryList`: aisle marks, the
  quantity on the right, and a quantity that differs from the Phase 2
  baseline in accent text (so a phase change is visible at a glance). Ticks
  key on aisle and name, so they carry over a phase change and still clear
  each Monday; the heading says how many are ticked and when the new list
  starts. Clear shows a toast with Undo (`restoreGroceryChecks`). Targets
  are a `PhaseLadder` with a status word on every rung (Now, Done, If
  stalled, or Week 3) and a one-line note; a row at the foot opens Recipes.
  On desktop the screen fills `.r-columns`: groceries with the aisles in two
  columns, the ladder and the Recipes link in the support column. The old
  grocery, ladder and Plan group styles are gone. `scaleGroceryQty` is
  unchanged. No new tokens.

- **pass 69 fix — Plan's two notices:** the profile gains `phaseChange`
  (`{ from, to, on }`), written when the calendar moves the phase. In that
  week Plan shows "Quantities went up with Phase N." and marks only the
  quantities the change moved in accent text; both end on the next Monday.
  On a Monday after a ticked week a second notice says the ticks cleared
  themselves (`ticksJustReset`, derived, nothing stored). `Banner` gains an
  `info` kind: outlined, an info icon, no action. No new tokens.

- **pass 70 — Settings and the Look picker:** Settings is rebuilt on the
  surface components. It opens with the record counts, the title and the
  profile card (an initial, the name, phase · height · rate). Appearance
  holds the Look picker: two tiles, Paper and Reel, each a live preview drawn
  with its own nested `data-look` and the current theme, then Theme as a
  segmented control. Picking either saves on the profile and re-applies
  `data-look` and `data-theme` at once, so the whole app changes with the
  tap and keeps it across a reload. Overview is two Toggles (on is ink,
  never green), and Notifications are Toggles too, on web and in the Android
  and Windows shells. Data is a list of Export, Import, Check for updates
  and Reset rows; import (file or pasted JSON, then a preview), the undo
  copy, an available update and the reset confirm open in place under it,
  with the same copy and the same safeguards as before. Reset is one confirm
  that names what goes. On desktop the screen is two columns: Appearance on
  the left, the rest on the right. The v2 Settings styles and their entrance
  animation are gone. `e2e/visual.spec.js` now runs both Looks; Reel's
  pictures wait for the sweep. No new tokens.

- **pass 71 — Recipes, phone and desktop:** Recipes is rebuilt on the surface
  components. On a phone it has a Plan link on top (Plan stays lit while it
  is open). The book has a New recipe button, a filter and one row per
  recipe with Edit and Log; Log puts it on today and shows a toast. The book
  is ordered most logged first, and each row says "logged 9×" as a plain fact
  (recipes logged equally often keep most-recent first; Log food on Today
  still lists most recent first). An empty book has its empty state. The
  recipe editor is one body (name, "Built from", add from the food table or
  type a custom item, the running total beside Save) in a bottom sheet, or a
  520px dialog on desktop; Log food on Today shows the same body inline.
  Delete asks once more and has no Undo; days it was logged on keep their
  kcal. The meal options (a disclosure per block, with the share rail) and
  the food table moved here from Plan in pass 48 and are restyled: a name over
  its figures on a phone, aligned columns on desktop, which fills two
  columns (the book and the food table, then the meals). The v2 Plan
  reference, recipe editor, group and empty-state rules are gone, and so are
  the old `shared.jsx` helpers. New glyphs `clock` and `close`; no new tokens.

- **pass 72 — first run, intro and What's new:** first run is three steps
  with a "Step N of 3" header and a progress bar: the figures, an optional
  Look, then the summary. Step 2 shows a live preview of the Today card that
  changes as a Look is picked; the Look applies on Continue, and Skip keeps
  what is set (Paper on a fresh start). Editing the profile later is the
  form alone, with no steps. The intro sets the "Rıse" wordmark (the sun as
  the dot) over its line. The What's new card is now a 3.0 card (the Looks,
  the theme choice, the redrawn screens, where Recipes went) in the display
  type; it shows once, including on devices that dismissed the 2.0 card.
  The slower theatrical motion for these waits for `motion`. No new tokens.

- **pass 73 — app icon and logo:** the egg is replaced by a sun rising over
  a horizon: a half disc with the sun gradient, the line it rests on and a
  shorter line below, with a soft halo on the dark canvas tile. It reads at
  16px and at 512px. `icon.svg`, the tile-less `icon-dark.svg` favicon for
  dark tab strips and the Android `icon-mono.svg` are redrawn, and
  `tools/make-icons.py` regenerates the 192, 512, maskable and Apple touch
  PNGs from the same geometry. Android and Windows rasterise `icon.svg` in
  CI, so they pick it up unchanged. The manifest and the Android window use
  the Paper canvas (`#F7F1E8`). The in-app wordmark ("Rıse" with the sun as
  its dot) was already drawn by pass 65 and is unchanged. The service worker's
  `CACHE_NAME` is now `rise-<hash>`, filled in at build time from the built
  files (`vite.config.js`), so it is never bumped by hand and the release
  checklist loses a line. No new tokens.

- **visual baselines:** the approved pictures in `e2e/snapshots` were the v2
  screens, so `test:visual` failed on every screen. All 43 are retaken on
  the v3.0 screens, Paper and Reel, light and dark, phone, desktop and 320px,
  and the check is a live gate again.

- **pass 72 fix — first run on the new design frames:** the setup form is
  rebuilt on the v3.0 controls. New `StepHeader`, `Select`, `DateField` and
  `FieldGroup` in `core.jsx` (one header for Steps 1 to 3 and Settings'
  Edit profile). Step 1 has Name, Date of birth as three native selects,
  Height and Current weight with unit toggles that carry the figure (cm and
  ft/in; kg, lb and st), Target gain and a start-date field that opens the
  calendar sheet. Continue is never disabled: it puts an error in plain words
  under each field that needs one ("Enter a number, for example 58.5.") and
  focuses the first. On desktop it is a centred 640px two-column form with the
  wordmark at the top left. Step 3 is the summary card. The intro is the
  wordmark, a horizon line, one line of copy and a hero Get started; a tap
  anywhere continues, and it no longer moves on by itself. What's new sits
  between the date strip and the day total with a line and where it lives
  for each of four changes. The old imperative date dropdowns, the old
  summary list and their CSS are gone. The intro and What's new entrances are
  left to `motion`, with the timings recorded there. No new tokens.

- **pass 72 motion — intro and What’s new move:** built now, from the
  design’s timing tables, not left to the `motion` pass. The intro plays once
  (about 1.4 s): the horizon fades in, R, ı, s and e rise one by one, the sun
  comes up under the ı and settles into its dot on the spring curve, then the
  copy and Get started fade in. `Wordmark` has its letters and dot as separate
  elements for this. What’s new grows in once per load (about 1.1 s) with its
  rows fading up in turn, and on Got it presses, fades, lifts and collapses
  (260 ms) while the day total slides up; no toast and no Undo. All times are
  duration tokens, so reduced motion shows the last frame at once. No new
  tokens.
- **pass 74 — the cross-cutting sweep:** every screen, sheet, confirm and
  first-run step checked at 390, 320 and 1440 in both Looks, light and dark.
  Nothing clips at 320, and a short viewport now scrolls a sheet instead of
  squeezing it. Every sheet is a 520px dialog on desktop. Body text is 4.5:1
  or better: Reel light's muted ink and coral text are a shade darker, and
  the side nav labels read `--sidenav-ink`. Controls drawn under 44px get an
  invisible 44px hit area (`--target-min`), and inputs fill their 48px
  fields. Reduced motion leaves nothing animating. `literals.test.js` is at
  zero outside `theme.js`, and the visual baselines are re-approved. A follow-up
  covered first run, the toast and the closed and backfill days: Undo has
  `--toast-action-ink`, closed-day times read `--ink-muted`, and Undo and
  Skip reach 44px.

- **pass 75 — the README redesign:** a new README, after Bookcook's. A
  centred header with the icon, pitch, links and badges; a hero of the
  desktop and a phone together; then what it does, told screen by screen
  with framed phones beside the text, install, privacy, how it's built and
  development. A note says the pictures show v3.0 and the live app is still
  v2.3. The pictures are composed from `scripts/shot.mjs` shots at 2x; pass
  78 retakes them from the finished build. Rise has no website yet, so a
  `later` roadmap item redoes the README when it has one.

- **pass 77 — the on-hover rail:** the 72px rail keeps the v3.0 nav's parts
  (the sun, the icons, the active lozenge with its glow, and the word,
  labels, glance card and Pinned / On hover toggle that fade in on hover or
  keyboard focus) and now has a shadow on its right edge while open, so it
  reads as lying over the content. New token `--rail-open-shadow`, in light
  and dark. It opens on keyboard focus only, so a mouse click no longer
  holds it open. The look is the pinned nav in a narrow state, in both
  Looks; the handoff has no rail frame. Touch devices still get the pinned
  nav.

- **pass 76 — motion:** the design's motion table, checked against what was
  built. Most of it already ran (the 90 to 260ms interactions on
  `--ease-out`, the .97 press, sun travel at `--dur-slow`, the intro and
  What's new). This pass added the tick pop (the check scales in from .6 on
  `--ease-spring`, from a tap on the row or on the due card's Tick, so rows
  that open done stay still; the grocery list pops its ticks too). The
  rail's active pill now eases with the rail instead of snapping, and the
  day total's glow glides with the sun, with the bar on the same 520ms and moved
  the theme cross-fade to `--dur-slow` on `--ease-in-out`; `theme.js` now
  reads that token for when to drop the class. `motion.test.js` fails any
  transition or animation without a duration token, any own curve, any loop,
  a duration token reduced motion doesn't zero, and a theme fade that
  reduced motion leaves on.

- **pass 79 — hide foods from the food table:** each row of the food table on
  Recipes has a small delete mark. It hides the food, and a toast says where
  to restore it; nothing is deleted. The profile keeps the hidden ids
  (`hiddenFoods`, no schema bump), and `core/foods.js` filters the table and
  the Log food and recipe pickers. Settings, under Data, shows "Restore
  hidden foods" while any are hidden. Recipes and logged food that already
  used a hidden food keep their own copy. New icon: `x`.

- **pass 80 — Settings icons and group headings:** every Settings row has a
  36px soft tile with its icon (Export, Import, Updates, Reset, Restore,
  Protein, Remaining, the reminders), and the Reset tile is tinted with the
  danger colour. Each group heading has an icon too (Profile, Appearance,
  Overview, Notifications, Data). New tokens `--icon-tile` and
  `--danger-tint`; new icon `trash`. The export draws these rows as text
  only, so this is recorded in the departures table.

- **pass 81 — first run tidied:** Step 1's Height and Current weight each
  have one label, with the box (or the ft and in, st and lb pair) and the unit
  toggle on one row at the same height, so the labels no longer wrap and "11
  in" no longer runs into its unit. Step 2's preview drops the "Tick Shake"
  button, which looked tappable but did nothing. Step 3 is redrawn: the plan
  start date under the title, then a card with the phase Today opens on, its
  kcal and protein a day, then the details as a quieter list with an Edit
  link. Height reads "5 ft 10 in". On desktop the buttons on Steps 2 and 3 sit
  at the right, as on Step 1, and at 320px the Day select no longer clips.
  No new tokens.

- **pass 82 — spacing and rounded row washes:** Settings' list rows have
  12px above and below, so a two-line hint (Export data) no longer meets the
  card's edge, and the group has 4px more at the top and bottom. The hover
  and press wash on Settings rows and grocery items is a rounded tile that
  reaches 8px past the text, with the separator drawn inside it, as the
  meal rows were in pass 76. About is a section of its own after Data (in the
  right column on desktop) instead of floating under both columns. The Meals
  card on Recipes has room above its first row and below its last bar, and
  20px sides on desktop. The recipe book's intro line no longer tucks up
  under the New recipe button. New icon `info`; no new tokens.

- **pass 83 — Weight before the first weigh-in, and arrows in History:**
  with no weigh-ins, the chart draws a faint dashed rise with the sun on the
  horizon where the first weigh-in will land, under "Your first weigh-in
  starts the chart". The "—" in place of the weight is lowered to the line
  of its unit. Each week in History has a small up or down arrow in ink
  beside its change, and none when it rounds to zero; there is no colour, as
  one week is noise and the trend already carries the status. New icons
  `arrow-up` and `arrow-down`; no new tokens.

- **pass 84 — food table without wrapping:** on desktop the portion sits
  under the food's name in the smaller muted type, in place of an Amount
  column, so "150 g chicken" and the longer names stay on one line. Between
  1024 and 1279px, beside the pinned rail, Recipes is one column (the book,
  the meals, then the food table), as two columns there were about 316px
  each. No new tokens.

- **pass 85 — pre-release polish:** the day total's halo stays centred on
  the sun at any fill (pass 76 had held it in from the edge, so at full fill
  it sat off to the left); on desktop it is no longer clipped, and on a phone
  it clips at the screen's edge. Exactly on target now reads "At target", not
  "-0 over target". The meal rows on Recipes and the Remove and Swap links on
  Today have a rounded wash with room round the text. The side nav's active
  pill in Paper light has an even glow (new token `--sidenav-active-glow`).
  The wordmark's sun is centred on the letters, and its halo grows under the
  pointer. Number fields (Log food → Custom) have their own up and down
  arrows in place of the browser's spinner. New icon `chevron-up`.

- **pass 86 — Recipes: protein and the most logged in the accent:** each
  recipe's protein figure is in the accent text colour, and so is "logged
  N×" for the three most logged; the rest of the line stays muted. Green and
  gold are kept off, as they mean intake status. No new tokens.

- **pass 87 — fresh-install sweep:** with nothing eaten yet, the side nav's
  Today glance reads "Not started" in the neutral dot, as Today does, in
  place of a red "Low". The ghost chart's dashes keep their phone weight on
  the wider desktop chart. The storage line under Export data reads "Under 1
  KB of about 5 MB used." with its capital. No new tokens.

## Older releases

v2.3.0 and earlier are in `docs/changelog-archive.md`. Add new release sections above this heading.
