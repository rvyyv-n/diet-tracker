---
name: check-screen
description: Visually check a Rise screen against the v3.0 design handoff using one grid screenshot. Use only when a change is visual and can't be proved by tests or the page text - a new or restyled screen, a layout change, or the end-of-pass check of screens the pass changed. Not for every small tweak.
---

# Check a screen

Screenshots are the most expensive thing to look at, so take as few as possible: one grid image per question, never a series of single shots.

## 1. Decide whether a screenshot is needed

Unintended changes are caught without looking: `npm run test:visual` compares the key screens, in every Look and theme, with approved pictures (the pre-commit hook runs it once pictures exist). This skill is for judging whether an _intended_ change looks right. When it does, run `npm run test:visual:update` so the new look becomes the approved one, and commit the pictures with the change.

Prefer cheaper proof first: tests, the page text (`"text":true` in `scripts/shot.mjs`), or an `eval` of a computed style or element size. Take a screenshot only when the answer is about how it looks.

## 2. Make sure the app is running

`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5199/` should print 200. If not, start `npm run dev -- --port 5199 --strictPort` in the background.

## 3. Pick the smallest grid that answers the question

The full matrix is 2 Looks (`paper`, `reel`) x light/dark x 390 / 320 / 1440 wide. Never shoot all of it at once. Pick by what the change touches:

- **Colour, surface or Look-specific styling:** looks x themes at 390 (4 shots).
- **Spacing or wrapping:** widths 320 / 390 in one Look and theme (2 shots).
- **Phone vs desktop layout:** widths 390 / 1440 x themes (4 shots).

```sh
node scripts/shot.mjs '{"path":"/?tab=today","grid":{"look":["paper","reel"],"theme":["light","dark"]},"cell":420,"out":"shots/check.jpg"}'
```

Grid keys are `look`, `theme`, `width`, `height` and `tab`; the last key runs across. `"actions"` opens a sheet or menu, `"full":true` takes the whole page, and a `.jpg` out keeps it small. The demo history is seeded from `dev-seed.html` and the clock is pinned to 2026-09-30 15:00.

## 4. Compare with the handoff

The approved design is in `private/design/export-3.0/`: `design-system/` for tokens and components, and `screens/*.dc.html` for each frame, which take `look`, `theme`, `state`, `width` and `tall` props. Read only the part for this screen. The screen must match in size, spacing and layout, with nothing added that the design doesn't have. Also look for text cut off at 320px, low contrast in dark, anything spilling past the frame, and status shown by colour alone.

## 5. Report

Say what matches and what doesn't, in everyday words. Show the grid to the user only if they'd want to see it (a finished screen, or a question about how something should look).
