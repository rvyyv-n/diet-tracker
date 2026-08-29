/**
 * app.js — entry point, router and app shell.
 *
 * Before the profile is complete it shows the first-run form (loaded on demand).
 * After that it renders a shell — a content area plus a bottom tab bar (Today |
 * Weight) — and swaps the content when a tab is tapped. No history API; the
 * active tab is module state and resets to Today on a fresh route().
 *
 * It also keeps the plan phase and add-on list in step with the calendar — see
 * syncPhase().
 */

import { el } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { isAvailable } from "./core/storage.js";
import { loadProfile, saveProfile, isComplete } from "./core/profile.js";
import { defaultPhaseForWeek, phaseAddOns, normaliseAddOns } from "./core/plan.js";
import { todayISO, planWeek } from "./core/dates.js";
import { renderToday } from "./today.js";
import { renderWeight } from "./weight.js";
import { renderSettings } from "./settings.js";

const mount = document.getElementById("app");

const TABS = [
  { id: "today", label: "Today", icon: "square-check-big" },
  { id: "weight", label: "Weight", icon: "trending-up" },
  { id: "settings", label: "Settings", icon: "sliders-horizontal" },
];

let activeTab = "today";
let contentEl = null;
let tabbarEl = null;

// --- routing -------------------------------------------------------------

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
  activeTab = "today";
  renderShell();
}

function editSetup() {
  import("./welcome.js").then((m) =>
    m.renderWelcome(mount, { onComplete: route, edit: true }),
  );
}

// --- shell --------------------------------------------------------------

function renderShell() {
  contentEl = el("div", { class: "app-content" });
  tabbarEl = el("nav", { class: "tabbar tabbar--icons", "aria-label": "Sections" });
  mount.replaceChildren(contentEl, tabbarEl);
  paintTabbar();
  showTab(activeTab);
}

function paintTabbar() {
  tabbarEl.replaceChildren(
    ...TABS.map((tab) => {
      const current = tab.id === activeTab;
      return el(
        "button",
        {
          class: `tabbar__btn${current ? " is-active" : ""}`,
          type: "button",
          "aria-current": current ? "page" : null,
          onclick: () => {
            if (tab.id === activeTab) return;
            activeTab = tab.id;
            paintTabbar();
            showTab(activeTab);
          },
        },
        el("span", { class: "tabbar__icon", "aria-hidden": "true" }, icon(tab.icon)),
        el("span", { class: "tabbar__label" }, tab.label),
      );
    }),
  );
}

function showTab(id) {
  if (id === "weight") renderWeight(contentEl);
  else if (id === "settings") renderSettings(contentEl, { onEditSetup: editSetup, onReset: route });
  else renderToday(contentEl);
}

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

// --- plan upkeep ------------------------------------------------------

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

route();
