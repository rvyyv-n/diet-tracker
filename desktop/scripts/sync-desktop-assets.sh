#!/usr/bin/env bash
# Run by Tauri's `beforeBuildCommand` (see src-tauri/tauri.conf.json) right
# before every build, from desktop/src-tauri. Mirrors what
# android/app/build.gradle.kts's copyWebAssets task does for the Android
# shell: rather than keep a second copy of index.html/src/ under version
# control where it would drift, sync the current repo tree into the
# desktop shell's frontendDist folder fresh on every build.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/dist"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# manifest.json, sw.js and assets/ moved into public/ when pass 45 added Vite
# (it copies public/ to the build output root verbatim); src/ is still plain
# vanilla ES modules and stays directly servable raw until a screen actually
# goes JSX, at which point this switches to syncing the `npm run build`
# output (dist/ at repo root) instead.
cp "$REPO_ROOT/index.html" "$DIST_DIR/"
cp "$REPO_ROOT/public/manifest.json" "$REPO_ROOT/public/sw.js" "$DIST_DIR/"
cp -r "$REPO_ROOT/src" "$DIST_DIR/src"
cp -r "$REPO_ROOT/public/assets" "$DIST_DIR/assets"
