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
import { defaultPhaseForWeek } from "./core/plan.js";
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
 * Move currentPhaseId up to match the calendar if the weeks have advanced.
 * Forward only, and only as far as defaultPhaseForWeek returns — which is 1 or
 * 2, never 3. A stall or the start of training moves someone to Phase 3, and
 * that is the user's call in a later pass, not this function's.
 */
function syncPhase(profile) {
  const due = defaultPhaseForWeek(planWeek(profile.startDate || todayISO(), todayISO()));
  if (due > profile.currentPhaseId) {
    saveProfile({ ...profile, currentPhaseId: due });
  }
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
