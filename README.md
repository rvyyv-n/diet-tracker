# diet-tracker

**an in-progress diet and calorie tracker.** local-first, offline, no accounts.

```
status: early development
built:  design tokens, storage layer, plan spec
next:   welcome screen, daily checklist
```

## the idea

most diet apps ask you to weigh and log every item you eat. most people stop
within a fortnight. this one inverts that — the plan is decided in advance as a
set of meal **blocks**, and the only daily interaction is ticking off the blocks
you actually ate. calories and protein are derived from the blocks, so the
numbers appear without logging a single ingredient.

- **no food logging** — adherence tracking, not nutrition accounting
- **works offline** — no network, no accounts; fonts vendored, data stays local
- **never nags** — a missed block is a number, not a guilt trip
- **no personal data in this repo** — your details are entered on first run

## structure

```
assets/fonts/   vendored typefaces, so the app runs with no connection
docs/           design system and the plan spec the app is built from
src/css/        design tokens — colour, type and spacing as named variables
src/js/core/    storage and profile: the app's state layer
src/js/data/    food and plan data, behind a swappable interface
```

## roadmap

**v1** — welcome screen, daily block checklist, kcal and protein totals, weekly
weight entry, and an engine that *suggests* adjustments from a four-week rolling
average rather than applying them.

**v2** — dark mode, a nutrition api for off-plan foods, and generalising beyond
a single plan. the aim is an ad-free, minimal calorie and diet planner.

## licence

mit — see [LICENSE](LICENSE)
