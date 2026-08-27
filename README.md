# Weight-Gain Tracker

A local-first daily checklist for following a structured eating plan.

Most diet apps ask you to weigh and log every item you eat. Most people stop
doing that within a fortnight. This one takes the opposite approach: the plan is
decided in advance as a set of meal **blocks**, and the only daily interaction is
ticking off the blocks you actually ate. Calories and protein are derived from
the blocks, so the number appears without anyone logging a single ingredient.

> **Status:** pre-v1, in active development. The design foundation and storage
> layer are in place; the daily checklist is not built yet.

## Design goals

- **No food logging.** Adherence tracking, not nutrition accounting.
- **Works offline.** No network, no accounts, no sync. Fonts are vendored and
  data lives in your browser.
- **Never nags.** A missed block shows up as a number, not a guilt trip.
- **Reduces decisions** rather than adding them.
- **No personal data in this repository.** Your details are entered on first run
  and stay on your machine.

## Project structure

```
assets/fonts/     Vendored woff2 typefaces, so the app runs with no connection
docs/             Design system and planning notes
src/
  css/            Design tokens — colour, type and spacing as named variables
  js/
    core/         Storage and profile: the app's state layer
    data/         Food data, behind a single swappable interface
```

## Running it

The app is plain HTML, CSS and JavaScript — no build step and no dependencies.
It uses ES modules, which browsers refuse to load from a `file://` path, so
serve the folder over HTTP:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Roadmap

**v1** — welcome screen, daily block checklist, running kcal and protein totals,
weekly weight entry, and an adjustment engine that *suggests* changes based on a
four-week rolling average rather than applying them.

**v2** — dark mode, a remote nutrition API for off-plan foods, and generalising
the app beyond a single plan. The long-term aim is an ad-free, minimal calorie
and diet planner.

## Licence

Released under the MIT License — see [LICENSE](LICENSE).
