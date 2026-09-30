# Handoff: Rise 3.0 redesign

## Overview
Rise is a local-first diet planner/tracker for one person on a structured weight-gain plan. This bundle redesigns every screen (Today, Plan, Weight, Recipes, Settings, first run, sheets, confirms, empty states) for phone (390×844, 320 stress) and desktop (1440×900), in two Looks (Paper, Reel) × light/dark.

## About the design files
Everything here is a **design reference built in HTML**: prototypes showing intended look and behaviour, not production code to copy. **Recreate them in the existing app**: React 19 + Vite, plain CSS, no Tailwind or component library, shared by PWA, Android shell and Tauri desktop (repo `rvyyv-n/diet-tracker`, branch `release-3.0`). Use its established patterns.

## Fidelity
**High-fidelity.** Final colours, type, spacing, radii, motion and copy. Recreate pixel-accurately using the tokens; do not approximate values.

## Read in this order
1. `design-system/readme.md`: content rules, visual foundations, iconography, fonts, component index, known gaps.
2. `design-system/guidelines/product-rules.md`: behaviour rules that are not visual decisions.
3. `design-system/guidelines/porting-to-code.md`: step-by-step port plan (tokens → Look/theme → fonts → components → screens → desktop → verify). **Follow this as the task list.**
4. `design-system/components/**`: each `.jsx` has `.d.ts` (props contract) and `.prompt.md` (usage). Inline-style objects over CSS variables; convert to class CSS in `app.css` if preferred, keeping variable names.
5. `design-system/tokens/*.css` (+ `styles.css` entry): source of truth for every value. Do not re-derive from screenshots.
6. `design-system/ui_kits/rise/` (`index.html` phone, `desktop.html`): working composed reference of Today, Plan, Weight, Settings.
7. `screens/Rise Screens.dc.html`: review canvas with every approved frame (Turns 1–9). The other `screens/*.dc.html` are the per-screen sources; each takes `look`, `theme`, `state`/`screen`, `tall`, `width` props. Open in a browser (needs `screens/support.js`, already alongside).

## Screens
Today (phone + desktop), Plan incl. grocery list and phase ladder, Weight incl. chart and suggestion, Recipes (phone: reached from foot of Plan with Plan tab lit; desktop: fifth side-nav item), Settings (Look picker), first run (Look = step 2 of 3, optional), sheets (Log food, Swap, Add a block, Calendar, Weigh-in, Recipe editor; desktop = 520px dialogs), confirms (recipe delete, reset all data), empty states (weight history, recipe book only). Exact measurements live in the tokens and components; frame-by-frame layouts in the `.dc.html` files.

## Key decisions
- Two attributes on `<html>`: `data-look="paper|reel"`, `data-theme="light|dark"`. Components read semantic tokens only, no Look-specific markup. Persist `lookPref` next to `themePref`; resolve "System" in JS.
- One accent, coral `#E0673F`; `--accent-text` for any coral text. Old accent `#CC785C` is retired.
- Copy: facts not verdicts, no streaks/praise/red overdue, sentence case, no emoji, tabular figures, status always has a word beside the dot.
- Suggestions offer, never apply (Apply / Not now). Toasts with Undo: tick, weigh-in save, grocery Clear. Delete and reset use inline two-step confirm, no Undo.
- Motion: 90–260ms on `cubic-bezier(.22,1,.36,1)`; sun travel 520ms; press scale .97; reduced motion zeroes all durations.
- Targets: tick row 56–58, buttons 52, fields 48, chips/icon buttons 44, phone nav 64.

## Gaps to resolve
- Download Newsreader (400/500/400i) and Barlow Semi Condensed (500/600/700) woff2 to `public/assets/fonts/`, replace the Google `@import` in `tokens/fonts.css`, precache in the service worker (offline-first).
- Inferred, not drawn: Toggle off state, Button disabled/pressed, WeightChart band maths, hover. Confirm or redraw.
- Not designed: collapsible desktop rail (40b). Desktop components implement the phone form; desktop BlockRow/DueCard variants are in `ui_kits/rise/DesktopApp.jsx`.
- No logo supplied; `assets/brand/app-icon-v2.3*.svg` are pre-3.0 and must be redrawn.

## Verify
390×844, 320 (nothing clips), 1440×900; Paper/Reel × light/dark; reduced motion; body contrast ≥ 4.5:1; 44px minimum targets.

## Files
```
README.md                 this file
design-system/            readme, SKILL, tokens, styles.css, guidelines, components, ui_kits, assets (fonts, icons, brand)
screens/                  Rise *.dc.html design references + support.js
```
