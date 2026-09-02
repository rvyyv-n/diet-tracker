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
  the reference sheet overlaps the v2 grocery checklist and should be designed
  with it.
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
- [ ] Grocery checklist with a weekly reset.
- [ ] Daily meal reminders (local notifications at the best time to eat each block).

## v2 — post-MVP
- [ ] **Custom recipes / off-plan food:** Allow users to build non-plan entries (quick-type name/kcal/protein, or via `FOOD_DB`). Render under the daily checklist and adjust day totals.
  - Save entries as named, reusable recipes (recipe book with history).
  - Wire this into the reserved `day.extras` property.
  - Re-introduce `src/js/data/food-source.js` as an async seam when the network path is needed.
- [ ] **Configurable overview metrics:** Allow users to add/remove/hide readouts on the daily total (e.g., toggling the protein line).
- [ ] **Desktop layout:** Implement a purpose-built wide-screen native layout (side nav, all three screens laid out together). Must be a deliberate structural design pass, not just media queries bolted onto the mobile CSS.
- [ ] **Motion polish via [reactbits.dev](https://reactbits.dev):** pull in a few of its components — transitions, animations, small effects — to make the app feel nicer. Subtle, not showy. The app is vanilla ES modules today, so this rides on whatever build/framework v2 lands on (or the effects get ported), and it should be scoped per surface during the redesign rather than sprayed everywhere.

## resuming on another machine
`git clone`, then serve the folder over http (`python -m http.server`). `file://` breaks ES-module imports. 
Ensure `CLAUDE.md` is manually copied to the root, as it is gitignored.