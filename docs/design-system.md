# Design System

Read before building any UI.

The source is the user's Claude Design system, exported in full on 2026-09-03
(`docs/design-export-prompt.md` is the prompt that produced it). That export is
a **marketing-site** system — cream canvas, coral accent, five components. This
document is the app-facing reconciliation of it: what the source says, what Rise
implements, and where Rise deliberately departs.

**`src/css/tokens.css` is the implementation and the tie-breaker.** Nothing here
should contradict it; if it does, the file is right and this document is stale.

---

## Fonts

| Role | Stack | Vendored |
|---|---|---|
| Headings, hero figures | `Copernicus, "Tiempos Headline", Newsreader, Georgia, serif` | `newsreader-400.woff2` |
| Body / UI | `StyreneB, Inter, -apple-system, "Segoe UI", Roboto, sans-serif` | `inter-400/500.woff2` |
| Code (debug only) | `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace` | — not vendored |

Copernicus and StyreneB are licensed Anthropic faces; they are listed first so
anyone with them installed gets them, and Newsreader / Inter carry everyone
else. Faces are vendored under `assets/fonts/` and precached — **the app must
work with no network**, so never reintroduce a font CDN.

## Colours

Base palette — edit only this layer to rebrand; everything downstream reads the
semantic aliases.

```
Coral 500 ........ #CC785C    Coral 700 ........ #A9583E    Coral 200 ... #E6DFD8
Ink 900 .......... #141413    Ink 800 .......... #252523    Ink 700 ..... #3D3D3A
Ink 500 .......... #6C6A64    Ink 400 .......... #8E8B82
Cream 50 ......... #FAF9F5    Cream 100 ........ #F5F0E8    Cream 150 ... #EBE6DF
Cream 200 ........ #EFE9DE    Cream 250 ........ #E6DFD8    Cream 300 ... #E8E0D2
Green 500 ........ #5DB872    Gold 500 ......... #D4A017    Red 500 ..... #C64545
Teal 500 ......... #5DB8A6    Amber 500 ........ #E8A55A    White ....... #FFFFFF
```

Dark theme reads a parallel `--night-*` ramp (canvas `#171614` → soft `#1E1C19`
→ card `#232120` → strong `#2C2A26`, plus overlay, sunken `#0F0E0D`, two
hairlines and a five-step night-ink ramp). It is driven by
`prefers-color-scheme` and overridden by `[data-theme]` on `<html>`.

> **The dark alias block is duplicated verbatim** between `:root[data-theme="dark"]`
> and the `prefers-color-scheme` media query, because CSS cannot share a
> declaration list across a media-query boundary. **Edit both, every time.**

### ⚠️ Deliberate inversion

The source defines red as "over limit." In a weight-**gain** context,
**under**-eating is the failure. The semantics are flipped on purpose:

- **Green** — at or above target
- **Gold** — partial
- **Red** — well under

Keep the inversion. Don't "fix" it back. It is stated once, in the
`--intake-on-track` / `--intake-partial` / `--intake-low` aliases, so no screen
has to restate it.

## Type scale

| Role | Family | Size / line / track | Weight |
|---|---|---|---|
| display-xl | serif | 64 / 1.05 / −1.5 | 400 |
| display-lg | serif | 48 / 1.1 / −1 | 400 |
| display-md | serif | 36 / 1.15 / −.5 | 400 |
| display-sm | serif | 28 / 1.2 / −.3 | 400 |
| screen-title | serif | 48 / 1.05 / −1 | 400 |
| title-lg / md / sm | sans | 22 / 18 / 16 | 500 |
| body-md / sm | sans | 16 / 14, line 1.55 | 400 |
| caption | sans | 13 / 1.4 | 500 |
| caption-upper | sans | 12 / 1.4 / +1.5, UPPER | 500 |
| button / nav | sans | 14 | 500 |
| **metric** | **serif** | **36 / 1.1, tabular** | 400 |
| **metric-sm** | **sans** | **16 / 1.2, tabular** | 500 |

`screen-title` is an app-layer addition: the source reserves 48px for marketing
heroes, but a screen title is the loudest text on the page and needs to anchor
it.

### Numbers

Standalone hero figures (the day's kcal total) take the **serif** metric role —
they are the screen's headline, not terminal output. Figures inside rows,
tables and chart axes take the **sans** metric-sm role. Every call site also
declares `font-variant-numeric: tabular-nums`, which is where column alignment
actually comes from.

Mono is no longer a UI face. It was dropped in pass 21 once the metric roles
moved to serif/sans, which removed its last two callers and 43KB of vendored
woff2 from the precache. It survives only in `--text-code`, for debug surfaces
this app does not currently render.

## Spacing, radii, elevation

4px grid: `xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48 · section 96`.
`--space-xxxs: 2px` exists for exactly one hairline gap; if a second use
appears, question it.

Radii: `xs 4 · sm 6 · md 8 · lg 12 · xl 16 · pill`. Controls take `md`, cards
take `lg`.

Elevation is **colour-block first — shadow is rare**. In dark mode a black
shadow on a near-black surface is invisible, so dark elevation is carried by a
hairline outline (`--shadow-hover`) and an inner top highlight
(`--shadow-float`) instead of a drop shadow.

## Feel

Warm, editorial, calm. Cream backgrounds, not white pages. Serif for headlines
and hero numbers, sans for everything else. Coral used sparingly as the single
accent. Generous spacing; hairline borders, never heavy rules.

## Touch and accessibility

- **`--touch-target: 56px`** for tap rows. The source fixes controls at 40px,
  below both the 44px iOS and 48px Android minimums; this app is used
  one-handed in a kitchen, so rows get a real thumb target. Genuine form
  controls stay at `--control-height: 40px`.
- **`--icon-button-size: 44px`** — the WCAG floor. The source's 36px is
  acceptable only in a mouse-driven desktop toolbar.
- **`--text-link` is coral-700, not coral-500.** Coral-500 as text measures
  ~3.0:1 against canvas and fails AA for normal-sized text; coral-700 is ~4.7:1
  and passes. Coral-500 remains correct as a *fill* behind `--text-on-primary`.
- **`--text-muted-soft` (ink-400) is ~3.2:1 — decoration only.** Any real
  caption or fine-print copy uses `--text-muted` (ink-500, ~5.1:1).

## Deliberate departures from the source export

Recorded so they are not "corrected" later. Each was weighed against the export
and kept on purpose.

| Topic | Export says | Rise does | Why |
|---|---|---|---|
| Bottom tab bar | 64px tall | **44px** | Pass 18 trimmed 54→44 on a real device to remove a dead band on tall phones. The export's 64px is derived from a marketing top nav and has never been on a phone. The export's nav tokens are used only for the desktop side nav. |
| Night ramp | Rename to `night-950…600`, new hex | **Keep pass-19 values and names** | Rise's ramp is richer (five ink steps, two hairlines) and device-tested; only `#2C2A26` differed meaningfully. Adopted just the new *sunken* step. |
| Toggle "on" | coral | **coral** | Confirmed deliberate: green already means "at/above target" here, so a green switch would collide with a live semantic. |
| Hover | Not documented (marketing policy) | **Scoped to `(hover:hover) and (pointer:fine)`** | Touch keeps the shipped two-state model; the Tauri desktop build gets hover, where withholding it reads as broken. |
| Container max | 960px app column | **`--app-max-width: 580px`** | Rise had already made this call, tighter. 960px returns as the desktop *panel* width in phase 4. |
| `--surface-overlay` | a modal scrim | **the surface a floating panel sits on** | Name collision with the export. Rise's meaning is load-bearing in `listbox`/`calendar`; a scrim token gets a distinct name when modals land. |

## Still open — do not invent, ask first

The export marks these `PROPOSED`; they are inferred from the marketing
system's visual language and have **not** been validated against a real Rise
screen. Confirm before treating any as load-bearing:

- **Form controls** — checkbox, radio, switch, segmented control, slider.
  Only the text input exists in the source.
- **The canonical focus ring.** Proposed as a 2px canvas-colour gap plus a 2px
  coral ring; Rise currently ships `--focus-ring` as a 3px coral wash at 15%
  alpha. These are different treatments and need reconciling.
- **Modal / sheet / toast**, and the z-index scale that orders them.
- **Empty, loading and error states**, including skeleton styling.
- **Desktop breakpoints and the multi-panel grid** — blocking phase 4.
- **Dark-mode chart band opacity** (10% → 18%) — an unverified guess.
