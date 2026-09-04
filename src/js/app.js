/**
 * app.js — entry point, router and app shell.
 *
 * Before the profile is complete it shows the first-run form (loaded on demand).
 * After that it renders a shell — a content area plus a nav (Today | Plan |
 * Weight | Settings), a bottom tab bar on a phone and a left side nav above the
 * desktop breakpoint. No history API; the visible screens are module
 * state and reset to Today on a fresh route(), unless the launch URL carries a
 * `?tab=` (the manifest shortcuts land that way).
 *
 * Pass 33 replaced the single `activeTab` with a list of mounted **panes**.
 * Nothing on screen changed — the phone still mounts exactly one — but the
 * routing model can now hold several screens at once, which is what the desktop
 * layout needs and is not something CSS can be asked to fake. Three pieces make
 * that work, and each was a real gap rather than a rename:
 *
 *   1. `setPanes()` diffs the requested ids against what is already up, so a
 *      pane that survives a layout change is *moved*, not re-rendered. Every
 *      screen keeps its view state (Today's viewed day, an open picker) in
 *      module scope and resets it on `render*()` entry, so re-entering a
 *      surviving pane would silently throw that away.
 *   2. Each pane gets its own element. The screens all render by calling
 *      `replaceChildren` on the node they were handed, so sharing one content
 *      element would have them overwrite each other.
 *   3. Panes repaint each other through core/broadcast.js. With one screen on
 *      display, reopening it was enough to pick up a change; side by side, a
 *      block ticked on Today has to move Weight's adherence readout now.
 *
 * Pass 35 turned the bar into that side nav, and deliberately did *not* mount a
 * second pane to do it: at 1024px two panes leave each screen about 450px wide,
 * narrower than the phone they were designed for. The desktop layout is
 * therefore pure CSS over one pane, and a nav tap still swaps that pane. The
 * multi-pane machinery stays exactly as pass 33 left it, waiting for --bp-wide.
 *
 * It also keeps the plan phase and add-on list in step with the calendar — see
 * syncPhase().
 */

import { el } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { isAvailable } from "./core/storage.js";
import { requestPersistence } from "./core/persist.js";
import { autoCheckForUpdate } from "./core/updates.js";
import { initTheme } from "./core/theme.js";
import { snapshotInfo, restoreSnapshot } from "./core/backup.js";
import { loadProfile, saveProfile, isComplete } from "./core/profile.js";
import { defaultPhaseForWeek, phaseAddOns, normaliseAddOns } from "./core/plan.js";
import { todayISO, planWeek } from "./core/dates.js";
import { subscribe } from "./core/broadcast.js";
import { renderToday, repaintToday } from "./today.js";
import { renderPlan, repaintPlan } from "./plan-view.js";
import { renderWeight, repaintWeight } from "./weight.js";
import { renderSettings, repaintSettings } from "./settings.js";

const mount = document.getElementById("app");

/**
 * Mark the shell as carrying the nav, or not. Above the desktop breakpoint the
 * nav is a fixed left column, so the shell has to reserve a gutter for it — but
 * only when it is actually there. The first-run intro, the setup form and the
 * storage-off notice have no nav and keep the plain centred column.
 */
function setTabbedShell(on) {
  mount.classList.toggle("app-shell--tabbed", on);
}

/**
 * Every screen the router can mount, in nav order. `open` renders a screen
 * fresh into a pane; `repaint` refreshes one that is already up without
 * resetting its view state. Adding a screen means adding a row here — the tab
 * bar, the `?tab=` whitelist and setPanes() all read from it.
 */
const SCREENS = [
  {
    id: "today",
    label: "Today",
    icon: "square-check-big",
    open: (paneEl) => renderToday(paneEl),
    repaint: repaintToday,
  },
  {
    id: "plan",
    label: "Plan",
    icon: "clipboard-list",
    open: (paneEl) => renderPlan(paneEl),
    repaint: repaintPlan,
  },
  {
    id: "weight",
    label: "Weight",
    icon: "trending-up",
    open: (paneEl) => renderWeight(paneEl),
    repaint: repaintWeight,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "sliders-horizontal",
    open: (paneEl) => renderSettings(paneEl, { onEditSetup: editSetup, onReset: route }),
    repaint: repaintSettings,
  },
];

const screenById = (id) => SCREENS.find((s) => s.id === id) ?? null;

// The screens on display, in order. Every layout that ships today asks for
// exactly one, including desktop; a three-panel --bp-wide layout would be the
// first real caller for more.
let panes = [];
// id -> the element that screen is rendered into. Its keys mirror `panes`, and
// its values are what lets a pane survive a layout change without re-rendering.
const mounted = new Map();
let contentEl = null;
let tabbarEl = null;

/**
 * The tab to open on launch. Normally "today"; a `?tab=weight` (or today /
 * settings) on the URL overrides it, which is how the manifest shortcuts and
 * any deep link land on a section. An unknown value falls back to "today".
 */
function launchTab() {
  const wanted = new URLSearchParams(location.search).get("tab");
  return screenById(wanted) ? wanted : "today";
}

// --- routing -------------------------------------------------------------

function route() {
  setTabbedShell(false);
  if (!isAvailable()) {
    renderStorageOff();
    return;
  }
  const profile = loadProfile();
  if (!isComplete(profile)) {
    if (!profile.introSeen) {
      import("./intro.js").then((m) =>
        m.renderIntro(mount, {
          onDone: () => {
            saveProfile({ ...loadProfile(), introSeen: true });
            route();
          },
        }),
      );
      return;
    }
    // A "reset all data" leaves a one-shot undo snapshot behind (pass 17). The
    // reset drops the user back here to first-run, so the undo has to be
    // offered on the welcome screen, not just in Settings.
    const snap = snapshotInfo();
    const undoReset =
      snap && snap.reason === "reset"
        ? () => {
            restoreSnapshot();
            route();
          }
        : null;
    import("./welcome.js").then((m) => m.renderWelcome(mount, { onComplete: route, undoReset }));
    return;
  }
  syncPhase(profile);
  renderShell([launchTab()]);
}

function editSetup() {
  setTabbedShell(false);
  import("./welcome.js").then((m) =>
    m.renderWelcome(mount, {
      // Editing is launched from Settings, so return there — not to Today, which
      // is where a full route() would land. Re-sync the phase in case the target
      // rate or start date moved.
      onComplete: () => {
        syncPhase(loadProfile());
        renderShell(["settings"]);
      },
      edit: true,
    }),
  );
}

// --- shell --------------------------------------------------------------

function renderShell(startPanes) {
  contentEl = el("div", { class: "app-content" });
  tabbarEl = el("nav", { class: "tabbar tabbar--icons", "aria-label": "Sections" });
  mount.replaceChildren(contentEl, tabbarEl);
  setTabbedShell(true);
  // The old shell's panes went with its DOM; forget them so setPanes() treats
  // everything as an arrival rather than re-inserting a detached element.
  mounted.clear();
  panes = [];
  setPanes(startPanes);
}

/**
 * Put exactly `ids` on display. Panes already up are kept and reordered, panes
 * that left are dropped, and only genuine arrivals are rendered. That asymmetry
 * is the point of the whole pass — see the pane note in the file header.
 *
 * An empty or entirely unknown list is ignored rather than blanking the app.
 */
function setPanes(ids) {
  const next = ids.filter((id) => screenById(id));
  if (!next.length) return;

  for (const [id, paneEl] of mounted) {
    if (!next.includes(id)) {
      paneEl.remove();
      mounted.delete(id);
    }
  }

  const arriving = [];
  const ordered = next.map((id) => {
    let paneEl = mounted.get(id);
    if (!paneEl) {
      paneEl = el("div", { class: "pane", "data-screen": id });
      mounted.set(id, paneEl);
      arriving.push(id);
    }
    return paneEl;
  });

  contentEl.replaceChildren(...ordered);
  panes = next;
  paintTabbar();

  // Render after insertion, so a screen that measures itself sees a laid-out
  // node rather than a detached one.
  arriving.forEach((id) => {
    const paneEl = mounted.get(id);
    crossfade(paneEl);
    screenById(id).open(paneEl);
  });
}

/** Re-trigger the entry crossfade: drop the class, force a reflow, add it back. */
function crossfade(paneEl) {
  paneEl.classList.remove("tab-switching");
  void paneEl.offsetWidth;
  paneEl.classList.add("tab-switching");
}

/**
 * A screen has repainted itself, so the others may now be showing stale
 * numbers. `fresh` is the set of ids that already caught up; everything else on
 * display is repainted in place. With one pane up this does nothing at all,
 * which is the phone's entire experience of pass 33.
 */
subscribe((fresh) => {
  for (const id of mounted.keys()) {
    if (!fresh.has(id)) screenById(id).repaint();
  }
});

function paintTabbar() {
  tabbarEl.replaceChildren(
    // Shown only by the desktop side nav (see .tabbar__brand); on a phone the
    // bar is four icons edge to edge and has no room for a title.
    el("span", { class: "tabbar__brand" }, "Rise"),
    ...SCREENS.map((screen) => {
      // "Current" is membership now, not equality — in a multi-pane layout more
      // than one nav item is legitimately on screen.
      const current = panes.includes(screen.id);
      return el(
        "button",
        {
          class: `tabbar__btn${current ? " is-active" : ""}`,
          type: "button",
          "aria-current": current ? "page" : null,
          onclick: () => {
            if (panes.length === 1 && panes[0] === screen.id) return;
            setPanes([screen.id]);
          },
        },
        el("span", { class: "tabbar__icon", "aria-hidden": "true" }, icon(screen.icon)),
        el("span", { class: "tabbar__label" }, screen.label),
      );
    }),
  );
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

// Re-apply the stored theme (index.html already set it pre-paint for a pinned
// choice) and start following the OS while the pref is "system".
initTheme();

route();

// Ask the OS to mark our storage durable so it isn't evicted under pressure.
// Fire-and-forget: idempotent, best-effort, and never blocks the first render.
requestPersistence();

// Check GitHub for a newer release, at most once every 7 days. Fire-and-forget,
// silent on failure, and off the first-render path — same shape as above.
autoCheckForUpdate();
