# Rise Design System

Design system for **Rise 3.0**, a local-first diet planner and tracker for one person on a structured weight-gain plan. This folder is the source of truth for the redesigned screens; it is packaged for Claude Code, which builds them in the real app (React 19 + Vite + plain CSS).

## Sources
- This project's approved screens: `Rise Screens.dc.html` (review canvas, Turns 1–9), `Rise Today Phone`, `Rise Weight Phone`, `Rise Plan Phone`, `Rise Secondary Phone` (Recipes, Settings, first run, confirms), `Rise Desktop` (1440). Archive: `archive/Rise 3.0 Themes`, `archive/Rise 3.0 Component Sheet`. Every value in this system is lifted from those files' markup and `styles/rise-tokens.css`.
- `rise-design-handoff/` (local folder): `design-overhaul-brief.md` (product rules, showreel look, motion), `START-HERE.md`, reel/promo/current-app screenshots.
- `rise-codebase/` (local folder; GitHub `rvyyv-n/diet-tracker`, branch `release-3.0`): `docs/design-system.md` (the v2.3 system, history), `src/css/tokens.css`.
- `bookcook-brand-kit/` (local folder): the craft base the brief points to (Fraunces + Atkinson Hyperlegible Next). Not Rise's brand — only its fonts are vendored here.

## How it is organised
Two axes on `<html>` (or any element — they nest): `data-look="paper|reel"` and `data-theme="light|dark"`. **Components read semantic tokens only**; every Paper/Reel difference lives in the token blocks. Do not write Look-specific markup.

Token layers: base palette `--p-*` → semantic (`--bg-*`, `--ink*`, `--accent*`, `--intake-*`, `--due-*`, `--nav-*`, type, radius, shadow) → screen-level (`--eyebrow-*`, `--section-*`, `--cta-hero-*`, `--weighin-date-*`).

## CONTENT FUNDAMENTALS
- **Facts, never verdicts.** "825 to go · 3 blocks", "Yesterday isn't finished", "This day is closed." No streaks, badges, praise, "you're behind", or red overdue.
- **Plain, second-person-free.** Screens address the user with verbs, not "you": "Tick Snack", "Log food", "Weigh in", "Apply / Not now". Descriptions are noun lists: "Yogurt, dates and almonds".
- **Sentence case** in Paper; Reel renders eyebrows, section headings, nav labels and the hero CTA in spaced caps via tokens (`text-transform`) — write the source string in sentence case either way.
- **Numbers are the content.** Tabular figures, units after a thin gap: "2,285 / 3,110 kcal", "113/150 g", "+0.28 kg/week". Thousands separator comma.
- **Status always has a word** beside the dot/colour: On track / Partial / Low; Now / Done / If stalled; on pace.
- **Suggestions offer, never apply**: "The 4-week average has been under 0.20 kg/week for two weeks." + Not now / Apply.
- **Destructive copy names what is removed** and the way back: "This removes your profile, 45 days, 7 weigh-ins and 3 recipes… A copy is kept, and setup offers to restore it."
- **Empty states**: one muted glyph, one line, no second button. **No emoji.** Toasts: "Pre-bed ticked · 255 kcal" + Undo.

## VISUAL FOUNDATIONS
- **Mood:** calm, warm, editorial notebook — not a fitness dashboard. One accent (coral `#E0673F`), used for the primary action, the due-now edge and the sun. Deeper step `--accent-text` for any coral text (coral-500 on cream is ~3:1).
- **Two Looks.** *Paper* (default): cream paper, Fraunces display + Atkinson Next, 14px field radius, flat shadows, coral-edged due card. *Reel* (from the showreel): grain texture, Newsreader serif (italic for the due-now title), Barlow Semi Condensed with spaced caps labels, pill fields, sun-gradient CTA and active tab, dark-panel/coral due card. Light and dark are equal; dark is a warm near-black (`#0B0A09`/`#0E0D0B`), never inverted.
- **Type:** display serif for screen titles, sheet titles, suggestion titles, the due-now block name; numeric face 700 with tight tracking for hero figures (76px Paper, 86px Reel); body 16; small 14; micro 12/11. All figures `tabular-nums`.
- **Spacing:** 2·4·8·12·16·20·24·32·48; screen gutter 20. **Targets:** tick row 56–58, buttons 52 (small 40), fields/segments 48, icon buttons & chips 44, phone nav 64.
- **Radii:** cards 22 (Reel 24), field 14 (Reel pill), buttons/chips are full pills, sheets 28 top, phone frame 44.
- **Backgrounds:** flat cream/near-black canvas; Reel adds a subtle fractal-noise texture on large surfaces only. No photography, no gradients except the **sun** (radial gradient, only for the sun disc, its halo, Reel CTA/active tab).
- **Signature motifs:** the **sun** riding the end of the day-total bar on a full-bleed **horizon** line (fading at both ends); the **now line** with a sun bead between blocks; **dots as days**.
- **Cards:** raised = `--bg-raised` + `--shadow-card` (Paper: hairline + soft warm shadow; dark & Reel: 1px inset ring only). Outlined = 1px `--line`. Confirms use a 1.5px `--danger` ring.
- **Borders:** 1px hairlines (`--line`), 1.5px inset rings (`--line-strong`) for outlined buttons/fields. Never heavy rules.
- **Transparency/blur:** only the sheet scrim (`--scrim`) and the fade above the phone nav. No blur.
- **Hover** exists only on hover-capable devices and is one step below the pressed state, never a new colour. **Press:** scale .97 over 90ms. **Focus:** `--focus-ring` (2px canvas gap + 2px coral) on `:focus-visible` only.
- **Motion:** daily interactions 90–260ms on `--ease-out` (`cubic-bezier(.22,1,.36,1)`); tick pop and sun settle on `--ease-spring`; sun travel 520ms. Slow theatrical patterns (word-by-word headings, card deck, sunrise) are reserved for rare moments: intro, first run, What's new. Reduced motion zeroes all durations. Reference values from the Bookcook site are in `guidelines/product-rules.md`.
- **Layout rules:** phone 390×844 (320 stress), floating pill nav 12px from the edges; desktop 1440×900 = 256px nav + 1080 column + 340 support column; one main pane.

## ICONOGRAPHY
- Line icons on a 24px grid, stroke 1.8–1.9 (check 3.2), round caps and joins, `currentColor`. The set is small and hand-tuned in the screens: today, plan, recipes, weight, settings, check, lock, warn, info, search, chevrons, and four grocery aisle marks (dairy, pantry, protein, produce). Copied verbatim from the approved screens into `assets/icons/*.svg` and `components/core/Icon.jsx`.
- No icon font, no emoji, no unicode glyphs as icons. Markers are drawn in CSS: ring (open), filled ink circle + check (ticked), rotated square (off-plan), 6–14px status dots.
- Icon-only buttons must carry an accessible name (`IconButton` requires `label`).
- **Logo:** none was supplied. The wordmark is type + the sun disc (`Wordmark` component: nav lockup, and the Reel italic "Rıse" with the sun as the dot). `assets/brand/app-icon-v2.3*.svg` are the current app's icons (pre-3.0 palette) — redraw before shipping 3.0.

## Fonts (flagged)
- Self-hosted woff2 in `assets/fonts/`: **Fraunces** (variable, normal + italic), **Atkinson Hyperlegible Next** (variable).
- **Newsreader** (400/500/400i) and **Barlow Semi Condensed** (500/600/700) for the Reel Look currently load from **Google Fonts** in `tokens/fonts.css`. The brief requires offline-first — download the woff2 files into `assets/fonts/` and swap the `@import` for `@font-face` rules before shipping.

## Index
- `styles.css` → `tokens/fonts.css`, `foundation.css` (spacing, sizing, motion, sun), `look-paper.css`, `look-reel.css`, `screen.css`. `styles/rise-tokens.css` is a shim so the review screens keep working.
- `components/core` — Icon, Wordmark, Button, IconButton, Chip, Segmented, Toggle, Radio, TextField, Card, Eyebrow, SectionHeading.
- `components/tracking` — StatusDot, DotStrip, DayTotal, BlockList, BlockRow, NowMarker, DueCard, SuggestionCard, StatRow, PhaseLadder, GroceryList, WeightChart.
- `components/surfaces` — PhoneNav, SideNav, Sheet, Toast, Banner, ConfirmPanel, EmptyState, ListRow, ListGroup, OptionRow, CalendarGrid.
- `ui_kits/rise/index.html` — interactive phone app (Today, Plan, Weight, Settings, sheets, toasts, Look/theme switch). `desktop.html` — desktop Today with nav and dialogs.
- `guidelines/` — specimen cards plus `product-rules.md`, `porting-to-code.md`.
- `dev-bundle.jsx` — dev-only concatenation of the components so cards render before the automatic `_ds_bundle.js` exists; delete once that bundle is generated.
- Original design files: `Rise *.dc.html`, `archive/`, `uploads/`, `assets/reference/`.

## Intentional additions / gaps
- **Additions:** `Icon`, `Wordmark`, `Radio`, `Eyebrow`, `SectionHeading`, `ListGroup` — wrappers around patterns repeated verbatim in the screens.
- **Inferred, not drawn in the screens:** Toggle *off* state, Button disabled/pressed, WeightChart band maths, hover. Marked where used; confirm or redraw.
- **Not designed:** collapsible desktop rail (pass 40b). Desktop Weight/Plan/Recipes/Settings are only in `Rise Desktop.dc.html`; the desktop UI kit rebuilds Today.
- **Desktop BlockRow** has a wider grid (description line, "kcal · g" column) and a horizontal DueCard; the components implement the phone form. Kit-local versions in `ui_kits/rise/DesktopApp.jsx` show the desktop form.

---
## Previous project notes (from the review canvas)

Open `Rise Screens.dc.html` first: it's the review canvas with every frame, Turns 1–9, newest at the top.

## Files
```
Rise Screens.dc.html          review canvas; imports the five screen files below
Rise Today Phone.dc.html      ★ Today, phone
Rise Weight Phone.dc.html     ★ Weight, phone
Rise Plan Phone.dc.html       ★ Plan, phone
Rise Secondary Phone.dc.html  Recipes, Settings (Look picker), first-run Look step, confirms
Rise Desktop.dc.html          Today, Weight, Plan, Recipes, Settings at 1440 + dialogs
styles/rise-tokens.css        the only stylesheet the screens read (fonts included)
assets/fonts/                 self-hosted woff2 (Fraunces, Atkinson Next)
assets/reference/             source images from earlier rounds
archive/                      Stage 1–2 explorations: Themes (approved 5a/5b mocks), Component Sheet
uploads/                      files you attached
support.js                    runtime for the .dc.html files
```
- Tokens have three layers: the base palette (`--p-*`), semantic tokens, then screen-level tokens from the 5a/5b mocks.

Every screen file takes `look`, `theme`, `state`/`screen`, `tall` (uncropped) and `width` (320 stress test) props.

## Looks and themes
- Two attributes on `<html>`: `data-look="paper|reel"` and `data-theme="light|dark"`. "System" resolves in JS from `prefers-color-scheme` and writes `data-theme`.
- Paper is the default. The choice is stored on the profile next to `themePref`, e.g. `lookPref: "paper"`.
- Components read semantic tokens only. No screen has Look-specific markup; every difference lives in the token blocks.
- The Look picker tiles use a nested `data-look`/`data-theme` on the tile itself. Any element can scope a Look, so the previews are live.
- Fonts to self-host: Newsreader 400/400i and Barlow Semi Condensed 500/600/700, alongside Fraunces and Atkinson Next.

## Rules the screens hold
- Colour is never the only signal. A status word sits beside every status dot and phase label (Now / Done / If stalled; On track / Partial / Low; on pace / below pace).
- Pace dot: green when on pace, gold when below, neutral with no trend. Nothing on Weight is red.
- Suggestions never apply themselves. Phase 3 is only offered from Weight, with Apply / Not now.
- Shake carries "Most skipped" while it's still upcoming.
- A missed earlier block recedes in tone and size, never turns red, and stays tappable.
- Toasts with Undo: tick, weigh-in save, grocery Clear. Recipe delete keeps its two-step confirm.
- Empty states: weight history and the recipe book only. One muted glyph, one line, no second button.

## Screen notes
- **Plan:** grocery quantities scale from the Phase 2 baseline with `scaleGroceryQty`. Quantities that changed on a phase change show in `--accent-text` until the Monday reset. Ticks carry over.
- **Recipes (phone):** reached from the foot of Plan; the Plan tab stays lit (`tabParent`). On desktop it's a fifth side-nav item.
- **First run:** the Look step is Step 2 of 3 and optional. Skip keeps Paper. The preview changes on pick; the Look applies on Continue.
- **Desktop:** 256px nav, 1080px content column, a 340px support column. The nav foot carries the Today glance card.

## Surfaces
- Phone sheets: Log food, Swap, Add a block, Calendar, Weigh-in, Recipe editor. Desktop shows the same content as 520px dialogs centred on the main pane.
- Toasts with Undo: tick, weigh-in save, grocery Clear. Destructive confirms (recipe delete, reset) are inline with a danger outline.

## Chart fix
- The Weight chart's horizon runs full-bleed to the frame edge, like Today's. The approved mocks in the Themes file stopped it 20px short on both sides; that's been redrawn there too (5a, 5b, 4a, 4b).
- Axis labels are HTML in `--ink-muted`, not SVG text with a fixed fill, so they follow the theme and don't shrink as the chart scales.

## Not designed
- Pass 40b (collapsible desktop rail).

