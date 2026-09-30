---
name: build-pass
description: Run one v3.0 build pass by name or number - tokens, looks, components, shell, today, weight, plan, settings, recipes, firstrun, sweep, icons, readme or motion (passes 63 to 76). Use whenever the user names one of those passes, says "pass 63", "run components", "do the today pass", or "next pass". Builds exactly that pass from docs/roadmap.md, verifies it, updates the docs, makes one commit and stops.
---

# Build a pass

The pass table and each pass's Reads / Does / Done when live in `docs/roadmap.md` under "v3.0". That file is the spec. This skill is the protocol.

## 1. Identify the pass

Match what the user said to a row: by name (`tokens`), number (`63`), or "next pass" (the first unticked one in table order). If the name is ambiguous, ask once.

Passes run in table order. If an earlier pass is still unticked, say which one and ask whether to run it first. Don't skip ahead silently.

## 2. Read before building

- The pass's entry in `docs/roadmap.md`, and the Architectural Decisions and Not doing sections.
- Its "Reads" files in the private design export at `private/design/export-3.0/` (paths in the roadmap are relative to `design-system/` or `screens/`). Read only what the pass lists. The tokens are the source of truth; never re-derive a value from a screenshot.
- `docs/design-system.md` once `tokens` has landed, and the code the pass touches.
- Anything the roadmap marks as an open decision is a stop-and-ask. Ask a short question with options.

## 3. Plan in a few lines, then build

State the plan in under ten lines, then build it. One pass is one commit: typically 3 to 8 files and a few hundred lines. If it will be much larger, split it into `pass N step M` commits that each build, and say so before starting.

Rules that always apply:

- Semantic tokens only. No hard-coded colours or durations; new tokens go in `tokens.css` with a line in `design-system.md`, named in the commit.
- Components read semantic tokens and carry no Look-specific markup. Every Paper and Reel difference lives in the token blocks.
- Product rules: never nag, no streaks or praise, inverted intake colours (green is never used elsewhere near intake), past days stay closed, no Today date stepper, suggestions offer and never apply, status always has a word beside its dot, offline first.
- Text in the app states facts, not verdicts.
- Motion waits for the `motion` pass. Don't build animation early; describe-only.

## 4. Verify

- `npm run check` and `npm run test:offline` pass.
- Look at the change running: one grid from `scripts/shot.mjs` through the `check-screen` skill, in the combinations the pass touches (looks x themes, 390 / 320 / 1440). Prefer text or computed-style proof when the question isn't about appearance.
- If the pass is meant to change how screens look, run `npm run test:visual:update` and commit the new pictures with it. Never approve a picture to hide an unintended change.
- Lower `LEFTOVER` in `src/css/literals.test.js` for any literal the pass removed.

## 5. Docs, commit, stop

- Tick the pass in `docs/roadmap.md` by removing its entry, and add a short entry under a `v3.0 - in progress` heading in `docs/CHANGELOG.md` (create it above v2.3.0 on the first pass), in the same commit.
- Commit per the rubric in the project brief: `pass N: <what it does>`, then one bullet per area. No mention of the assistant, no co-author or generated-by line; the hooks enforce it.
- Report in a few plain lines: what landed, what was checked, anything deferred or surprising. Name the next pass, but do not start it.
