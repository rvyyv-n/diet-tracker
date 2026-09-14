#!/usr/bin/env bash
# Run by hand (or by desktop.yml's "Sync the web app" step) from the repo root,
# before `cargo tauri build`. Not Tauri's `beforeBuildCommand`: that hook's
# working directory didn't match what this relative path assumed and silently
# broke the CI build (see desktop/README.md). Mirrors what
# android/app/build.gradle.kts's copyWebAssets task does for the Android
# shell: rather than keep a second copy of index.html/src/ under version
# control where it would drift, run the real `npm run build` and sync its
# output (dist/) into the desktop shell's frontendDist folder fresh on every
# build.
#
# Before pass 45's shell went React (JSX), syncing src/ raw and skipping the
# build worked because the app was plain, unbundled ES modules — Tauri's
# webview can run those directly. It can't run JSX unparsed, so a real build
# is no longer optional.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/dist"

( cd "$REPO_ROOT" && npm run build )

rm -rf "$DIST_DIR"
cp -r "$REPO_ROOT/dist" "$DIST_DIR"
