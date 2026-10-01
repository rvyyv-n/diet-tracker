# Rise 3.0 first run: handoff

Design source: the "Rise 3.0 first run" Design canvas (11 `.dc.html` frames, included in the zip next to this file).
Design system: "Rise" (tokens, `RiseDS` components, `product-rules.md`). Target stack per `porting-to-code.md`: React 19 + Vite, plain CSS, no Tailwind.
Status: the frames were written against the real `RiseDS` components but have not been rendered or visually checked. Treat the frames as the layout intent and this file as the spec. No new tokens were added.

## Scope

Build the missing first-run pieces. First run is: Intro, then Step 1 "Set up your plan", then Step 2 "Pick a Look" (already built), then Step 3 "You're set up". After setup, Today shows a one-time "What's new in 3.0" card to users who updated.

| Frame file | What |
| --- | --- |
| `Main.dc.html`, `Intro-Reel-Dark.dc.html` | Intro, phone 390x844, Paper light / Reel dark |
| `Step1-Empty-*.dc.html` | Step 1, empty state, phone |
| `Step1-Invalid-*.dc.html` | Step 1, one invalid field, phone |
| `Step1-Desktop-Paper-Light.dc.html` | Step 1, desktop 1440x900 |
| `Step3-*.dc.html` | Step 3 summary, phone |
| `WhatsNew-*.dc.html` | Today with the What's new card, phone |

Every frame has `look` (paper|reel) and `theme` (light|dark) tweaks. Only Paper light and Reel dark were drawn; the other two combinations come from tokens.

## Rules that apply everywhere

- Components read semantic tokens only. Set `data-look` and `data-theme` on `<html>`. No hard-coded colours.
- Offline first. No network wording. Fonts are self-hosted (`fonts/` in the design system; the frames use `ds/rise/fonts/`).
- Facts, never verdicts. Sentence case in source strings (Reel uppercases via tokens). No emoji.
- Touch targets 44px minimum. Fields and segmented controls 48px. Buttons 52px. Phone gutter 20px.
- Body text 4.5:1. Coral text is always `accent-text`. A word sits beside every status.
- One primary (coral) action per view.
- Phone 390x844, check at 320. Desktop 1440x900.
- No fake status bar. Phone content starts 44px from the top.

## Step header (Steps 1 and 3; Step 2 is the reference)

- `Eyebrow`: "Step N of 3".
- Progress bar below it: three segments, 4px tall, 6px gap, pill radius, `aria-hidden`. Done = `ink`, current = `accent`, next = `line-strong`.
- Title: `font-display`, `--display-weight`, `--type-display-lg`, line-height 1.1, 16px below the bar.
- Intro line: 16px, `ink-muted`, 6px below the title.
- Note: the real Step 2 file was not available to the designer, so this header was rebuilt from the brief. Reconcile it with Step 2 in code, and share one `StepHeader` component.

## 1. Intro (shown once, before Step 1)

Layout (phone): centred column.
- `Wordmark variant="reel"`, size 88. This is "Rıse" with a dotless ı and the sun as its dot. Wrap it in an `h1` with `aria-label="Rise"`.
- 40px below: a full-bleed horizon line (1.5px, `linear-gradient(90deg, transparent, var(--horizon) 12%, var(--horizon) 88%, transparent)`).
- 32px below: one line of copy, `font-display`, `--type-display-md`, `ink`, centred, max width 290.
- Copy: "A daily plan for gaining weight at a steady pace." The earlier line was "Your daily plan for steady, sustainable weight gain."; swap it back in if the owner prefers it.
- "Get started": `Button variant="hero"`, full width, 20px gutter, 36px from the bottom.
- Tap anywhere continues to Step 1, at any moment. The button is the explicit control, the screen tap is a shortcut.
- Persistence: a local flag, for example `introSeen`. Never shown again.

Motion (plays once, about 1.4 s; the only slow theatrical motion besides What's new):

| Start | What | Duration token | Easing |
| --- | --- | --- | --- |
| 0 ms | Horizon fades in | `--dur-base` 260 ms | `--ease-out` |
| 160 ms (`--dur-fast`) | R, ı, s, e each rise 10 px and fade in, 90 ms apart (`--dur-instant`) | `--dur-base` 260 ms each | `--ease-out` |
| 260 ms | Sun rises from below the horizon to just under the ı | `--dur-slow` 520 ms | `--ease-out` |
| 780 ms | Sun settles into the dot of the ı, small overshoot | `--dur-slow` 520 ms | `--ease-spring` |
| 1040 ms | Copy fades up 8 px | `--dur-base` 260 ms | `--ease-out` |
| 1130 ms | "Get started" fades in | `--dur-base` 260 ms | `--ease-out` |

- The ı is dotless until the sun lands, so the dot arrives last.
- Nothing blocks input during the sequence.
- Reduced motion: the tokens are already 0 ms, so the final frame shows at once.
- Engineering note: the `Wordmark` component draws the sun as part of the glyph. To animate it, split the dot into its own element, or add a prop that hides it while a separate sun element animates.

## 2. Step 1 of 3, "Set up your plan"

Header intro line: "Everything stays on this device."

Fields, in order (phone, single column, 14px between fields, form text line-height 18px):

| Field | Control | Detail |
| --- | --- | --- |
| Name (optional) | `TextField` | placeholder "Your name" |
| Date of birth | three native selects: Day, Month, Year | grid `84px 1fr 100px` (desktop `80px 1fr 96px`), 8px gap |
| Height | `TextField` unit "cm", plus `Segmented` cm / ft/in | placeholder "e.g. 170" |
| Current weight | `TextField` unit "kg", plus `Segmented` kg / lb / st | placeholder "e.g. 58.5" |
| Target gain | `TextField` unit "kg/week" | hint "Aim for 0.25 to 0.4 kg/week."; placeholder "e.g. 0.30" |
| Plan start date | field-styled button, value "Thu 1 Oct 2026", trailing text "Calendar" | hint "Defaults to today."; opens the calendar sheet (`CalendarGrid` in `Sheet`) |

- Unit toggles sit beside the field: a 156px-wide `Segmented` in a grid `1fr 156px` with a 10px gap. Wrap each in a `role="group"` with a label such as "Height unit". Its top margin is 24px to align with the field below the 18px label plus 6px gap.
- Selects and the date button are not in the design system. They reuse the `TextField` box: height `--control-h`, radius `--radius-field` (14 Paper, pill in Reel), `inset 0 0 0 1.5px var(--line-strong)`, 16px text, `bg-canvas` background, chevron from `Icon chevronRight` rotated 90 degrees. Build `Select` and `DateField` components for this, and add them to the design system.
- Placeholder text and an unselected select use `ink-muted` (the frames set `input::placeholder{color:var(--ink-muted);opacity:1}`).
- Empty state: all fields blank; Plan start date is prefilled with today.
- Invalid state shown: Current weight "58..5" with the error "Enter a number, for example 58.5." under it. `TextField error` renders it in `danger` at 13px with a 1.5px `danger` ring; the words carry the meaning, not only the colour. `danger` text passes 4.5:1 on all four themes (Reel light is 4.51).
- Required: date of birth, height, weight, target gain, start date. Name is optional. The designer set no min or max for target gain, so decide limits in code and write the error in the same plain style.
- "Continue": `Button variant="primary"`, full width, 24px from the bottom. It is never disabled. Pressing it validates and shows errors on the fields that need them.
- Desktop (1440x900): no side nav. `Wordmark variant="nav"` at the top left (48px, 40px). A centred 640px column holds the header and a two-column form (24px column gap, 20px row gap): Name | Date of birth, Height | Current weight, Target gain | Plan start date. "Continue" is right-aligned in a 240px wrapper, 32px below the form.

## 3. Step 3 of 3, "You're set up"

- Header: segments done, done, current. Intro line: "Check these before you start."
- Summary: `Card` (raised), padding `4px 18px`, 28px below the header. Five rows, each min-height 56, 1px `line` dividers. Label 16px `ink-muted` on the left; value 18px bold, tabular figures, right-aligned.
- Rows, sample values: Height 168 cm, Start weight 58.5 kg, Age 27 years, Target +0.30 kg/week, Start date Thu 1 Oct 2026. Age is derived from the date of birth; the date of birth itself is not shown.
- Bottom, 24px from the edge: "Start tracking" (`primary`, full width), 4px gap, then "Edit details" (`Button variant="text"`, full width, 52px tall). "Edit details" goes back to Step 1 with values kept.

## 4. What's new in 3.0 card on Today

- Position: on Today, between the date strip and `DayTotal` (16px below the strip, 22px above `DayTotal`). Padding `0 20px` around the card.
- `Card` raised, padding `18px 18px 16px`. Title "What's new in 3.0" in `font-display`, `--type-display-md`. Then a list with 1px dividers, each row padding 10px 0: a 16px bold line and a 14px `ink-muted` location line.

| Line | Where it lives |
| --- | --- |
| Two Looks, Paper and Reel | Settings > Appearance |
| Light, dark, or follow your device | Settings > Appearance |
| Every screen redrawn | Today, Plan, Weight and Settings |
| Recipes | The link at the foot of Plan |

- "Got it": `Button variant="secondary"`, full width, 12px below the list. Secondary on purpose: Today already has the coral due-card action.
- Dismiss is only via "Got it". There is no close icon because the icon set has none.
- Rows are text only, not links.
- Shown once, on the first Today after updating to 3.0. Fresh installs never see it. Store a local flag, for example `whatsNewSeen = "3.0"`. This was the designer's assumption; confirm it.
- Frames show Today in the existing user state (Phase 2 · Week 6, 2,285 / 3,110 kcal, protein 113/150 g, 825 to go, 3 blocks) with `PhoneNav active="today"`.

Motion (plays once, about 1.1 s):

| Start | What | Duration token | Easing |
| --- | --- | --- | --- |
| 0 ms | Today paints as usual, no card | - | - |
| 260 ms (`--dur-base` delay) | Card slot grows from 0 to full height, fades in, moves 12 px down into place; day total and blocks move down with it | `--dur-slow` 520 ms | `--ease-out` |
| 420 ms | Title, the four lines and "Got it" each fade up 8 px, 90 ms apart (`--dur-instant`) | `--dur-base` 260 ms each | `--ease-out` |

- Done at about 1.13 s. Controls work from the first frame.
- Dismiss: "Got it" presses to scale .97 for `--dur-instant` 90 ms. The card then fades, lifts 8 px and collapses its height together over `--dur-base` 260 ms, `--ease-out`; the day total slides up. No toast and no Undo (Undo exists for tick, weigh-in save and grocery Clear only). The exit is quicker than the entrance because it answers a tap.
- Reduced motion: durations are 0, instant.

## Known gaps and open decisions

1. The real Step 2 file was not found. Check the step header against it.
2. New components needed: `Select`, `DateField` (and ideally a shared `StepHeader`). Add them to the design system rather than leaving them as local markup.
3. Existing component sizes under 44px: `Segmented` segments are 40px tall inside the 48px track; `Button size="sm"` is 40px; `DotStrip` dots are 14-20px. The frames did not change these. Consider raising them, or give the track hit-area padding.
4. `Segmented` unselected label on Reel light is `ink-muted` on `bg-sunken` at 4.40:1, below 4.5. Not in the Paper light / Reel dark frames, but it ships in Reel light.
5. README says `danger` is for destructive confirms only; the brief asked for field errors in `danger`, and `TextField error` already uses it. Update the README wording if that stands.
6. `DayTotal.remaining` was passed as a plain string in the frames, so the number is not bold as in the app. In code pass the usual fragment.
7. Intro copy was changed from the original line (see section 1).
8. Not designed: Step 1 in ft/in or lb/st mode, the calendar sheet for the start date (use the existing one), Reel light and Paper dark renders.

## Product rules to keep in mind (from `product-rules.md`)

Never nag; no streaks, praise or red for missed items. A word beside every status dot. Suggestions never apply themselves. Past days are closed. Offline first: no CDN fonts, no remote images, no icon fonts. Text-labelled actions. Hover only under `(hover:hover) and (pointer:fine)`.
