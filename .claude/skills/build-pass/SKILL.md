---
name: build-pass
description: Run a v3.0 build pass by number or name - "build pass 1" to "build pass 7", or its name (foundation, components and shell, daily screens, plan settings and recipes, first run and identity, audit and README, motion), or one of its targets (tokens, looks, components, shell, today, weight, plan, settings, recipes, firstrun, icons, sweep, readme, motion, rail, or pass 63 to 77). Use whenever the user names one, or says "next build pass". Builds each target in the group from docs/roadmap.md in order, one commit per target, verifies, updates docs and stops.
---

# Build a build pass

A build pass is a group of targets, each a numbered roadmap pass (63 to 77). The table of build passes, each target's Reads / Does / Done when, and the model for each build pass live in `docs/roadmap.md` under "v3.0". That file is the spec. This skill is the protocol.

## 1. Identify what to run

- "build pass N", its name, or "next build pass" (the first build pass with an unticked target) runs every unticked target in that group, in order.
- A single target by name or number (`tokens`, `pass 65`) runs just that target.
- Build passes run in order. If an earlier build pass has unticked targets, say which and ask whether to run it first. Don't skip ahead silently.
- If the name is ambiguous, ask once.

## 2. Check the model

Each build pass lists its model in the roadmap. If this session is on a different one, say so in one line and carry on unless the user wants to switch. Suggest a fresh thread for each build pass.

## 3. For each target, in order

**Read first.** The target's entry in `docs/roadmap.md`. Read `docs/decisions.md` (settled decisions, Not doing) only if the target adds something its entry doesn't cover. Its "Reads" files in the design export at `private/design/export-3.0/` (paths are relative to `design-system/` or `screens/`); read only what the target lists. The tokens are the source of truth, so never re-derive a value from a screenshot. After `tokens` lands, read `docs/design-system.md` too. Anything the roadmap marks as an open decision is a stop-and-ask: ask a short question with options.

**Plan in under ten lines, then build.** One target is one commit: typically 3 to 8 files and a few hundred lines. If it will be much larger, split it into `pass N step M` commits that each build, and say so first.

Rules that always apply:

- Semantic tokens only. No hard-coded colours or durations; new tokens go in `tokens.css` with a line in `design-system.md`, named in the commit.
- Components read semantic tokens and carry no Look-specific markup. Every Paper and Reel difference lives in the token blocks.
- Product rules: never nag, no streaks or praise, inverted intake colours (green never appears elsewhere near intake), past days stay closed, no Today date stepper, suggestions offer and never apply, a word beside every status dot, offline first.
- App text states facts, not verdicts.
- Motion waits for the `motion` target. Don't build animation early.

**Verify.**

- The pre-commit hook is the full gate (`npm run check`, `test:offline`, `test:visual`). Don't run those by hand first. While building, run only `npx vitest run <touched test files>` and `npx eslint <touched files>`.
- Prove the change with page text (`"text":true` in `scripts/shot.mjs`) or an `eval` of a computed style or size. Take no screenshot per target.
- One grid per build pass, not per target: after the last target, run one `check-screen` grid for the screens the group changed.
- Re-approve pictures once, in the last commit of the group that changed how screens look: run `npm run test:visual:update` and commit the pictures with it. If an earlier commit is blocked by `test:visual` only because of an intended change, approve it then. Never approve a picture to hide an unintended change.
- Lower `LEFTOVER` in `src/css/literals.test.js` for any literal the target removed.

**Docs and commit.** Remove the target's entry from `docs/roadmap.md` and add a short entry under the `v3.0 - in progress` heading in `docs/CHANGELOG.md`. Never read CHANGELOG whole, because it is long. Use `Grep` for the heading, or `Read` with an offset and limit, and append the entry at the end of that section, in the same commit. Commit per the rubric in the project brief: `pass N: <what it does>`, then one bullet per area. No mention of the assistant, no co-author or generated-by line; the hooks enforce it.

**Keep going or stop.** Continue to the next target in the group only if checks are green and nothing needs a decision. Otherwise stop there and say why.

## 4. Report

When the group is done, or stopped early, report in a few plain lines: the commits made, what was checked, anything deferred or surprising, and the next build pass. Don't start the next build pass. Do not push unless asked.
