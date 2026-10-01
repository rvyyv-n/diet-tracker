# decisions.md

Settled decisions and the "Not doing" list, moved out of `roadmap.md`. Read it before proposing anything new, not on every pass.

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
tokens_reuse_first:
  decision: "reuse tokens.css first; new UI may add its own tokens without sign-off, recorded in tokens.css and design-system.md (relaxed 2026-09-24)"
  why: "the export is settled; asking before every new value slowed new screens, and one home for tokens is what actually stops drift"
design_overhaul_v3:
  decision: "v3.0 is a full visual and UI/UX overhaul; the designer has full freedom over the look, adapting the owner's Bookcook design system to Rise. The product rules (never nag, inverted intake colours, past days closed, no Today date stepper, suggest-never-apply, offline) still hold (2026-09-26)"
  why: "the owner loved the design made for Bookcook; the 2026-09-03 export was a marketing-site system reconciled into an app, and a design made for the app should replace it rather than be patched onto it"
animations_last:
  decision: "motion polish and component-framework adoption come after every feature phase"
  why: "effects applied to surfaces that aren't final have to be ported twice"
reminder_push_no_personal_data:
  decision: "the web push server stores only a subscription endpoint, timezone, and the bare clock times to ping — never meal names, plan or log data"
  why: "closed-app web reminders need a server, but the no-accounts/no-network line still holds for actual diet data — the service worker decides what to show at delivery time from a local copy of today's plan. The times were added in pass 53: a ping for a switched-off add-on would reach a worker with nothing to show, and browsers penalise a push that shows no notification"
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
  pass-33 multi-pane routing (the `panes` list in `App.jsx`,
  `core/broadcast.js`) stays in place unused rather than being ripped out.
- **Online food lookup** (`src/js/data/food-source.js`) — a 20-entry local
  `FOOD_DB` plus user recipes covers the feature, and `tokens.css` requires the
  app work with no network. Revisit only if it's actually wanted.
- **Recipe photos** — images don't fit localStorage's ~5MB budget, so a real
  version means IndexedDB as a second storage path: new migration surface, a
  rewritten backup format, and an export that stops being human-readable JSON.
