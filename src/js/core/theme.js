/**
 * theme.js — applies the light / dark / system choice (pass 19).
 *
 * tokens.css does the real work: `prefers-color-scheme` drives the palette, and
 * a `[data-theme]` attribute on <html> overrides it when the user has pinned a
 * theme in Settings. This module is the thin controller around that attribute:
 *
 *   - `initTheme()`   — on boot, apply the stored pref and follow the OS while
 *                       the pref is "system".
 *   - `setThemePref()`— persist a new choice from the Settings toggle and apply
 *                       it with a short cross-fade.
 *
 * The pref lives on the profile (`profile.themePref`), so it travels with an
 * export/import like every other setting. index.html sets `data-theme` before
 * first paint from the same stored value to avoid a flash; everything here is
 * idempotent with that.
 */

import { loadProfile, saveProfile } from "./profile.js";

export const THEME_PREFS = ["system", "light", "dark"];

// Kept in step with the <meta name="theme-color"> pair in index.html and the
// --night-canvas / --cream-50 tokens.
const META_LIGHT = "#FAF9F5";
const META_DARK = "#181715";

const darkMedia = () => window.matchMedia("(prefers-color-scheme: dark)");
const motionOK = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function currentPref() {
  const p = loadProfile().themePref;
  return THEME_PREFS.includes(p) ? p : "system";
}

/**
 * A pinned theme adds a media-less <meta name="theme-color"> that outranks the
 * per-scheme pair in index.html; "system" removes it so the pair governs again.
 */
function syncMeta(pref) {
  const existing = document.getElementById("tc-forced");
  if (pref === "light" || pref === "dark") {
    const meta = existing || document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("id", "tc-forced");
    meta.setAttribute("content", pref === "dark" ? META_DARK : META_LIGHT);
    if (!existing) document.head.appendChild(meta);
  } else if (existing) {
    existing.remove();
  }
}

/** Ease every colour on the page together for one --duration-base. */
function crossfade() {
  if (!motionOK()) return;
  const root = document.documentElement;
  root.classList.add("theme-fading");
  window.setTimeout(() => root.classList.remove("theme-fading"), 260);
}

/** Point <html> and the status-bar colour at `pref`. No animation. */
export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === "light" || pref === "dark") root.setAttribute("data-theme", pref);
  else root.removeAttribute("data-theme");
  syncMeta(pref);
}

/** Boot: apply the stored pref, then track the OS while the pref is "system". */
export function initTheme() {
  applyTheme(currentPref());
  darkMedia().addEventListener?.("change", () => {
    if (currentPref() === "system") crossfade(); // the palette follows via CSS
  });
}

/** Persist and apply a new pref from the Settings toggle, with a cross-fade. */
export function setThemePref(pref) {
  const next = THEME_PREFS.includes(pref) ? pref : "system";
  saveProfile({ ...loadProfile(), themePref: next });
  crossfade();
  applyTheme(next);
  return next;
}
