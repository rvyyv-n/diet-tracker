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

**pass 2 — the daily checklist (the reason the app exists)**

- `src/js/today.js` — the blocks active for the day's phase, in time-of-day
  order; tap a row to mark it eaten. B2 (the shake) carries a coral edge because
  it is the highest skip risk (`plan-spec.md`).
- running kcal and protein from completed blocks, the intake-status colour on
  the total, and a "N kcal to go · M blocks left" line
- inline rotation picker per block (breakfast / lunch / dinner / shake) that
  re-totals the day
- `src/js/core/days.js` — day records in one `wgt:days` map through
  `storage.js`. No `SCHEMA_VERSION` bump: a brand-new record type needs no
  migration, and `loadProfile()` now merges over the defaults so added profile
  fields (`currentPhaseId`) don't need one either.
- `src/js/core/dates.js` — local-time date helpers. `Date.toISOString()` is UTC
  and would file an evening entry under the wrong day.
- `src/js/app.js` — routing: the welcome screen until the profile is complete,
  then the daily screen. Also advances the plan phase with the weeks (1 → 2,
  never 3). `index.html` loads this now instead of `welcome.js`; `welcome.js`
  became `renderWelcome(mount, { onComplete })` and is imported on demand.
- backfill: yesterday stays editable through the whole of the next day, then
  closes; a quiet prompt shows if it was left part-done

## next

**pass 2b — date components and checklist polish**

- replace the native date input and the month / year selector dropdowns with
  custom components styled from the design system — the native ones look dated
  and clash with the rest of the UI
- rotation picker cleanup: inset the options as a distinct panel, a radio-style
  selected state (not just bold), tighter type on wrapping descriptions
- simplify the phase banner to `<phase name> · Week N of M` — phase name over
  number, and drop the kcal target (already shown on the total card). Phase 1
  "Ramp-up · Week 1 of 2", phase 2 "Working target · Week 3", phase 3 "Pushed".
- capitalisation pass: the banner line, and tidy the dish / rotation
  descriptions in `plan.js` (they are verbatim plan text and read scruffy)
- bump the "Today" heading one step (28 → 36 px) — trial, easy to revert
- `day.extras` reserved in `newDay()` in pass 2a; the UI for it is a v2 item

**pass 3 — weight and the adjustment engine**

- weekly weight entry, one number
- 4-week rolling average, weekly adherence %
- evaluate `ADJUSTMENT_RULES` from `plan.js` against the weight history and
  *suggest* a change, with its reasoning shown — never auto-apply
- the bottom tab bar lands here — this is the first pass with a second
  destination (Today | Weight). one tab earlier would be scaffolding nothing.
- the phase-banner gains a slot for the engine's suggestion

## later

- grocery checklist with a weekly reset
- weight chart with a trend line, daily noise de-emphasised
- appetite / fullness note per day (`day.js` already carries the field)
- daily meal reminders — local notifications at the best time to eat each
  block. confirmed for the late stages of the build
- first-run intro splash with a fade — deferred on purpose until there is an app
  to introduce

## v2 — post-MVP

- **custom recipes / off-plan food entries.** add a food that isn't in the plan
  (quick-type name + kcal + protein, or build it from the `FOOD_DB` table); it
  shows under the checklist and the day's totals adjust to include it. entries
  can be saved as named recipes — a reusable recipe book with history — so a
  repeat meal is one tap. this is what `day.extras` was reserved for.
- **configurable overview metrics.** add / remove / hide the readouts on the
  daily total — the protein line toggled off, other metrics added.

## resuming on another machine

`git clone`, then serve the folder over http (`python -m http.server`, or any
static server) and open it. `file://` breaks ES-module imports. there are no
dependencies and no build step.

`CLAUDE.md` and the source `.docx` / `.xlsx` are gitignored and will not be in a
fresh clone. copy `CLAUDE.md` across by hand for the full brief; otherwise this
file, `plan-spec.md` and `design-system.md` together are enough to run the next
pass.
