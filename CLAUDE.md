# CLAUDE.md — Rise

Project brief for any Claude session working on Rise. It is tracked, so
cloud sessions have it; keep personal details out of it.

## What Rise is

A local-first diet tracker and planner. The plan is fixed in advance as meal
**blocks**, and the only daily action is ticking the ones you ate. Calories and
protein come from the blocks, and no ingredient is ever logged. A weekly
weigh-in feeds a four-week rolling average, and an engine *suggests* plan
adjustments, never applies them.

It ships as a PWA on GitHub Pages, an Android APK (Kotlin shell), and a
Windows installer (Tauri). There are no accounts and no backend for diet data.
Everything lives in the browser's storage.

## Running it

- Node **24** (what CI uses). `npm install`, then `npm run dev`.
- `npm run build` produces `dist/`, and `npm run preview` serves it.
- `dev-seed.html` (tracked, demo data only) writes four weeks of demo data
  into localStorage. Open it through the dev server.
- Reminders show "unavailable" in local builds. That's expected, because
  `VITE_PUSH_URL` is only set in the Pages workflow.
- `npm run check` runs the tests, ESLint, the Prettier check and the build. A
  local pre-commit hook runs it on every commit, so don't run it first. The
  same hook guards names and identity (see Commit rubric). The hooks live in
  `.git/hooks` and are untracked, so recreate them on a new machine.
- `npm run test:offline` fails if any request leaves localhost (the update
  check is the one allowed) or a bundled font 404s. `npm run test:visual`
  compares screens with the approved pictures in `e2e/snapshots` (taken on
  Windows with installed Chrome, local only). `npm run test:visual:update`
  approves a deliberate change. Both need `dev-seed.html`.
- The v3.0 design export is tracked at `private/design/export-3.0/`. The rest
  of `private/` (the reel source) stays ignored; never commit it.

## Where things live

```
src/*.jsx       one React component per screen (Today, Weight, Plan…)
src/js/core/    storage, plan, day, weights, trend, adjustment. Pure, no DOM
src/js/ui/      small shared controls (popover, listbox, pickers, icons)
src/css/        tokens.css (design tokens, the tie-breaker), app.css
public/         manifest.json, sw.js, icons, vendored fonts
android/        Kotlin shell, native reminders
desktop/        Tauri shell: tray, start-with-OS, native reminders
server/         Cloudflare Worker for web push (deployed by hand)
docs/           roadmap, decisions, CHANGELOG (+ archive), design-system, plan-spec
```

## How work lands

Rise is a solo project (rvyyv-n). There are no other contributors, no PRs and
no review gate.

- Work goes straight onto the active `release-X.Y` branch (currently
  `release-3.0`). `main` and `v*` tags are locked by rulesets and only move at
  release time.
- Anything `docs/roadmap.md` marks as an open decision or "do not build without
  a decision" is a **stop-and-ask**, even under time pressure. Ask a short
  question with options. Don't decide it yourself.
- `server/` deploys from the owner's Cloudflare account, by hand. Edit it if
  needed, but say so, because nothing reaches production until it's deployed.

## Standing rules

- **Tokens: reuse first, add freely.** Existing tokens come from the Claude
  Design export (`docs/design-system.md`, implemented in `src/css/tokens.css`).
  For new UI (a new tab, a new element) create whatever tokens it needs
  without asking. Put them in `tokens.css`, add a line to `design-system.md`,
  and name them in the commit. No hard-coded literals (`literals.test.js`
  enforces it). Read the "Deliberate departures" table before "fixing" an
  existing value to match the export.
- **Never nag.** A missed block is a number, not a guilt trip. No streaks, no
  gamified praise, no "you're behind" nudges. Insight copy states facts, never
  verdicts.
- **Offline first.** No CDNs and no network calls for diet data. The only
  outbound requests are the update check and the reminder push subscription.
- **Past days stay closed.** Browsing back never reopens a day for editing.
- **No header date stepper on Today.** Rejected, deliberately. Past days are
  reached through the 7-day dot strip and the calendar popover.
- **Motion and interaction polish come after feature and layout work**, so
  effects aren't built twice.
- **Look at the app cheaply.** Make one grid with `node scripts/shot.mjs
  '<json>'` (`look`, `theme`, `width`, `tab`; examples at the top of the
  script) or the `check-screen` skill, at about 800px wide, and don't read
  the same image twice in a session. Many separate shots are fine for the
  README and other deliberate artwork. Dev server: `npm run dev -- --port
  5199`.
- **Batch the work.** Every turn re-reads the whole context, so fewer turns
  cost less. Group related edits into one call, verify once when the target
  is done, and fix a finished pass in one `pass N fix:` commit.
- Read `docs/decisions.md` (Architectural Decisions and Not doing) before
  proposing anything. Skip it for a scoped build-pass target. Don't
  re-propose a "Not doing" item without a new reason.

## Build passes (v3.0)

The v3.0 rebuild is seven build passes in `docs/roadmap.md`, each a group of
numbered passes (from 63). When the user names one, such as "build pass 1",
"foundation", "next build pass", or a single target like "tokens" or "pass 65",
invoke the `build-pass` skill and follow it. The roadmap entry is the spec,
each target is one commit, and each build pass lists the model to use.

## Docs

- Don't read `docs/CHANGELOG.md` or `docs/changelog-archive.md` whole. Grep
  them or read a range. Don't read `docs/roadmap-history.md` or `private/`
  media unless asked.
- `docs/roadmap.md` holds only **unfinished** work. When a pass is done, remove
  it from there and add a short entry to `docs/CHANGELOG.md` under the current
  release, in the same commit as the work. Don't let it grow into a history log.

## Releases

A major number marks a redesign, a minor number a batch of passes. Never
invent a number; ask which one this is.

Work lands on `release-X.Y`. Before release, run a full `/code-review` over
everything since the last tag, then test on phone and desktop. Then use the
`release` skill to fast-forward `main`, tag and publish. Publishing a Release
builds the APK and installer.

## Commit rubric

**Subject line**, lowercase prefix, plain words, no trailing period, about 72
characters or fewer:

| Kind | Form |
|---|---|
| a roadmap pass | `pass 57: <what it does>` |
| a large pass in parts | `pass 57 step 2: <what this step does>` |
| a fix to a finished pass | `pass 57 fix: <what was wrong, now right>` |
| review cleanups | `pass 57 review: <what was tidied>` |
| docs only | `docs: …` / `roadmap: …` |
| housekeeping | `chore: …` |
| urgent live-site fix | `hotfix: …` |

Examples from history:
`pass 53: web push reminders, client side`,
`pass 54 review: fix a tray-lock hang, tidy the sync paths and stale comments`.

**Body**: a blank line, then one bullet per file or area, stating what changed
and why, wrapped at about 72 columns:

```
- src/js/core/reminders.js: subscribe flow, and a snapshot of today's
  blocks mirrored into IndexedDB after every storage write
- Settings: Notifications group, hidden in native shells
- roadmap: pass 53 recorded
```

**Size**: one pass per commit, typically 3–8 files and a few hundred lines. If
a pass grows past that, split it into `step` commits that each build.

**Rules**:
- No `Co-Authored-By`, "Generated with" or other attribution lines, and no
  mention of the assistant in messages or added lines. The hook enforces it.
- The next free pass number is the highest in `CHANGELOG.md` and
  `roadmap.md`, plus one.
- You've looked at the change running before committing. The hook runs
  `npm run check`, which includes the build.
- `git pull --rebase` before every push. Never force-push.
