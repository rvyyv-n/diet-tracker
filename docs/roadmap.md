# roadmap.md

What's still unbuilt. Shipped history in brief is `docs/CHANGELOG.md`; the
pass-by-pass detail through pass 17 is `docs/roadmap-history.md`.

## Architectural Decisions & Constraints

Settled with the user and shipped — standing constraints on future work, not
open questions. The one-line `why` is what keeps each closed; full reasoning is
in `docs/roadmap-history.md`.

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
never_invent_a_token:
  decision: "anything the design export marks PROPOSED needs sign-off before it is load-bearing (export SATISFIED 2026-09-03)"
  why: "building against assumed values is how the app drifts from the system — design-system.md already forbids it"
animations_last:
  decision: "motion polish and component-framework adoption come after every feature phase"
  why: "effects applied to surfaces that aren't final have to be ported twice"
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
  here shipped in phase 3, pass 31.)
- **A contextual "you're short and it's late — add a shake" nudge** — follows
  plan-spec.md's own appetite tactic, but held as the closest thing to a nag on
  the list.
- **A second desktop pane** — one pane stays the layout at every width. The
  pass-33 multi-pane routing (`setPanes()`, `core/broadcast.js`) stays in place
  unused rather than being ripped out.
- **Online food lookup** (`src/js/data/food-source.js`) — a 20-entry local
  `FOOD_DB` plus user recipes covers the feature, and `tokens.css` requires the
  app work with no network. Revisit only if it's actually wanted.
- **Recipe photos** — images don't fit localStorage's ~5MB budget, so a real
  version means IndexedDB as a second storage path: new migration surface, a
  rewritten backup format, and an export that stops being human-readable JSON.

## later
- [ ] **Verify the in-app update check** picks up `v1.6.0` — on a v1.5.x
  install, that Settings → Check for updates now offers 1.6.0 and links the
  right asset. One-off, do it when a device is in hand.
- [ ] **Android PWA verification** — the browser-installed path (install /
  standalone / persistence) on a real Android device, from the Pages URL.
  Non-blocking, carried since v1.0.0; do it when a device is in hand.
- [ ] Daily meal reminders (local notifications at the best time to eat each block).

## v2 — shipped

All four confirmed features shipped: off-plan food and recipes, the grocery
checklist, configurable overview metrics, and the desktop layout. Pass-by-pass
detail is in `CHANGELOG.md`.

- **phase 0 — design system** ✅ passes 21–22
- **phase 1 — off-plan food and recipes** ✅ passes 23–27 (`SCHEMA_VERSION` → 2)
- **phase 2 — recipe book, expanded** ✅ passes 28–29 (`SCHEMA_VERSION` → 3)
- **phase 3 — grocery checklist with weekly reset** ✅ passes 30–31; added the Plan tab
- **phase 4 — configurable overview metrics** ✅ pass 32
- **phase 5 — the desktop layout** ✅ passes 33, 35 — side nav above 1024px, one main pane at every width
- **phase 6 — the visual pass** ✅ passes 41–44 — empty states, day-total bar, real PNG icons, theme-aware favicon
- **phase 7 — motion + the framework question** ✅ pass 45 (React + Vite migration), pass 46 (tick + progress-bar motion); pass 48 below is still open
- **phase 8 — the 2.0 release** ✅ pass 49; **v2.0.0 shipped 2026-09-08**, Pages moved to GitHub Actions
- **phase 9 — v2.1** ✅ passes 50–51; **v2.1.0 shipped** — hover-rail easing, recipe book promoted to its own Recipes screen

### open — pass 48: split the rest of Plan's reference out

*(theoretical — do not build without a decision)* The Plan tab currently carries
three unrelated things: the weekly grocery checklist, the phase target ladder,
and a full reference sheet (meals, rotations, and a twenty-row food table). The
part you open daily — the groceries — sits above a wall of reference you read
once a month.

The proposal: **Plan** keeps what changes week to week (groceries, target
ladder). The reference sheet, meal rotations, and food table move to the
**Recipes** screen (pass 51), already the home of the recipe book.

Still to settle before it's built:

- **Where the Recipes screen lives on a phone.** Pass 51 gave it a desktop-rail
  item only; the phone reaches it through Today. Moving once-a-month reference
  onto it leaves the phone with reference buried two screens deep — either
  that's acceptable, or the phone bar has to change shape.
- **Where the food table belongs.** It's reference for logging an off-plan
  extra, so it arguably follows the recipe book rather than the plan.
- **Whether the Plan tab still earns a tab** once it's groceries plus three
  rungs of a ladder. It might be a card on Today instead.

Sequenced last on purpose: it moves whole screens between tabs, so doing it
before the visual passes would mean redoing their polish on new surfaces.

## resuming on another machine
`git clone`, then `npm install` and `npm run dev` (pass 45 added Vite — it
understands the `public/` convention that `manifest.json`, `sw.js` and
`assets/` now live under, which a plain `python -m http.server` does not:
that would 404 on all three). `file://` breaks ES-module imports regardless of
server. `npm run build` produces the real deployable output in `dist/`.
Ensure `CLAUDE.md` is manually copied to the root, as it is gitignored.
