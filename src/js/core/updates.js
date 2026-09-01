/**
 * updates.js — the update check (pass 12).
 *
 * The browser PWA updates itself: the service worker calls skipWaiting() /
 * clients.claim(), so a CACHE_NAME bump reaches an installed copy on the next
 * load. The Android APK and the Windows installer do not — both ship as "a
 * fresh file per release". This module checks GitHub for the latest release
 * and, when it is newer than this build, surfaces one line in Settings → About
 * with a link straight to the right download (the roadmap's "deep-link floor").
 * There is no in-place install here; that is a later, per-platform add.
 *
 * Honesty about the network: this is the app's first and only outbound request.
 * It is an unauthenticated GET to the public GitHub API — no token, no
 * identifier, no body. GitHub sees an IP, as it would for any download. Nothing
 * about "local-first, offline, no accounts" changes except that "no network at
 * all" is no longer literally true, which the About row and the README say.
 *
 * A failed check is silent. Offline is this app's normal case and a network
 * error is not something the user did wrong: no error banner, no retry loop,
 * and `lastCheckedAt` is left unmoved so the next launch simply tries again.
 *
 * State lives in its own `wgt:update` record — device state, not user data —
 * so core/backup.js deliberately does NOT bundle it in an export.
 */

import { load, save } from "./storage.js";
import { APP_VERSION, REPO } from "./appinfo.js";
import { isNewer } from "./version.js";

const RECORD = "update";
const CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // at most once a week
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

/** Which packaged build is running — each has its own update route. */
export function detectBuild() {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) return "windows";
  if (typeof location !== "undefined" && location.hostname === "rise.local") return "android";
  return "web";
}

function readState() {
  return load(RECORD, { lastCheckedAt: null, latestSeen: null, downloadUrl: null, releaseUrl: null });
}

/**
 * The current view for the UI, derived from the stored record alone (no
 * network). `kind` is:
 *   "unknown"   — never checked
 *   "current"   — checked, this build is the latest
 *   "available" — a newer release exists; carries version + links
 */
export function updateStatus(state = readState()) {
  if (!state.lastCheckedAt) return { kind: "unknown" };
  if (state.latestSeen && isNewer(state.latestSeen, APP_VERSION)) {
    return {
      kind: "available",
      version: state.latestSeen,
      downloadUrl: state.downloadUrl ?? null,
      releaseUrl: state.releaseUrl ?? null,
    };
  }
  return { kind: "current", checkedAt: state.lastCheckedAt };
}

/** The release asset matching this build, or null. Names are matched loosely. */
function pickAssetUrl(assets, build) {
  const list = Array.isArray(assets) ? assets : [];
  const byName = (test) =>
    list.find((a) => test(String(a?.name ?? "").toLowerCase()))?.browser_download_url ?? null;
  if (build === "android") return byName((n) => n.endsWith(".apk"));
  if (build === "windows") return byName((n) => n.endsWith("-setup.exe") || n.endsWith(".exe"));
  return null; // web: nothing to download, the service worker handles it
}

/**
 * Check GitHub for the latest release. Self-throttles to CHECK_INTERVAL_MS
 * unless `force` is set (the manual "Check for updates" tap). Returns
 * `{ ok, status }` — `ok` is false on a network failure, `status` is the
 * updateStatus() view either way. Never throws.
 */
export async function checkForUpdate({ force = false } = {}) {
  const state = readState();
  const now = Date.now();

  if (!force && state.lastCheckedAt && now - state.lastCheckedAt < CHECK_INTERVAL_MS) {
    return { ok: true, status: updateStatus(state) };
  }

  let release;
  try {
    const res = await fetch(LATEST_RELEASE_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    release = await res.json();
  } catch {
    // Silent. Leave lastCheckedAt unmoved so the next launch retries.
    return { ok: false, status: updateStatus(state) };
  }

  const tag = String(release?.tag_name ?? "").trim();
  const next = {
    lastCheckedAt: now,
    latestSeen: tag || state.latestSeen,
    downloadUrl: pickAssetUrl(release?.assets, detectBuild()),
    releaseUrl: release?.html_url ?? null,
  };
  save(RECORD, next);
  return { ok: true, status: updateStatus(next) };
}

/**
 * Fire-and-forget automatic check, for app.js to call once per load alongside
 * requestPersistence(). Off the first-render path, self-throttled, and every
 * error swallowed.
 */
export function autoCheckForUpdate() {
  Promise.resolve()
    .then(() => checkForUpdate())
    .catch(() => {});
}
