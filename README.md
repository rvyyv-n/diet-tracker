# Rise 🍳

**a diet tracker and planner.** local-first, offline, no accounts.

```
status: v1 packaging
built:  today checklist, weight trend + adjustment engine, settings/about,
        json export/import, pwa shell (installable, offline)
next:   phase explainer, cross-platform packaging, v1 release
```

## the idea

most diet apps make you weigh and log every item you eat, and most people quit
within a fortnight. this one inverts that: the plan is fixed in advance as a set
of meal **blocks**, and the only daily action is ticking the ones you ate.
calories and protein come from the blocks — no ingredient is ever logged.

a weekly weigh-in feeds a four-week rolling average, and an engine *suggests*
plan adjustments rather than applying them. the plan that ships aims at a slow,
steady weight gain; the block structure generalises to any fixed plan.

- **no food logging** — adherence tracking, not nutrition accounting
- **works offline** — everything is cached; fonts vendored, data stays in your browser
- **never nags** — a missed block is a number, not a guilt trip
- **nothing personal in this repo** — your details are entered on first run

## screens

- **today** — the day's active blocks as tap rows; running kcal + protein, an
  intake-status colour, an inline rotation picker per meal, and any adjustment
  suggestion with apply / dismiss
- **weight** — a weigh-in (any date, through a calendar popover), the four-week
  gain against the target band, a trend chart, and an editable history
- **settings** — the profile card (tap to edit), json export / import with a
  preview, a data reset behind a confirm, and an about block

## structure

```
index.html        app shell — loads the stylesheet and entry script, registers the sw
manifest.json     pwa manifest (name, icon, standalone display)
sw.js             cache-first service worker for offline use
assets/           the app icon and vendored typefaces
docs/             design system, plan spec, and the build roadmap
src/css/          design tokens, then the screen + component styles
src/js/           app shell + router, and one module per screen
src/js/core/      storage, profile, the plan + day + weight models, the trend
                  and adjustment engines — all pure, no dom
src/js/ui/        small shared controls (dom helper, icons, popover, listbox,
                  the date pickers)
```

## running it

static files, no build step. serve the folder over http and open it —
`file://` won't work, es modules need http:

```
python -m http.server 8000
```

then open <http://localhost:8000>. the service worker caches aggressively; while
developing, hard-reload or bump `CACHE_NAME` in `sw.js` to pick up changes.

## roadmap

full detail in [docs/roadmap.md](docs/roadmap.md).

**v1** — the three screens above, offline, packaged to run on android, iphone
and desktop with no local server, and shipped as a github release.

**v2** — off-plan food entries and a reusable recipe book, configurable overview
metrics, a grocery checklist, and meal reminders.

## license

mit — see [LICENSE](LICENSE)
