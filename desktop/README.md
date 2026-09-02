# Rise — Windows desktop shell

A thin Tauri wrapper around the same web app that runs on Pages, for a
double-clickable Windows installer alongside the browser-installed PWA.

## Why this exists alongside the PWA

Chrome/Edge's "Install app" already gives a standalone, offline-capable
window that auto-updates — see `docs/legacy/roadmap-full-history.md` pass 6. This installer adds
one thing the PWA can't: a normal "download and run setup.exe" experience
that doesn't require opening a browser and finding the install menu first.

Costs, weighed against that: no auto-update (a new installer ships per
release, same as the Android APK), a separate WebView2 storage partition
from whatever browser has the PWA installed (Export/Import moves data
between them, they don't share one), and — since there's no code-signing
certificate — Windows SmartScreen shows an "unknown publisher" warning on
first run. None of that is a rendering or functionality gap: Tauri renders
through WebView2, the same Chromium engine the browser PWA uses, so the app
itself behaves identically either way.

## How it's built

There is no second copy of the app in this folder. `scripts/sync-desktop-assets.sh`
copies `index.html`, `manifest.json`, `sw.js`, `src/` and `assets/` from the
repo root into `dist/`, so the build always ships whatever is on disk. Run it
yourself before building — it's a plain CI step rather than Tauri's
`beforeBuildCommand` hook, since that hook's working directory didn't match
what a relative script path assumed and silently broke the CI build.

Tauri serves that bundle over its own local origin (not `file://`), so —
unlike the Android shell — no asset-loader workaround was needed for the
ES-module imports in `src/js/app.js`.

## Building

**CI (the normal path):** `.github/workflows/desktop.yml` builds an NSIS
installer on `windows-latest` on every push touching `desktop/`, `src/`, or
the app shell files, on demand (`workflow_dispatch`), and on publishing a
GitHub Release (where it attaches the installer as a release asset). Grab it
from the Actions run, or the Release once one is cut.

**Locally**, once Rust + the MSVC Build Tools (C++ workload) are installed:

```sh
cargo install tauri-cli --version "^2" --locked   # once
bash desktop/scripts/sync-desktop-assets.sh       # from the repo root
cd desktop/src-tauri
cargo tauri icon icon-source.png                  # once, see below
cargo tauri build
```

The installer lands in `desktop/src-tauri/target/release/bundle/nsis/`.

## Icon

Tauri's icon set (`icons/32x32.png`, `128x128.png`, `128x128@2x.png`,
`icon.ico`) is generated from `assets/icon.svg` at build time — CI
rasterises it to a 1024×1024 PNG with `cairosvg`, then runs
`cargo tauri icon` to produce the full set. Neither the source PNG nor the
generated `icons/` folder is tracked; both are regenerated every build.
