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

cp "$REPO_ROOT/index.html" "$REPO_ROOT/manifest.json" "$REPO_ROOT/sw.js" "$DIST_DIR/"
cp -r "$REPO_ROOT/src" "$DIST_DIR/src"
cp -r "$REPO_ROOT/assets" "$DIST_DIR/assets"
