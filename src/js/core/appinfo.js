/**
 * appinfo.js — the single source of truth for the app's version and repo.
 *
 * APP_VERSION is written here and nowhere else in the JS (settings.js and the
 * update check both import it). The native shells keep their own copies —
 * android/app/build.gradle.kts and desktop/src-tauri/tauri.conf.json — and the
 * README states it too; a release bumps all of them together.
 */

export const APP_VERSION = "1.0.0";

export const REPO = "rvyyv-n/diet-tracker";
export const REPO_URL = `https://github.com/${REPO}`;
