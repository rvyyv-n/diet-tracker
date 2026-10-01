# Design System

Read before building any UI.

The source is the v3.0 design handoff (2026-10-01), adapted from the owner's
Bookcook system. It ships two **Looks**, Paper (default) and Reel, each with light
and dark. The export itself is at `private/design/export-3.0/`; this document is what the app implements of it.

**`src/css/tokens.css` is the implementation and the tie-breaker.** Nothing here
should contradict it; if it does, the file is right and this document is stale.

Components read **semantic tokens only**. Every Paper/Reel difference lives in
`tokens.css`, so a component never branches on the Look.

---

## How the file is laid out

| Layer      | Holds                                                                            | Source |
| ---------- | -------------------------------------------------------------------------------- | ------ |
| fonts      | `@font-face` for the five self-hosted families                                   | export |
| foundation | spacing, sizing, motion, sun gradients. Look-independent                         | export |
| Paper      | base palette `--p-*`, then semantic tokens, light and dark                       | export |
| Reel       | the same semantic names with Reel values, light and dark                         | export |
| screen     | eyebrow, section heading, hero CTA, nav dot, weigh-in date, chart band. Per Look | export |
| app layer  | composite type, layout and control tokens that are Rise's own                    | Rise   |
| base       | the document floor: body, headings, links, reduced-motion clamp                  | Rise   |

Switch with `<html data-look="paper|reel" data-theme="light|dark">`. Paper is the
fallback when `data-look` is missing. Dark values sit in
`[data-look="…"][data-theme="dark"]`; there is no `prefers-color-scheme` block,
because the theme is resolved in JS (`core/theme.js`, pass 64). Until that
lands, `index.html` sets `data-look="paper"` statically and a pinned Dark works;
"System" follows the OS only after pass 64.

## Fonts

| Role                       | Paper                       | Reel                                  | Files                                                |
| -------------------------- | --------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Display (`--font-display`) | Fraunces, 100–900, + italic | Newsreader 400/500, + 400 italic      | `fraunces-normal/italic`, `newsreader-normal/italic` |
| Body, numeric, caption     | Atkinson Next, 200–800      | Barlow Semi Condensed 500 / 600 / 700 | `atkinson-next`, `barlow-semi-condensed-500/600/700` |

All woff2, in `public/assets/fonts/`, **precached by `sw.js`** (latin subset for
Newsreader and Barlow). Adding or renaming one means adding it to `PRECACHE_URLS`; `CACHE_NAME` follows the build by itself. The
app must work with no network, so never reintroduce a font CDN. Mono is not a UI
face; `--font-mono` is the platform stack for debug output only.

## Colour

Paper's base palette (`--p-*`) is the only place Paper holds raw hex; everything
else reads the semantic names below. Reel writes its values directly into the
same semantic names.

| Group      | Tokens                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Surface    | `--bg-canvas` (the page), `--bg-raised` (cards, rows, sheets), `--bg-sunken` (wells, pressed), `--bg-inverse`        |
| Ink        | `--ink`, `--ink-muted`, `--ink-soft` (decoration only), `--ink-inverse`                                              |
| Line       | `--line`, `--line-strong`                                                                                            |
| Accent     | `--accent` (fill), `--accent-hover`, `--accent-pressed`, `--accent-disabled`, `--accent-ink` (text on a coral fill)  |
| Coral text | **`--accent-text`**. Coral-500 as text is ~3:1 on cream and fails AA; any coral text uses this                       |
| Danger     | `--danger`, `--danger-ink`. Only the destructive button, form errors and "well under target"                         |
| Intake     | `--intake-on-track`, `--intake-partial`, `--intake-low` and their `-wash` fills                                      |
| Focus      | `--focus-ring`: a 2px canvas-coloured gap, then a 2px coral ring                                                     |
| Overlay    | `--scrim`, `--shadow-card`, `--shadow-float`, `--chart-band`; app layer: `--chart-sky-top` / `-bottom` (Reel's band) |
| States     | app layer: `--hover-wash` and `--press-wash`, ink washes laid over a control's fill on hover and press               |
| Due-now    | `--due-*` (card background, ink, edge, glow, CTA), `--now-line`, `--sun-halo`                                        |
| Nav        | `--nav-*` (bar, edge, shadow, ink, active pill and glow)                                                             |

The accent is `#E0673F`. Text on it is `--accent-ink` (near-black), not white.

### ⚠️ Deliberate inversion

In a weight-**gain** context, **under**-eating is the failure. The intake tokens
are flipped on purpose:

- **Green** (`--intake-on-track`) — at or above target
- **Gold** (`--intake-partial`) — partial
- **Red** (`--intake-low`) — well under

Keep the inversion. Never use green for anything else near intake; a Toggle's
"on" state is ink, not green. A word always sits beside a status dot, since
colour alone is never the signal.

## Type

Families: `--font-display`, `--font-body`, `--font-numeric`, `--font-caption`.
Sizes (per Look): `--type-hero` 76 / 86, `--type-display-lg` 32 / 40,
`--type-display-md` 24 / 26, `--type-title` 18 / 19, `--type-body` 16,
`--type-small` 14, `--type-micro` 12 / 11. Display weight `--display-weight`
(420 Paper, 400 Reel); numerals take `--numeric-weight` and `--numeric-tracking`.
All figures are `tabular-nums`.

The export gives families, sizes and weights, not `font:` shorthands. The app
layer builds the ones `app.css` reads:

| Token                         | Is                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `--text-screen-title`         | display, `--type-display-lg`, line 1.05                                                                                  |
| `--text-display-sm`           | display, `--type-display-md`, line 1.2                                                                                   |
| `--text-metric`               | display, `--type-display-lg`. The day total, until Today rebuilds it on `--type-hero`                                    |
| `--text-metric-sm`            | numeric face, `--type-body`                                                                                              |
| `--text-title-sm`             | body face, 600, `--type-body`. Row and sheet titles                                                                      |
| `--text-body-md` / `-sm`      | body face, 400, `--type-body` / `--type-small`                                                                           |
| `--text-caption`              | body face, 500, `--type-small`. Sentence-case small labels                                                               |
| `--text-eyebrow`              | the eyebrow register. Pair with `--eyebrow-tracking` and `--eyebrow-transform`, so Reel uppercases it and Paper does not |
| `--text-button`, `--text-nav` | button and tab-bar labels                                                                                                |
| `--text-code`                 | platform mono, debug only                                                                                                |

Display type carries no tracking; the export specifies none.

## Spacing, sizing, radii, elevation

Spacing is a 4px grid: `--space-2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`, plus
the app-layer `--space-96` (page-bottom clearance for the floating tab pill).
`--gutter` is 20px.

Sizing: `--row-min` 56 (tick rows, one-handed), `--control-h` 48 (fields,
segmented), `--button-h` 52 / `--button-h-sm` 40, `--icon-button` 44, `--nav-h` 64.

Shell (pass 66, app layer): `--panel-nav-width` 256 (the desktop side nav),
`--panel-nav-width-collapsed` 72 (the on-hover rail at rest),
`--container-app` 1080 (the content column), `--gutter-desktop` 48 (its side
padding), `--panel-support-width` 340 (the support column beside the main one,
`.r-columns`, from 1280px), and `--nav-inset` 12 / `--nav-lift` 14 (the phone
pill's distance from the sides and the bottom). `--app-max-width` 580 still
caps the phone column, and the pill keeps to it from 600px.

Radii: `--radius-sm` 8 · `--radius-md` 14 · `--radius-card` 22 (24 Reel) ·
`--radius-field` 14 (pill in Reel) · `--radius-pill`, plus the app-layer
`--radius-sheet` 28 (sheet top corners, desktop dialogs). Use `--radius-field` for
buttons, inputs and tabs so Reel's pill shape follows.

Elevation is per Look: Paper uses soft warm shadows in light and hairline
outlines in dark, Reel uses hairlines. Read `--shadow-card` and `--shadow-float`;
never write a shadow literal. `--texture` is Reel's grain, `none` in Paper.

## Motion

`--dur-instant` 90ms (press), `--dur-fast` 160 (hover, toggles), `--dur-base` 260
(sheet, toast), `--dur-slow` 520 (sun travel). Easings: `--ease-out`,
`--ease-spring` (tick pop, sun settle), `--ease-in-out`. All four durations fall
to 0 under `prefers-reduced-motion`. `--transition-control` and
`--transition-entry` are app-layer shorthands over these.

Four duration literals remain in `app.css` (the intro, ack and tab
cross-fade animations, and a few press transitions). They are tokenised by the
`motion` target (pass 76); motion work does not start before then.

## Product rules that shape the tokens

- **Never nag.** A missed block is a number. No streaks, badges or praise.
- **Inverted intake colours** (above).
- **Past days stay closed.** No date stepper on Today.
- **Suggestions offer, never apply.**
- **Hover** only under `(hover: hover) and (pointer: fine)`, one step below the
  element's pressed state, and nothing moves on hover.
- **Body copy ≥ 4.5:1.** Coral text is `--accent-text`; `--ink-soft` is
  decoration only.

## Old names to new

The v2 names are gone from `app.css`. Kept here so an old branch or note can be
translated.

| Old                                                            | New                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| `--surface-canvas`                                             | `--bg-canvas`                                            |
| `--surface-card`, `--surface-soft`, `--surface-overlay`        | `--bg-raised`                                            |
| `--surface-cream-strong`, `--surface-sunken`                   | `--bg-sunken`                                            |
| `--text-ink`, `--text-body`, `--text-body-strong`              | `--ink`                                                  |
| `--text-muted` / `--text-muted-soft`                           | `--ink-muted` / `--ink-soft`                             |
| `--text-link`                                                  | `--accent-text`                                          |
| `--color-primary` / `-active` / `-disabled`                    | `--accent` / `--accent-pressed` / `--accent-disabled`    |
| `--text-on-primary`                                            | `--accent-ink` (`--danger-ink` on a danger fill)         |
| `--surface-primary-tint`                                       | `--accent-tint` (app layer)                              |
| `--border-hairline`, `--border-hairline-soft`                  | `--line`                                                 |
| `--divider-strong`                                             | `--line-strong`                                          |
| `--status-error` / `--status-success`                          | `--danger` / `--intake-on-track`                         |
| `--accent-teal`, `--accent-amber`                              | gone; protein reads `--accent-text` / `--accent`         |
| `--chart-cone-fill`                                            | `--chart-band`                                           |
| `--font-serif-display` / `--font-sans`                         | `--font-display` / `--font-body`                         |
| `--space-xxxs … --space-section`                               | `--space-2 … --space-96` (by pixel value)                |
| `--radius-control` / `--radius-full`                           | `--radius-field` / `--radius-pill`                       |
| `--touch-target` / `--control-height` / `--icon-button-size`   | `--row-min` / `--control-h` / `--icon-button`            |
| `--duration-fast` / `-base` / `-entry`, `--ease-standard`      | `--dur-fast` / `--dur-base` / `--dur-base`, `--ease-out` |
| `--type-*-size/-line/-track`, `--text-display-*`, `--weight-*` | the Type table above                                     |
| the `--night-*` ramp, `--coral-*`, `--ink-*`, `--cream-*`      | `--p-*` (Paper) or the semantic tokens                   |

## Deliberate departures from the export

Each was weighed and kept on purpose; do not "correct" them.

| Topic                | Export says | Rise does                                  | Why                                                                   |
| -------------------- | ----------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Accent tint          | not defined | `--accent-tint`, `color-mix` of `--accent` | One definition serves both Looks; dark raises the mix from 12% to 20% |
| Copernicus, StyreneB | n/a         | dropped                                    | The v2 faces were licensed stand-ins; the Looks bring their own       |

## Components

The shared set is in `src/components/`: `core.jsx` (Icon, Button, IconButton,
Chip, Segmented, Toggle, Radio, TextField, Card, Eyebrow, SectionHeading),
`tracking.jsx` (StatusDot, DotStrip, DayTotal, BlockList, BlockRow, NowMarker,
DueCard, SuggestionCard, StatRow, PhaseLadder, GroceryList, WeightChart) and
`surfaces.jsx` (Sheet, Toast, Banner, ConfirmPanel, EmptyState, ListGroup,
ListRow, OptionRow, CalendarGrid). Props follow the handoff's `.d.ts` files.
Their styles are the `r-` classes at the end of `app.css`; the prefix keeps
them clear of the v2 classes. Every main screen is built on them (passes 67-71); the first-run screens still use the v2 form classes until pass 72.
Build a screen from these; don't add a parallel control. `dev/components.html`
on the dev server shows every one in all four Look and theme pairs.

`Icon` draws the Rise set (nav, check, lock, warn, info, search, chevrons,
aisle marks) and falls back to the Lucide glyphs in `ui/icons.js` for any other
name. `shared.jsx` is only `NUM` and `Imperative` now; its old `Icon`, `Group`,
`GroupLabel`, `EmptyState` and `fmtTime` went with the last screen that used them.

**States**, one model for every component:

- **Hover** only under `(hover: hover) and (pointer: fine)`: `--hover-wash` over
  the fill. Primary uses `--accent-hover`. Nothing moves.
- **Press**: `--press-wash` (primary: `--accent-pressed`), and controls scale to
  .97 over `--dur-instant`. Full-width rows wash but don't scale.
- **Focus**: `outline: none; box-shadow: var(--r-ring), var(--focus-ring)` on
  `:focus-visible`, never `:focus`, so a mouse click draws no ring and an
  outlined control keeps its outline. `--r-ring` is the control's own inset
  ring (a transparent zero shadow when it has none, since `none` can't sit in
  a shadow list). The canvas-coloured gap lets the ring read on any surface.
- **Disabled**: primary fills with `--accent-disabled`; everything else fades
  to .5. Toggle off, Button disabled and pressed are inferred in the handoff.

The `ui/` widgets (listbox, calendar popover, date dropdowns) follow the same
look: a TextField trigger, IconButton-style month nav, an ink fill for the
picked option or day, and today ringed. The v2 form classes (`.field`,
`.seg`, `.btn`, …) stay for the first-run screens until pass 72.

Nested Looks: the app layer of `tokens.css` is declared on `:root, [data-look]`,
so an element carrying its own `data-look` and `data-theme` (the Look picker's
tiles, the scratch page) resolves every composite token in its own scope.

## Breakpoints

Reference only. A custom property cannot sit in an `@media` condition, so
queries repeat the literals: `--bp-compact` 360, `--bp-medium` 600,
`--bp-expanded` 840, `--bp-desktop` 1024 (bottom bar becomes a side nav),
`--bp-wide` 1440.
