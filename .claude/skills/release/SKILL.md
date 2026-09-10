---
name: release
description: Cut a Rise release — bump the version across all seven surfaces, write the CHANGELOG and roadmap closeout, tag, push, and publish the GitHub Release that builds the APK and Windows installer. Use when asked to "cut a release", "ship vX.Y.Z", "bump the version", or "publish the release".
---

# Cutting a Rise release

Rise's version lives in **seven files plus a service-worker cache key**, and the
APK/installer are built by GitHub Actions that only fire when a Release is
*published*. Missing one surface produces a build that reports the wrong
version in Settings → About, or an installed PWA that never refetches the
shell. This skill is the fixed order.

Ask the user for the version number if they did not give one. Substantial
releases land on `.0` or `.5` (1.5, 2.0, 2.5, 3.0); small follow-ons may take
the next minor (2.1). Never invent the number.

## Step 0 — preflight

```bash
git status --porcelain          # must be clean, or the user must agree to include what's there
git branch --show-current       # expect release-X.Y, or main for a small follow-on
npm ci && npm run build         # must succeed before anything is bumped
```

If `npm run build` fails, stop and report — do not bump a version onto a
broken build.

## Step 1 — bump every version surface

All of these must move together. `appinfo.js` is the source of truth for the
JS; the native shells and the README keep their own copies by design.

| File | What changes |
|---|---|
| `src/js/core/appinfo.js` | `APP_VERSION = "X.Y.Z"` |
| `package.json` | `"version": "X.Y.Z"` |
| `android/app/build.gradle.kts` | `versionName = "X.Y.Z"` **and** `versionCode` +1 (monotonic — Play/Android reject a reused code) |
| `desktop/src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` |
| `desktop/src-tauri/Cargo.toml` | `version = "X.Y.Z"` |
| `README.md` | the `status:` line in the fenced block near the top — version **and** a short phrase naming what shipped; update `next:` if it changed |
| `public/sw.js` | `CACHE_NAME` → `rise-v<N+1>` |

Verify nothing was missed:

```bash
grep -rn "<previous version>" --include=*.js --include=*.json --include=*.kts \
  --include=*.toml --include=*.md . | grep -v CHANGELOG | grep -v roadmap
```

CHANGELOG and roadmap hits are expected — they are history and must keep the
old numbers.

### The `CACHE_NAME` rule

Bump it on **every** release, and additionally any time a file in
`PRECACHE_URLS` is added or changed. It does *not* need bumping for JS/CSS
changes alone — pass 45's Vite build emits hashed bundle filenames, so those
invalidate themselves. If this release added a new static asset under
`public/assets/`, add it to `PRECACHE_URLS` in the same edit.

## Step 2 — the docs

**`docs/CHANGELOG.md`** — add a section at the top, above the previous release,
matching the existing house style exactly:

- Heading `## vX.Y.Z — shipped`, then an italic `*Status — released as \`vX.Y.Z\`.*`
  line summarising how it was built and shipped.
- One `- **pass N — short title:**` bullet per pass, written as prose that
  explains *why* the change was made and what was rejected along the way, not
  just what changed. Read the previous entry first; the register is discursive
  and matter-of-fact, and short bullet fragments do not match it.

**`docs/roadmap.md`** — mark the release's phase `✅ done`, write the
"Passes N–M are done" paragraph, and move anything that slipped into a later
phase or `later`. Leave the "Not doing" and "Architectural Decisions" blocks
alone unless the user explicitly reopened one.

## Step 3 — commit, merge, tag

```bash
git add -A
git commit -m "release: vX.Y.Z"
git switch main && git merge --ff-only release-X.Y   # skip if already on main
git tag vX.Y.Z
git push origin main --follow-tags
```

Pushing `main` triggers `pages.yml`, which builds and deploys the live PWA.

## Step 4 — publish the GitHub Release

**This is the step that builds the binaries.** `android.yml` and `desktop.yml`
both trigger on `release: types: [published]` and attach the signed APK and the
Windows installer as release assets. A tag alone does not run them.

```bash
gh release create vX.Y.Z --title "vX.Y.Z — <short phrase>" --notes "<summary>"
```

Draft the notes from the CHANGELOG section, condensed — a short paragraph plus
the pass bullets, and the install links. Show the user the draft before
publishing; publishing is outward-facing and not easily undone.

## Step 5 — verify

```bash
gh run list --limit 5                     # pages, android and desktop all green
gh release view vX.Y.Z --json assets      # APK + Windows installer both attached
```

Then confirm the live URL serves the new version — with the Playwright MCP,
open <https://rvyyv-n.github.io/diet-tracker/>, hard-reload past the service
worker, and check Settings → About reports X.Y.Z.

Report honestly: if a workflow failed or an asset is missing, say so with the
run output rather than calling the release done.

## Notes and gotchas

- **`versionCode` is not derived from the version string.** It is a plain
  incrementing integer; look up the current one and add one.
- **There is no `Cargo.lock` in `desktop/src-tauri/`** — the version bump in
  `Cargo.toml` is the whole Rust-side change.
- **Both binaries are unsigned.** Android and Windows will warn on first
  install. That is expected and the README says so; do not "fix" it.
- **Neither binary self-updates.** The in-app check (`core/updates.js`) polls
  the GitHub releases API at most weekly and deep-links to the new download,
  which is why the Release must actually be published with its assets attached.
