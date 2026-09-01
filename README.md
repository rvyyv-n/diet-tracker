# Rise: Diet Tracker 🍳

**a diet tracker and planner.** local-first, offline, no accounts.

**live:** <https://rvyyv-n.github.io/diet-tracker/> — open it, then "Add to Home
Screen" (mobile) or "Install app" (desktop) for the standalone, offline PWA.

```
status: v1.0.0 released · 1.5 in progress on `release-1.5`
built:  today checklist + phase ladder, weight trend + adjustment engine,
        settings/about, json export/import, pwa shell (installable, offline),
        durable storage, deployed to github pages, android apk, windows
        installer
next:   1.5 — manual add-on blocks, daily appetite check, first-run intro,
        header polish; android pwa install check on a device (non-blocking)
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

## install

Rise is a PWA — no App Store, no Play Store. Open the live URL and add it to
your device; it then launches standalone and works with no signal.

**iPhone / iPad**

1. Open <https://rvyyv-n.github.io/diet-tracker/> in **Safari** — only Safari
   can install a web app on iOS, not Chrome or Firefox.
2. Tap the **Share** button (square with an upward arrow).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. Launch it from the new **Rise** icon. It opens full-screen with no browser
   bars and keeps working offline.

iOS can clear an unused web app's storage after roughly a week offline. Rise
requests persistent storage on first run to avoid that, and **Settings →
Export data** is the manual backup.

**Android**

Open the URL in Chrome, then take the **Install app** prompt, or
**⋮ menu → Add to Home screen → Install**.

**Desktop (Chrome / Edge)**

Open the URL and click the **install icon** at the right of the address bar, or
**⋮ menu → Install Rise…**. It opens in its own window.

**Standalone installers**

For a self-contained copy that doesn't depend on the Pages URL staying up,
grab the Android APK or the Windows installer from the
[latest release](https://github.com/rvyyv-n/diet-tracker/releases/latest).
Both are unsigned (no code-signing certificate), so Android/Windows will
warn before the first install/run — that's expected, not a sign anything's
wrong. Neither auto-updates; a new release ships a new file. Data doesn't
carry over between this and a browser-installed copy — use **Settings →
Export/Import data** to move it.

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

**1.5** — small features and a design-polish pass: adding or dropping a block
for the day from the today screen, a one-tap daily appetite check, a first-run
intro, and header tweaks.

**v2** — off-plan food entries and a reusable recipe book, configurable overview
metrics, a real desktop layout, a grocery checklist, and meal reminders.

## license

mit — see [LICENSE](LICENSE)
