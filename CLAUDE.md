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
  `npm run build` must pass before every commit.
- `file://` doesn't work because ES modules need http.
- `dev-seed.html` (tracked, demo data only) writes four weeks of demo data
  into localStorage. Open it through the dev server.
- Reminders show "unavailable" in local builds. That's expected, because
  `VITE_PUSH_URL` is only set in the Pages workflow.
- `npm run check` runs the tests, ESLint, the Prettier check and the build. A
  local pre-commit hook runs it on every commit (so don't run it first), plus
  a name and identity guard: no mention of the assistant in commit messages or
  added lines, and no co-author or generated-by lines. The hooks live in
  `.git/hooks` and are untracked, so recreate them on a new machine.
- `npm run test:offline` fails if any request leaves localhost (the update
  check is the one allowed) or a bundled font 404s. `npm run test:visual`
  compares screens with the approved pictures in `e2e/snapshots` (taken on
  Windows with installed Chrome, local only). `npm run test:visual:update`
  approves a deliberate change. Both need `dev-seed.html`.
- Look at the app with `node scripts/shot.mjs '<json>'` (`look`, `theme`,
  `width` and `tab` make a labelled grid; examples at the top of the script)
  and the `check-screen` skill. Dev server: `npm run dev -- --port 5199`.
- `src/css/literals.test.js` is a ratchet on hard-coded hex and durations
  outside `tokens.css`. Lower its `LEFTOVER` counts as they go down.
- The v3.0 design export is tracked at `private/design/export-3.0/`. The rest
  of `private/` (the reel source) stays ignored; never commit it.

## Where things live

```
src/*.jsx         one React component per screen (Today, Weight, Plan, Recipes, Settings…)
src/js/core/      storage, plan, day, weights, trend + adjustment engines. Pure, no DOM
src/js/ui/        small shared controls (popover, listbox, date pickers, icons)
src/css/          tokens.css (design tokens, the tie-breaker) and app.css
public/           manifest.json, sw.js, icons, vendored fonts
android/          Kotlin shell and native reminders
desktop/          Tauri shell: tray, start-with-OS, native reminders
server/           Cloudflare Worker for web push reminders
docs/             roadmap.md, CHANGELOG.md, design-system.md, plan-spec.md
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
  and name them in the commit. No hard-coded literals. Read the "Deliberate
  departures" table before "fixing" an existing value to match the export.
- **Never nag.** A missed block is a number, not a guilt trip. No streaks, no
  gamified praise, no "you're behind" nudges. Insight copy states facts, never
  verdicts.
- **Offline first.** No CDNs and no network calls for diet data. The only
  outbound requests are the update check and the reminder push subscription.
- **Past days stay closed.** Browsing back never reopens a day for editing.
- **No header date stepper on Today.** Rejected, deliberately. Past days are
  reached through the 7-day dot strip and the calendar popover.
- **Motion and interaction polish come after feature and layout work**, so
  effects aren't built twice. Pass 48 (moving Plan's reference sheet) is an
  open decision that comes before any motion pass.
- Read the "Architectural Decisions" and "Not doing" sections of
  `docs/roadmap.md` before proposing anything. Don't re-propose a "Not doing"
  item without a new reason.

## Build passes (v3.0)

The v3.0 rebuild is seven build passes in `docs/roadmap.md`, each a group of
numbered passes (63 to 77). When the user names one, such as "build pass 1",
"foundation", "next build pass", or a single target like "tokens" or "pass 65",
invoke the `build-pass` skill and follow it. The roadmap entry is the spec,
each target is one commit, and each build pass lists the model to use.

## Docs

- `docs/roadmap.md` holds only **unfinished** work. When a pass is done, remove
  it from there and add a short entry to `docs/CHANGELOG.md` under the current
  release, in the same commit as the work.
- Don't let `roadmap.md` grow back into a history log.

## Releases

Version line: v1 → 1.5 → 1.6 → 2.0 → 2.1 → 2.2 → 2.3 → 3.0 (the Claude Design overhaul). Never invent a number;
ask which one this is.

Flow: work lands on `release-X.Y` → before release, a full `/code-review` over
everything since the last tag, then a test pass on phone and desktop →
fast-forward `main`, tag and publish using the `release` skill
(`.claude/skills/release/SKILL.md`). Publishing a Release builds the APK and
installer.

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
- No `Co-Authored-By`, "Generated with" or other attribution lines.
- The next free pass number is the highest in `CHANGELOG.md` and
  `roadmap.md`, plus one (57 at the time of writing).
- `npm run build` passes, and you've looked at the change running, before
  committing.
- `git pull --rebase` before every push. Never force-push a shared branch.
