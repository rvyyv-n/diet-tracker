# Design System

Built by the user in Claude Design. Read before building any UI.

---

## Fonts

| Role | Family |
|---|---|
| Headings | Newsreader (serif) |
| Body / UI | Inter (sans) |
| Numbers, data | JetBrains Mono |

## Colours

```
Coral / primary ...... #CC785C      Coral deep ........ #A9583E
Ink / headings ....... #141413      Ink body .......... #3D3D3A
Ink muted ............ #6C6A64      Cream canvas ...... #FAF9F5
Cream soft (zebra) ... #F5F0E8      Cream card ........ #EFE9DE
Hairline / borders ... #E6DFD8      White ............. #FFFFFF
Green (on track) ..... #5DB872      Gold (watch) ...... #D4A017
Red (over limit) ..... #C64545
```

## Type scale

| Role | Spec |
|---|---|
| Title | Newsreader 30pt, ink |
| H2 | Newsreader 20pt, ink |
| H3 | Inter 14pt Medium, ink |
| Label | Inter 10pt Medium, UPPERCASE, +1.5 tracking, ink muted |
| Body | Inter 11pt, line-height 1.5, ink body |
| Caption | Inter 9pt, ink muted |
| Divider | 2pt rule in Coral |

## Feel

Warm, editorial, calm. Cream backgrounds, not white pages. Serif for headlines,
sans for everything else. Coral used sparingly as the single accent. Generous
spacing; hairline borders, never heavy rules.

## ⚠️ Deliberate inversion

The spec defines red as "over limit." In a weight-gain context, **under**-eating is
the failure. So the semantics were flipped on purpose:

- **Green** — at or above target
- **Gold** — partial
- **Red** — well under

Keep the inversion. Don't "fix" it back.

---

## What's missing — ask the user for these

The tokens above were written for print documents. They don't describe an
interface. Before building UI, ask the user to supply these from Claude Design
(they can export, or screenshot the tokens page):

- **Interactive states** — hover, active, focus, disabled
- **Button variants** — primary, secondary, ghost: fills, borders, text colours
- **Form controls** — text inputs, checkboxes, toggles, selects
- **Elevation** — shadows, or is the system flat?
- **Border radii** — sharp, subtle, or rounded?
- **Spacing scale** — 4pt or 8pt grid?
- **Dark mode** — does one exist, or is cream-only intended?
- **Mobile** — breakpoints and minimum touch target size
- **Icons** — which set, what stroke weight?

Don't invent these silently. If the user doesn't have them, propose values
explicitly and get them confirmed, so the app doesn't drift from the system.
