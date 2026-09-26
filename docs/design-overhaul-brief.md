# Rise 3.0 — Design Brief for Claude Design

> Paste or upload this whole file into a new Claude Design thread, with the
> Rise codebase attached and the new design system selected. It describes the
> product, the rules that are not design decisions, every screen, and what to
> hand back to engineering.

## 0. How to work through this brief

**You have full creative freedom over the visual design and the UI/UX.** Rise
has a design system today, and you can see it in the attached code
(`src/css/tokens.css`, `docs/design-system.md`). Treat it as history, not as a
constraint. Layout, navigation, typography, colour, components, density and
motion are all yours to rethink. The only fixed points are the **product rules
in section 4**. Those are about how the app behaves, not how it looks.

The design system selected for this thread was made for **Bookcook**, a
different app: a warm, editorial cookbook designed for an older reader. It is
a starting point I like, not a template. **Adapt it to Rise and don't copy
it.** Rise is a daily tracker built on numbers, ticks, a chart and a weekly
check-in, and it's opened several times a day for a few seconds at a time.
Keep whatever from Bookcook serves that (type, warmth, surfaces, component
feel), and change whatever doesn't. When the two disagree, Rise's use wins.

Work in this order, and ask me any questions you need before each stage:

1. **Directions:** show **3 distinct directions** for **Today** and
   **Weight** at phone size, light mode. One should be the Bookcook system
   adapted as directly as makes sense. The other two can move further away.
   I'll pick one, or ask for a mix.
2. **Design system:** turn the chosen direction into tokens (section 9) and
   the component sheet (section 7), with every state, light and dark.
3. **Hero screens:** the ★ screens in section 6, phone first, then desktop.
4. **Everything else**, then the stress tests: dark mode, empty states, the
   first-run flow, and a 320px-wide phone.

## 1. The product in one paragraph

**Rise** is a local-first diet planner and tracker for one person on a
structured **weight-gain** plan. The plan is decided in advance as a handful
of fixed meal **blocks** (Breakfast, Shake, Lunch, Dinner, plus optional
add-ons), each with a known kcal and protein figure. **The only daily action
is ticking the blocks you ate.** Nothing is weighed or itemised. Off-plan food
can be logged from a small food list or a personal recipe book. Once a week
there's a **weigh-in**. It feeds a four-week rolling trend, and an engine
**suggests** plan changes (add a block, move up a phase). It never applies
them on its own. There are no accounts and no server for diet data. Everything
lives on the device.

## 2. Who it's for

One person, the owner, who finds it hard to eat enough. Appetite is the
enemy, not willpower. They open Rise on a phone several times a day to tick a
block, often one-handed, and look at the Weight screen once a week. They also
run it as an installed desktop app on Windows. They like calm, well-made,
editorial software and dislike anything that feels like a fitness app
(streaks, badges, red warnings, cheerleading).

## 3. Platforms and sizes

| Frame | Size | Notes |
|---|---|---|
| Phone | **390 × 844** | Primary. PWA and an Android app (a thin native shell around the same web UI). |
| Small phone | 320 × 640 | Stress test only. Nothing may clip or overflow. |
| Desktop | **1440 × 900** | Windows app (Tauri shell around the same web UI). |

Today the phone has a bottom tab bar (Today · Plan · Weight · Settings) and
desktop has a collapsible left side nav with Recipes as a fifth destination.
Desktop is **one main pane at every width**. A second pane was considered and
rejected. You may redesign the navigation itself, as long as every screen in
section 6 stays reachable and the phone works one-handed.

## 4. Product rules (not up for redesign)

These come from decisions already made about how the app behaves. Please
design within them. If one seems to block a much better design, say so and
explain why, but don't quietly break it.

- **Never nag.** A missed block is a number, not a guilt trip. No streaks, no
  badges, no praise ("Great job!"), no "you're behind" copy, no red "overdue"
  states. Insight copy **states facts, never verdicts**.
- **Colour meaning is inverted from a diet app.** This is a gain plan, so
  *under*-eating is the failure: **green = at or above target, amber/gold =
  partial, red = well under**. Keep that mapping, and don't use green for
  anything else that sits next to intake (a green toggle would collide with
  it). The colours can change. The meaning can't.
- **Past days stay closed.** Today and yesterday are editable. Anything older
  can be viewed but never edited ("This day is closed."). Browsing back must
  never look like it reopens a day.
- **No header date stepper (‹ date ›) on Today.** This was tried and rejected.
  Past days are reached through a **7-day dot strip** (one dot per day,
  coloured by that day's intake status) and a **calendar popover**. You can
  restyle both freely.
- **The block due now is marked by emphasis only.** Earlier unticked blocks
  recede (weight, tone, type), never in red.
- **Suggestions are suggestions.** The engine's cards always offer
  **Apply** and **Not now**, and nothing changes the plan without a tap.
- **Offline first.** No web fonts from a CDN, no remote images, no icon fonts
  from a network. Every asset must be self-hostable (open-licence woff2, SVG).
- **Text-labelled actions.** Icon-only buttons need a visible label or an
  obvious meaning plus an accessible name. There are no swipe-only actions.
- **Not in scope, so don't design them:** a streak count, "mark all done",
  free-text day notes, CSV export, recipe photos (the storage budget can't
  hold images), online food lookup, a second desktop pane.

### What the current design learned (evidence, not rules)

These were tested on real devices. You're free to overturn them, but know why
they exist:

- **Tick rows are 56px tall.** The app is used one-handed, often mid-meal.
  Form controls are 40px and icon buttons 44px.
- **The phone tab bar was trimmed to 44px** after a taller one left a dead band
  on tall phones.
- **Hover exists only on devices that hover**, and is one step below the
  pressed state, never a new colour.
- **Body copy never drops below ~4.5:1 contrast.** The old accent failed that
  as text, so text-on-canvas uses a darker accent step.
- **Standalone hero numbers** (the day's kcal total) are set in the display
  face. Numbers in rows, tables and chart axes use the UI face with tabular
  figures.

## 5. Visual direction

Yours to set. My only asks:

- It should feel **calm, warm and considered**: closer to a well-made
  notebook or a quiet editorial app than to a fitness dashboard.
- **Numbers are the content.** Kcal, protein, kg and percentages should be
  beautiful, aligned (tabular figures) and readable at a glance.
- **Light and dark are equal citizens.** Dark mode is used at night, so it
  should be genuinely comfortable, not just inverted.
- **Motion:** short and meaningful, such as a satisfying tick, the day-total
  bar filling, a sheet rising. Everything must degrade cleanly under reduced
  motion. Engineering adds motion after layout, so describe it and don't
  depend on it.

## 6. Screens to design (priority order)

Use the sample content in section 8. Design **phone and desktop** unless noted,
in light mode, plus the listed states.

### ★1. Today (hero)
The screen opened five times a day. Top to bottom today:
- **Header:** screen title and the **7-day dot strip** with a calendar button
  (opens a month calendar popover). Viewing a past day shows its date and, if
  it's older than yesterday, "This day is closed."
- **Phase banner:** "Phase 2 — working target · week 6".
- **Day total card:** the hero kcal figure against its target (2,285 / 3,110
  kcal), a progress bar coloured by intake status, and two optional lines the
  user can hide in Settings: **protein** (113 / 150 g) and **remaining** ("825
  kcal · 3 blocks to go").
- **Suggestion card** (sometimes): an engine suggestion with Apply / Not now.
- **The checklist:** one row per block in time order, with time, name, kcal,
  protein and a one-line description. Tap to tick. Blocks with a
  **rotation** (breakfast, lunch, dinner, snack, second shake) have a swap
  control that opens the 3 options for that slot. Optional add-on blocks are
  tagged as such, and the Shake row is the most-skipped block and should be
  hard to overlook. An **"Add a block"** row adds an optional block for today.
- **Off-plan food:** "+ Log food" opens a panel with tabs **Recipes · Foods ·
  Custom**. Logged extras list below the checklist with kcal/protein and a
  remove action.
- **Appetite check:** three chips, **Stuffed · Fine · Hungry** (tap again to
  clear).
- **Backfill prompt** (sometimes): "Yesterday isn't finished" jumps to
  yesterday.
- **States:** morning (nothing ticked), mid-afternoon (the due-now block
  emphasised, earlier ones receded), all done, a closed past day, the Log food
  panel open, a rotation picker open, and a storage-full banner.

### ★2. Weight (hero)
Opened weekly. Today it has:
- **The weigh-in entry:** a date (calendar picker) and a weight in kg or lb,
  with Save and a transient "Saved".
- **Weekly review:** week number, latest weight, the 4-week average change
  (+0.28 kg/week), adherence (86% of planned blocks), average intake
  (2,960 kcal/day), and the engine's suggestion, if any.
- **Trend:** a chart of weekly weigh-ins with the rolling average line and the
  target band.
- **History:** recent entries, editable inline.
- **States:** first week (no trend yet), a stall (flat for 2 weeks, so a
  "move to phase 3" suggestion appears), dark mode.

### ★3. Plan
What changes week to week:
- **Groceries:** a checklist built from the plan, grouped sensibly, with
  quantities ("7.5 L full-fat milk", "24 eggs"), a count ("9 of 23 ticked"),
  and Clear. It resets weekly.
- **Targets:** the three-rung **phase ladder** (Ramp-up 2,565 kcal / Target
  3,110 / Pushed 3,690), with the active phase picked out.
- A link to **Recipes** (on the phone, this is how Recipes is reached).

### 4. Recipes
Reading matter and the recipe book:
- **The recipe book:** the user's own recipes (name, per-serving kcal/protein,
  ingredients). There's a filter, and create, edit, rename and delete. Tapping a
  recipe logs it for today.
- **The meals:** every block and its rotation options, for reference.
- **The food table:** the ~20 built-in foods with kcal/protein per unit.

### 5. Settings
Groups today: **Profile** (a card with the plan at a glance and "Edit
setup"), **Appearance** (Theme: System / Light / Dark), **Overview** (show or
hide the protein and remaining lines), **Notifications** (meal reminders, and
on desktop "Start with Windows" and "Keep in tray"), **Data** (Download JSON,
Import from file or paste, with Undo; "Exported 3 days ago", and storage used),
**About** (version, Check for updates, What's new), and **Reset all data**
(confirm, with Undo). The same states apply as elsewhere: toggles, a pending
update, an import error.

### 6. First run
- **Intro:** a short branded splash that can always be skipped.
- **Welcome:** a setup form for name, height, current weight, date of birth,
  target rate (kg/week), start date and units, then a "done" state.

### 7. Smaller surfaces
A **What's new** sheet after an update, the **calendar popover**, the
**listbox/select** used for units and pickers, **toasts with Undo**, the
**storage-full / write-failed banner**, and **empty states** (no recipes yet,
no weigh-ins yet).

## 7. Components to define

App shell (phone nav, desktop nav) · screen header · buttons (primary,
secondary, text, destructive; small and regular) · **block row** (idle,
ticked, due-now, receded, closed-day, add-on tag, swap control) · **day total
card** with its progress bar (low / partial / on-track) · dot strip ·
calendar popover · suggestion card · phase banner and phase ladder · chips and
segmented controls · toggle · text field, number/unit field, select/listbox ·
grocery checklist item · recipe row and editor · stat row · weight chart ·
sheet/panel · toast with Undo · banner · empty state · focus ring.

## 8. Sample content (use this, not lorem ipsum)

**Profile:** Sam · 24 · 178 cm · started 61.4 kg · now 63.0 kg · target
+0.3 kg/week · Phase 2, week 6.

**Blocks (Phase 2 = the first six; Shake 2 is the Phase 3 add-on):**

| Time | Block | kcal | Protein | Today's option |
|---|---|---|---|---|
| 08:00 | Breakfast | 705 | 34 g | Eggs (3) + flatbreads (2) + milk (250 ml) + butter |
| 11:00 | Shake | 580 | 22 g | Milk (300 ml) + peanut butter (2 tbsp) + banana + oats |
| 13:30 | Lunch | 580 | 33 g | Chicken curry (150 g) + rice (1 cup) |
| 16:00 | Snack · add-on | 290 | 11 g | Yogurt (200 g) + dates (3) + almonds (15 g) |
| 17:00 | Shake 2 · add-on | 580 | 22 g | Heavy shake, optional or post-training |
| 19:30 | Dinner | 700 | 37 g | Egg curry + lentil stew + flatbreads (2) |
| 22:00 | Pre-bed · add-on | 255 | 12 g | Milk (250 ml) + peanut butter (1 tbsp) |

**Rotation example (Lunch):** Chicken curry + rice · 580 kcal · 33 g /
Minced beef + flatbreads + salad · 630 kcal · 33 g / Chickpeas + flatbread +
yogurt · 565 kcal · 24 g.

**Mid-afternoon Today:** Breakfast, Shake and Lunch ticked, plus an off-plan
"Chicken wrap" (420 kcal · 24 g), for 2,285 / 3,110 kcal and 113 / 150 g
protein. Snack is due now.

**Weigh-ins (kg):** 61.4 · 61.7 · 62.1 · 62.2 · 62.2 · 62.6 · 63.0.

**Recipes:** Overnight oats (620 kcal · 24 g) · Chicken wrap (420 · 24) ·
Peanut butter banana toast (480 · 15).

**Groceries:** Full-fat milk 7.5 L · Eggs 24 · Bananas 7 · Peanut butter 1
jar · Oats 500 g · Chicken 1 kg · Basmati rice 1 kg · Yogurt 2 kg · Dates ·
Almonds · Wholemeal flour.

## 9. What to hand back to engineering

Rise is **React 19 + Vite with plain CSS** (no Tailwind, no component
library). Tokens live in one file of CSS custom properties
(`src/css/tokens.css`), and components are styled in `src/css/app.css`.

1. **Design tokens** as a single CSS file of custom properties, light in
   `:root` and dark under `:root[data-theme="dark"]`. **You choose the
   names.** Engineering will migrate the app to them. Please keep a clear
   two-layer shape: a base palette, then semantic aliases the components read
   (surfaces, text, borders, accent, focus ring, and the three intake states
   **on-track / partial / low**). Include the type scale, spacing, radii,
   elevation, and motion durations and easings.
2. **Fonts** with open licences, self-hostable as woff2.
3. **Component sheet** (section 7) with all states: hover, focus-visible,
   pressed, disabled, and each component's own states.
4. **Final screens** (★ first) at 390px and 1440px, light and dark, with the
   states listed in section 6.
5. **Short notes** on anything non-obvious: motion, how due-now emphasis
   works, how the chart reads, and what changed from the old navigation and
   why.

Export with **Send to Claude Code** (the handoff bundle), and also download
the zip as a backup.
