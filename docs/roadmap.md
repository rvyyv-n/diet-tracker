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

## v3.0 — the design overhaul

The brief is `docs/design-overhaul-brief.md`. The design handoff landed on
2026-10-01 and supersedes `tokens_reuse_first` for everything it covers. It
ships two Looks, Paper (default) and Reel, each with light and dark, switched
by `data-look` and `data-theme` on `<html>`. Components read semantic tokens
only. The export is committed at `private/design/export-3.0/`.

### How to run a build pass

Say the build pass by number or name ("build pass 1", "foundation", or one
of its targets like "tokens" or "pass 63"). It runs to the protocol in the
`build-pass` skill: for each target in order, read its design refs, build it,
verify it and make one commit; then stop and report. Build passes run in
order because each builds on the one before, and a build pass whose
predecessor is unticked is flagged before it starts. Start each build pass in
a fresh thread. The design refs are paths inside the design export
(`design-system/…`, `screens/…`).

| Build pass | Name              | Targets (pass numbers)      | Model                   |
| ---------- | ----------------- | --------------------------- | ----------------------- |
| 6          | Audit and README  | `sweep` (74), `readme` (75) | Opus, high effort       |
| 7          | Motion            | `motion` (76), `rail` (77)  | Sonnet 5.5, high effort |
| 8          | Final screenshots | `shots` (78)                | Sonnet 5.5, high effort |

Then a full `/code-review` over everything since `v2.3.0` (Opus), a phone
and desktop test pass, and the release.

### Build passes

#### Build pass 6 — Audit and README

Model: Opus, high effort. Targets: sweep, readme. This is the cross-cutting audit that approves the visual baselines, then the README redesign from final screenshots.

- [ ] **Pass 74 · `sweep`** — the cross-cutting pass.
  - Reads: the Verify list in the design README, `guidelines/sizing.html`.
  - Does: every remaining sheet and confirm at phone and as 520px dialogs;
    320px nothing clips on every screen; body contrast at least 4.5:1; 44px
    targets (the first-run handoff flags the Segmented segments at 40px, small
    buttons at 40px and the DotStrip dots under 44px); Segmented's unselected
    label on Reel light is 4.40:1 and needs 4.5:1; a status word beside every
    status dot; reduced motion; drives
    `literals.test.js` to zero (only `theme.js` hex stays); re-approves any
    baseline it moves with `test:visual:update`. The baselines for both Looks,
    light and dark, were approved after pass 73, so `test:visual` is a live
    gate until then.
  - Done when: `check`, `test:offline` and `test:visual` are green across Paper
    and Reel, light and dark.

- [ ] **Pass 75 · `readme`** — README redesign in the style of the owner's
      other project.
  - Does: centred header, badges, a screenshot row from `scripts/shot.mjs`,
    contents, install, features, privacy and development sections; keeps the
    status line honest.
  - Done when: it renders cleanly on GitHub and every link resolves.

#### Build pass 7 — Motion

Model: Sonnet 5.5, high effort. Targets: motion, rail. This is animation, last, then the one undesigned surface. Switch to Opus only if the choreography needs planning.

- [ ] **Pass 76 · `motion`** — animation, last.
  - Reads: `guidelines/motion.html`, and the motion notes in `product-rules.md`.
  - Does: daily interactions at 90 to 260ms on `cubic-bezier(.22,1,.36,1)`,
    press scale .97, tick pop and sun settle on the spring curve, sun travel
    520ms, the theme cross-fade, the slow theatrical moments for intro, first
    run and What's new only; a test that animations use the duration tokens and
    never their own milliseconds; reduced motion zeroes every duration.
    The intro and What’s new motion is already built (pass 72 motion).
  - Done when: nothing animates that the design doesn't describe, and reduced
    motion is fully still.

- [ ] **Pass 77 · `rail`** — the on-hover desktop rail, restyled.
  - Reads: `components/surfaces/SideNav.jsx`, `Wordmark.jsx`, the nav tokens
    in `docs/design-system.md`. The handoff has no rail frame, so its look is
    a stop-and-ask: propose it with options before building.
  - Does: the collapsed 72px rail (`navPref: "hover"`, pass 47) in the v3.0
    nav's style, in both Looks: the sun, the icons with the active pill and
    sun dot, and the wordmark, labels, glance card and Pinned / On hover
    toggle hidden until it opens; opening and closing use the `motion`
    durations.
  - Done when: the rail opens on hover and keyboard focus at 1440 in both
    Looks, light and dark; nothing that stays visible moves as it opens; and
    touch devices still get the pinned nav.

#### Build pass 8 — Final screenshots

Model: Sonnet 5.5, high effort. Target: shots. Runs last, once motion and the
rail have landed, so the pictures show the finished app.

- [ ] **Pass 78 · `shots`** — final screenshots and the README that uses them.
  - Reads: `scripts/shot.mjs`, the README, `e2e/snapshots`.
  - Does: retakes the README screenshot row from the finished build (Today,
    Weight, Plan, Recipes and Settings, phone and desktop, Paper and Reel,
    light and dark); re-approves the visual baselines with
    `test:visual:update` if motion or the rail moved any pixel; updates the
    README images, alt text and any captions; checks the status line and every
    link still hold.
  - Also: runs the Android and Windows CI builds once on `release-3.0` and
    checks the new `icon.svg` rasterises cleanly for the launcher icons and the
    Tauri icon set (pass 73 only checked the SVG and PNGs in Chrome).
  - Done when: the README shows the shipped screens, `test:visual` is green,
    every image and link in the README resolves, and both CI icon builds
    succeed.

Decided with the design: Shake keeps its "Most skipped" tag (a fact, per
`insight_copy_states_facts`). The collapsible desktop rail (pass 40b) is
undesigned, so it is restyled last, as pass 77, once the redesign is done.

## later

- [ ] **v2.3.0 phone and desktop pass** — Plan → Recipes and back on a real
      phone, the storage-full banner, and reminder sync on the deployed build
      (reminders are unavailable locally). Scheduled for after the release.
- [ ] **Verify the in-app update check** picks up `v1.6.0` — on a v1.5.x
      install, that Settings → Check for updates now offers 1.6.0 and links the
      right asset. One-off, do it when a device is in hand.
- [ ] **Android PWA verification** — the browser-installed path (install /
      standalone / persistence) on a real Android device, from the Pages URL.
      Non-blocking, carried since v1.0.0; do it when a device is in hand.
- [ ] **Web push against the deployed Worker** — a live-site subscription
      reached the Worker's KV on 2026-09-15; a push from a real cron tick is still
      to see. The local rehearsal passed end to end, so this confirms the deploy.
- [ ] **Start with Windows** — needs a sign-in to see Rise come up in the tray.
- [ ] **Android reminders on a phone** — the permission prompt, a reminder
      arriving with the app closed, and one surviving a reboot. Slipped from the
      v2.2.0 checklist by the owner; do it when a device is in hand.

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
- **phase 7 — motion + the framework question** ✅ pass 45 (React + Vite migration), pass 46 (tick + progress-bar motion); pass 48 (Plan's reference split out to Recipes) shipped in v2.3
- **phase 8 — the 2.0 release** ✅ pass 49; **v2.0.0 shipped 2026-09-08**, Pages moved to GitHub Actions
- **phase 9 — v2.1** ✅ passes 50–51; **v2.1.0 shipped** — hover-rail easing, recipe book promoted to its own Recipes screen
- **phases 10–12 — v2.2** ✅ passes 52–56; **v2.2.0 shipped 2026-09-15** — meal reminders on the web, Windows and Android
- **phase 13 — v2.3** ✅ passes 57–62 and 48; **v2.3.0 shipped 2026-09-24** — failed and corrupt writes surface, a test floor in CI, accessible pickers, and Plan's reference moved to Recipes

## resuming on another machine

`git clone`, then `npm install` and `npm run dev` (pass 45 added Vite — it
understands the `public/` convention that `manifest.json`, `sw.js` and
`assets/` now live under, which a plain `python -m http.server` does not:
that would 404 on all three). `file://` breaks ES-module imports regardless of
server. `npm run build` produces the real deployable output in `dist/`.
The project brief (`CLAUDE.md`), `dev-seed.html` and the design export are
tracked, so a clone has them.
