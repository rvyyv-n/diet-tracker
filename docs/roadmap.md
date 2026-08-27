# roadmap

where the build is, and what each remaining pass does. numbers for the plan
itself live in `plan-spec.md`; design tokens in `design-system.md`.

## done

**pass 1 — models and the first-run screen**

- `src/js/core/plan.js` — the plan as data: blocks, phases, rotations, shakes,
  the food table, the grocery list, and the adjustment-rule table. pure, with no
  storage or DOM.
- `src/js/core/day.js` — one day's intake: toggle blocks, choose rotations,
  derive kcal and protein, intake status (the weight-gain inversion — "well
  under" is the failure state), adherence. pure functions.
- `index.html` and `src/css/app.css` — the shell and the shared UI primitives
  (button, field, restyled native date input, unit toggle), taken from the
  design system.
- `src/js/welcome.js` — first-run profile screen. collects height (cm or
  ft/in), current weight, date of birth, target rate and start date, and stores
  them locally through `profile.js`. this is the only screen so far, and it is
  what `index.html` loads directly.

## next

**pass 2 — the daily checklist (the reason the app exists)**

- a screen listing the active blocks for the current phase; tap a block to mark
  it eaten
- running kcal and protein from completed blocks, with the status colour on the
  daily total: green at or over target, gold partial, red well under
- rotation picker for breakfast / lunch / dinner / shake that re-totals the day
- persist a day record through `storage.js` — needs a `day` record type; decide
  there whether that means a `SCHEMA_VERSION` bump and a migration
- routing: show the welcome screen while the profile is incomplete, otherwise
  the daily screen. likely a small `app.js` entry that replaces `welcome.js` as
  the script `index.html` loads
- backfill rule: yesterday stays editable for 24 h, then the day closes
  (`plan-spec.md`, "resolved behaviours")
- replace the native date input and the month / year selector dropdowns with
  custom components styled from the design system — the native ones look dated
  and clash with the rest of the UI

**pass 3 — weight and the adjustment engine**

- weekly weight entry, one number
- 4-week rolling average, weekly adherence %
- evaluate `ADJUSTMENT_RULES` from `plan.js` against the weight history and
  *suggest* a change, with its reasoning shown — never auto-apply

## later

- grocery checklist with a weekly reset
- one-off food entry from the `FOOD_DB` table for off-plan meals
- weight chart with a trend line, daily noise de-emphasised
- appetite / fullness note per day (`day.js` already carries the field)
- daily meal reminders — local notifications at the best time to eat each
  block. confirmed for the late stages of the build
- first-run intro splash with a fade — deferred on purpose until there is an app
  to introduce

## resuming on another machine

`git clone`, then serve the folder over http (`python -m http.server`, or any
static server) and open it. `file://` breaks ES-module imports. there are no
dependencies and no build step.

`CLAUDE.md` and the source `.docx` / `.xlsx` are gitignored and will not be in a
fresh clone. copy `CLAUDE.md` across by hand for the full brief; otherwise this
file, `plan-spec.md` and `design-system.md` together are enough to run pass 2.
