# Claude Design export prompt

Paste the block below into Claude Design to obtain the full token + component
export that v2 phase 0 is gated on. Run it on Sonnet (high or medium effort).

If the reply gets truncated, do not re-run from scratch — reply with
`Continue from section N, same rules.` so the numbering and format hold.

---

I need a **complete, exhaustive export** of this design system so it can be
implemented in code. This is not a summary or an overview — it is the handoff
document, and anything you omit will be silently invented by an engineer later,
which is exactly what I am trying to prevent.

## What the system is being implemented in

The app is **Rise**, a weight-*gain* tracker. Relevant constraints:

- **Vanilla HTML/CSS/ES modules.** No React, no Tailwind, no build step. The
  export must land as plain **CSS custom properties**, not framework config.
- **Offline-first PWA**, also packaged as an Android APK and a Tauri desktop
  app. Fonts are vendored locally; no Google Fonts, no network at runtime.
- **Mobile-first today** (breakpoints only at 360px and 600px), with a
  purpose-built **desktop layout** coming — side nav, multiple panels side by
  side. I need desktop breakpoints and wide-layout guidance, not just phone.
- **Dark mode already ships**, driven by `prefers-color-scheme` with a manual
  override. Every colour token needs a **light and a dark value**.
- Existing surfaces: a daily meal checklist, a weight-history screen with a
  trend chart, a settings screen, a first-run setup flow, and popovers /
  dropdowns / a calendar picker.

## One semantic rule you must not "fix"

This app is for **gaining** weight, so **under**-eating is the failure state.
The status colours are deliberately inverted from the usual convention:

- **Green** = at or above target
- **Gold / amber** = partway there
- **Red** = well *under* target

Keep this inversion. Do not re-map red to "over limit."

## Output format

Produce **two things for every section**:

1. A **CSS custom property block** with literal values — no `var()` chains that
   dead-end, no placeholders, no "same as above", no ellipses. If a token is an
   alias, show both the base value and the alias.
2. A short **markdown table** giving each token a plain-English role and its
   intended usage, so an engineer knows *when* to reach for it.

Use kebab-case token names. Group tokens as a **base layer** (raw palette /
scale values) and a **semantic layer** (aliases that reference the base), so the
system can be rebranded by editing the base layer alone.

## Sections to cover — all of them, in this order

1. **Colour — base palette.** Every ramp, every step, with hex values. Include
   the neutral/ink ramp, the surface/canvas ramp, the accent(s), and status
   colours.
2. **Colour — semantic aliases.** Text (primary, body, muted, faint, inverse,
   link, on-accent), surfaces (canvas, card, soft, raised, overlay, sunken),
   borders (hairline, strong, focus), and status (success/on-track, warning,
   danger, info) — **light and dark values for each**.
3. **Typography.** Families and their fallback stacks; every named role
   (display, title, heading, body, label, caption, button, metric/numeric, code)
   with size, weight, line-height, letter-spacing, and case. State which family
   is used for numbers and data.
4. **Spacing scale.** Is it a 4pt or 8pt grid? Give every step with its name and
   px value, plus guidance on component padding vs layout gaps.
5. **Border radii.** Every step, and which components use which.
6. **Elevation.** Is the system flat or shadowed? Give every shadow level with
   full CSS values, and the **dark-mode equivalents** (shadows usually need to
   become borders or lighter surfaces in dark).
7. **Motion.** Durations, easing curves, which transitions are standard on which
   interactions, and what must change under `prefers-reduced-motion: reduce`.
8. **Interactive states.** For every interactive element: rest, hover, active/
   pressed, **focus-visible**, disabled, and loading. I specifically need a
   single documented focus-visible treatment (colour, width, offset, radius)
   that works on both light and dark surfaces.
9. **Buttons.** Primary, secondary, ghost/tertiary, danger, and text/link
   variants. For each: fill, border, text colour, padding, radius, height, font,
   and all six states from section 8. Include size variants (small, default) and
   a full-width variant.
10. **Form controls.** Text input, textarea, number input, select/dropdown,
    checkbox, radio, toggle/switch, segmented control, and slider. For each:
    dimensions, padding, border, radius, typography, placeholder styling, and
    every state including **error and helper-text** treatment. Include label
    positioning and required-field marking.
11. **Navigation.** Bottom tab bar (mobile) and side nav (desktop): heights/
    widths, item spacing, icon+label layout, and the active/inactive treatment.
12. **Containers and overlays.** Card, list row, section header, modal/sheet,
    popover, dropdown menu, and toast/snackbar. Include backdrop treatment,
    max-widths, and entry/exit motion.
13. **Data display.** Stat/metric readouts, progress indicators, badges/pills/
    chips, dividers, tables, and **charts** — line colour, grid/axis colour,
    fill and band/cone opacity, point markers, and how chart colours survive
    dark mode.
14. **Icons.** Which icon set, stroke weight, the size scale, and how icons
    align optically with text.
15. **Layout and breakpoints.** Every breakpoint with its px value and intended
    device class, including at least one true **desktop** breakpoint. Give
    container max-widths, gutters, the grid definition, and guidance for a
    multi-panel wide layout.
16. **Accessibility.** Minimum touch target size, minimum contrast ratios and
    whether the palette meets them (call out any pair that does not), and the
    focus-order/skip-link expectation.
17. **Z-index scale.** Named layers from base through nav, dropdown, sticky,
    overlay, modal, and toast.
18. **Empty, loading, and error states.** The standard visual treatment for each,
    including skeleton styling if the system has one.

## Rules

- **Do not skip a section** because it seems obvious or because the system
  "doesn't really have one." If a section genuinely has no defined values, say
  so explicitly under that heading and **propose** values consistent with the
  rest of the system, clearly marked as `PROPOSED` so I can confirm them.
- **No abbreviation.** Never write "and so on", "similar to the above", or
  truncate a scale. Every step, every value, spelled out.
- Flag any place where the system is **internally inconsistent** or where a
  value looks like it was designed for print rather than for an interface.
- End with a short list of **open questions** you could not resolve.
