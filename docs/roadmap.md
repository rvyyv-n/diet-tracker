# roadmap.md

What's still unbuilt. Shipped history in brief is `docs/CHANGELOG.md`; the
pass-by-pass detail through pass 17 is `docs/roadmap-history.md`. Settled decisions and the "Not doing" list are in `docs/decisions.md`; read it before proposing anything.

## v3.0 — the design overhaul

The brief is `docs/design-overhaul-brief.md`. The design handoff landed on
2026-10-01 and supersedes `tokens_reuse_first` for everything it covers. It
ships two Looks, Paper (default) and Reel, each with light and dark, switched
by `data-look` and `data-theme` on `<html>`. Components read semantic tokens
only. The export is committed at `private/design/export-3.0/`.

### How to run a build pass

Say the build pass by number or name ("build pass 1", "foundation", or one
of its targets like "tokens" or "pass 63"). It runs to the protocol in the
`build-pass` skill: for each target in order, read its design refs, build it,
verify it and make one commit; then stop and report. Build passes run in
order because each builds on the one before, and a build pass whose
predecessor is unticked is flagged before it starts. Start each build pass in
a fresh thread. The design refs are paths inside the design export
(`design-system/…`, `screens/…`).

| Build pass | Name                  | Targets (pass numbers)                              | Model                              |
| ---------- | --------------------- | --------------------------------------------------- | ---------------------------------- |
| 8          | Final screenshots     | `shots` (78)                                        | Sonnet 5.5, high effort            |
| 9          | Pre-release hardening | `tidy`, `upgrade`, `core`, `secure`, `a11y` (88-92) | Per target, see Build pass 9 below |

Then a phone and desktop test pass, and the release.

### Build passes

#### Build pass 8 — Final screenshots

Model: Sonnet 5.5, high effort. Target: shots. Runs last, once motion has landed, so the pictures show the finished app.

- [ ] **Pass 78 · `shots`** — final screenshots and the README that uses them.
      The pictures are retaken (`scripts/readme-shots.mjs`), the baselines are
      green and the README links hold. Left:
  - Also: a light polish of the README layout and its composed pictures
    (the owner's call after pass 75: good, could be lifted a little).
  - Also: runs the Android and Windows CI builds once on `release-3.0` and
    checks the new `icon.svg` rasterises cleanly for the launcher icons and the
    Tauri icon set (pass 73 only checked the SVG and PNGs in Chrome).
  - Done when: the README shows the shipped screens, `test:visual` is green,
    every image and link in the README resolves, and both CI icon builds
    succeed.

- [ ] **Interaction check before the release review** — run
      `npm run interact` after pass 78 and before `/code-review`. It measures
      hover washes, focus changes, clipped text, panels leaving the window,
      field alignment and Escape on every screen, in both Looks, both themes,
      phone and desktop, and prints only failures (about two minutes). Fix
      what it reports, then re-approve the pictures once. When it finds
      something it missed, add that check to `scripts/interact.mjs`. A phone
      test of touch behaviour is still by hand.

#### Build pass 9 — Pre-release hardening

Model: set per target (Sonnet 5.5 for the mechanical ones, Opus for the
audits). Runs after build pass 8 and the interaction check,
and replaces the full `/code-review` that used to close v3.0 (a Sonnet 5.5
review of everything since `v2.3.0` ran on 2026-10-01 and its fixes landed in
pass 78 review). Start it in a fresh thread. Run the targets in order: `tidy`
first, so the later audits read a smaller tree. One commit per target, plus a
`pass N fix:` commit for what an audit finds.

- [ ] **Pass 88 · `tidy`** (Sonnet 5.5, high effort) — step 0: remove what the release does not need.
  - Find redundant files and dead code with a scan, not by eye: unreferenced
    files in `src/`, `public/`, `scripts/` and `docs/`, unused exports and unused
    dependencies (the `motion` package first: remove it only if nothing imports
    it, and check that the motion work in `docs/roadmap.md` does not need it).
  - Clear caches and build output that should not be tracked or lingering
    (`dist/`, `node_modules/.vite`, Playwright and test-results folders, stray
    `*.log` and temp files). Confirm `.gitignore` covers each one.
  - Tidy organisation: files in the wrong folder, duplicated helpers, stale
    comments, and the literal px props the review found. Keep `private/` out.
  - Do not delete a doc, a script or a baseline without checking the references
    first. `docs/roadmap-history.md` and `docs/changelog-archive.md` stay.
  - Done when: `npm run check`, `test:offline` and `test:visual` pass with no
    baseline change, and the commit body lists what was removed.

- [ ] **Pass 89 · `upgrade`** (Opus, high effort) — the v2.3.0 to v3.0 upgrade path. Load data
      saved by the v2.3.0 build (and an old backup file) into the v3.0 build.
      Check every storage migration, import, export, reset and undo, and that
      appearance, reminders and What's New survive. Nothing a user saved may be
      lost or reshaped without a migration. Add a test for each gap found.
- [ ] **Pass 90 · `core`** (Opus, max effort) — a second review at max effort of `src/js/core/`
      (adjustment engine, trend, weights, day, plan, storage) and of the
      Sheet focus trap and popover Escape handling from pass 78 review. Look
      for wrong numbers, off-by-one days, time-zone and clock edge cases.
- [ ] **Pass 91 · `secure`** (Opus, high effort) — run `/security-review`. Cover `server/` (the push
      worker; say so in the commit, because it deploys by hand), the update check
      and the push subscription, and the rule that no diet data leaves the device.
- [ ] **Pass 92 · `a11y`** (Sonnet 5.5, high effort) — an accessibility pass in both Looks, light and
      dark: contrast, focus order, labels, touch-target size and reduced motion.
      Add any new check to `scripts/interact.mjs`.

Decided with the design: Shake keeps its "Most skipped" tag (a fact, per
`insight_copy_states_facts`). The collapsible desktop rail (pass 40b) was undesigned, and was restyled as pass 77.

## later

- [ ] **Redo the README once Rise has a website** — pass 75 drafted it
      without one, after Bookcook's README. When the site is live, make it the
      first link and the hero picture, as Bookcook does, and add a Website
      section.
- [ ] **v2.3.0 phone and desktop pass** — Plan → Recipes and back on a real
      phone, the storage-full banner, and reminder sync on the deployed build
      (reminders are unavailable locally). Scheduled for after the release.
- [ ] **Verify the in-app update check** picks up `v1.6.0` — on a v1.5.x
      install, that Settings → Check for updates now offers 1.6.0 and links the
      right asset. One-off, do it when a device is in hand.
- [ ] **Android PWA verification** — the browser-installed path (install /
      standalone / persistence) on a real Android device, from the Pages URL.
      Non-blocking, carried since v1.0.0; do it when a device is in hand.
- [ ] **Web push against the deployed Worker** — a live-site subscription
      reached the Worker's KV on 2026-09-15; a push from a real cron tick is still
      to see. The local rehearsal passed end to end, so this confirms the deploy.
- [ ] **Start with Windows** — needs a sign-in to see Rise come up in the tray.
- [ ] **Android reminders on a phone** — the permission prompt, a reminder
      arriving with the app closed, and one surviving a reboot. Slipped from the
      v2.2.0 checklist by the owner; do it when a device is in hand.

## v2 — shipped

All four confirmed features shipped: off-plan food and recipes, the grocery
checklist, configurable overview metrics, and the desktop layout. Pass-by-pass
detail is in `CHANGELOG.md`.

- **phase 0 — design system** ✅ passes 21–22
- **phase 1 — off-plan food and recipes** ✅ passes 23–27 (`SCHEMA_VERSION` → 2)
- **phase 2 — recipe book, expanded** ✅ passes 28–29 (`SCHEMA_VERSION` → 3)
- **phase 3 — grocery checklist with weekly reset** ✅ passes 30–31; added the Plan tab
- **phase 4 — configurable overview metrics** ✅ pass 32
- **phase 5 — the desktop layout** ✅ passes 33, 35 — side nav above 1024px, one main pane at every width
- **phase 6 — the visual pass** ✅ passes 41–44 — empty states, day-total bar, real PNG icons, theme-aware favicon
- **phase 7 — motion + the framework question** ✅ pass 45 (React + Vite migration), pass 46 (tick + progress-bar motion); pass 48 (Plan's reference split out to Recipes) shipped in v2.3
- **phase 8 — the 2.0 release** ✅ pass 49; **v2.0.0 shipped 2026-09-08**, Pages moved to GitHub Actions
- **phase 9 — v2.1** ✅ passes 50–51; **v2.1.0 shipped** — hover-rail easing, recipe book promoted to its own Recipes screen
- **phases 10–12 — v2.2** ✅ passes 52–56; **v2.2.0 shipped 2026-09-15** — meal reminders on the web, Windows and Android
- **phase 13 — v2.3** ✅ passes 57–62 and 48; **v2.3.0 shipped 2026-09-24** — failed and corrupt writes surface, a test floor in CI, accessible pickers, and Plan's reference moved to Recipes

## resuming on another machine

`git clone`, then `npm install` and `npm run dev` (pass 45 added Vite — it
understands the `public/` convention that `manifest.json`, `sw.js` and
`assets/` now live under, which a plain `python -m http.server` does not:
that would 404 on all three). `file://` breaks ES-module imports regardless of
server. `npm run build` produces the real deployable output in `dist/`.
The project brief (`CLAUDE.md`), `dev-seed.html` and the design export are
tracked, so a clone has them.
