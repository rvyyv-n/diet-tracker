/**
 * app.js — entry point and router.
 *
 * Two screens, no history API: the first-run profile form until the profile is
 * complete, then the daily checklist. It also nudges the plan phase forward as
 * the weeks pass — Phase 1's two-week ramp into Phase 2 — but never into Phase 3,
 * which is condition-driven and only ever set by the user (docs/plan-spec.md).
 *
 * welcome.js is loaded on demand: a returning user with a complete profile never
 * pays for the first-run screen's code.
 */

import { el } from "./ui/dom.js";
import { isAvailable } from "./core/storage.js";
import { loadProfile, saveProfile, isComplete } from "./core/profile.js";
import { defaultPhaseForWeek, phaseAddOns, normaliseAddOns } from "./core/plan.js";
import { todayISO, planWeek } from "./core/dates.js";
import { renderToday } from "./today.js";

const mount = document.getElementById("app");

function renderStorageOff() {
  mount.replaceChildren(
    el(
      "section",
      { class: "screen" },
      el("h1", { class: "screen__title" }, "Storage is off"),
      el(
        "p",
        { class: "screen__intro" },
        "This app keeps everything in your browser’s local storage, and it looks disabled — a private window, or blocked for this site. Enable it and reload.",
      ),
    ),
  );
}

/**
 * Keep currentPhaseId and the add-on list in step with the calendar. The phase
 * only moves forward, and only as far as defaultPhaseForWeek allows (1 or 2,
 * never 3 — a stall or training starting is the engine's / user's call). The
 * add-on list is the union of what the profile already has and the new phase's
 * defaults, so a week-3 advance can add A1/A2 but nothing the engine enabled
 * early is ever lost. This also backfills a profile saved before add-ons
 * existed.
 */
function syncPhase(profile) {
  const week = planWeek(profile.startDate || todayISO(), todayISO());
  const phaseId = Math.max(profile.currentPhaseId, defaultPhaseForWeek(week));
  const addOns = normaliseAddOns([...(profile.addOns ?? []), ...phaseAddOns(phaseId)]);

  const unchanged =
    phaseId === profile.currentPhaseId &&
    addOns.length === (profile.addOns ?? []).length &&
    addOns.every((id, i) => id === profile.addOns[i]);
  if (!unchanged) saveProfile({ ...profile, currentPhaseId: phaseId, addOns });
}

function route() {
  if (!isAvailable()) {
    renderStorageOff();
    return;
  }
  const profile = loadProfile();
  if (!isComplete(profile)) {
    import("./welcome.js").then((m) => m.renderWelcome(mount, { onComplete: route }));
    return;
  }
  syncPhase(profile);
  renderToday(mount);
}

route();
