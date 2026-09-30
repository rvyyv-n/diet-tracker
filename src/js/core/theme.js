/**
 * theme.js — applies the Look and the light / dark / system choice.
 *
 * Two attributes on <html> drive every token in tokens.css:
 *
 *   data-look="paper|reel"     which Look (profile.lookPref, default paper)
 *   data-theme="light|dark"    always resolved here, never left to a media query
 *
 * "System" is a preference, not a value the CSS knows: it is resolved in JS
 * from `prefers-color-scheme` and written as a concrete data-theme, so the
 * stylesheet holds one dark block per Look and no duplicate in a media query.
 * This module also keeps the single <meta name="theme-color"> in step, since
 * the status-bar colour follows the Look as well as the theme.
 *
 * Both prefs live on the profile, so they travel with an export/import like
 * every other setting. index.html sets the attributes before first paint from
 * the same stored values to avoid a flash; it repeats the small resolution
 * below because the ES modules load later. Keep the two in step.
 *
 *   - `initTheme()`     — on boot, apply the stored prefs and follow the OS
 *                         while the theme pref is "system".
 *   - `setThemePref()`  — persist a new theme choice and apply it.
 *   - `setLookPref()`   — persist a new Look and apply it.
 */

import { loadProfile, saveProfile } from "./profile.js";

export const THEME_PREFS = ["system", "light", "dark"];
export const LOOKS = ["paper", "reel"];
export const DEFAULT_LOOK = "paper";

// <meta name="theme-color"> per Look and theme: each one's page canvas
// (--bg-canvas). These have to be literal hex, which is why theme.js is the one
// place the literals ratchet allows them.
export const META_COLORS = {
  paper: { light: "#F7F1E8", dark: "#0B0A09" },
  reel: { light: "#F3EDE3", dark: "#0E0D0B" },
};

const darkMedia = () => window.matchMedia("(prefers-color-scheme: dark)");
const motionOK = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The concrete theme for a pref. "System" (or anything unknown) follows the OS. */
export function resolveTheme(pref, systemDark) {
  if (pref === "light" || pref === "dark") return pref;
  return systemDark ? "dark" : "light";
}

/** The Look for a stored pref; an unknown or missing value is Paper. */
export function resolveLook(pref) {
  return LOOKS.includes(pref) ? pref : DEFAULT_LOOK;
}

/** Everything the document needs for a profile: both attributes and the status-bar colour. */
export function resolveAppearance(profile, systemDark) {
  const look = resolveLook(profile.lookPref);
  const theme = resolveTheme(profile.themePref, systemDark);
  return { look, theme, color: META_COLORS[look][theme] };
}

function currentPref() {
  const p = loadProfile().themePref;
  return THEME_PREFS.includes(p) ? p : "system";
}

/** Ease every colour on the page together for one --dur-base. */
function crossfade() {
  if (!motionOK()) return;
  const root = document.documentElement;
  root.classList.add("theme-fading");
  window.setTimeout(() => root.classList.remove("theme-fading"), 260);
}

/** Point <html> and the status-bar colour at the stored prefs. No animation. */
export function applyAppearance() {
  const { look, theme, color } = resolveAppearance(loadProfile(), darkMedia().matches);
  const root = document.documentElement;
  root.setAttribute("data-look", look);
  root.setAttribute("data-theme", theme);
  document.getElementById("tc")?.setAttribute("content", color);
}

/** Boot: apply the stored prefs, then track the OS while the theme pref is "system". */
export function initTheme() {
  applyAppearance();
  darkMedia().addEventListener?.("change", () => {
    if (currentPref() === "system") {
      crossfade();
      applyAppearance();
    }
  });
}

/** Persist and apply a new theme pref from the Settings toggle, with a cross-fade. */
export function setThemePref(pref) {
  const next = THEME_PREFS.includes(pref) ? pref : "system";
  saveProfile({ ...loadProfile(), themePref: next });
  crossfade();
  applyAppearance();
  return next;
}

/** Persist and apply a new Look, with a cross-fade. */
export function setLookPref(pref) {
  const next = resolveLook(pref);
  saveProfile({ ...loadProfile(), lookPref: next });
  crossfade();
  applyAppearance();
  return next;
}
