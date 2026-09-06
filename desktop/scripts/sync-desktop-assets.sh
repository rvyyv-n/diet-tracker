#!/usr/bin/env bash
# Run by Tauri's `beforeBuildCommand` (see src-tauri/tauri.conf.json) right
# before every build, from desktop/src-tauri. Mirrors what
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
