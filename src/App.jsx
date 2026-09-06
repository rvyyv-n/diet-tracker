/**
 * App.jsx — entry point, router and app shell. React's first real foothold in
 * Rise (pass 45), and by its last step every screen is a real React
 * component — the vanilla per-screen renderers are gone.
 *
 * The routing shape is unchanged from the vanilla `app.js` this replaces:
 * before the profile is complete it shows the first-run form (loaded on
 * demand); after that it renders the tabbed shell — a content area plus a nav
 * (Today | Plan | Weight | Settings), a bottom tab bar on a phone and a left
 * side nav above the desktop breakpoint. `view` state stands in for what
 * `route()` used to decide imperatively, and `panes` stands in for the
 * pass-33 multi-pane list — still an array for architectural continuity
 * (phase 5 decided against ever mounting a second one in v2, but the
 * plumbing that would carry it is cheap to keep).
 *
 * Intro and Welcome are the one place `React.lazy()` is used: the vanilla
 * router loaded `intro.js` / `welcome.js` on demand so a returning user with
 * a complete profile never paid for that code, and lazy-loading the React
 * versions the same way keeps that split (see the `intro-*.js` /
 * `welcome-*.js` chunks in a production build).
 */

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { iconSvg } from "./js/ui/icons.js";
import { isAvailable } from "./js/core/storage.js";
import { snapshotInfo, restoreSnapshot } from "./js/core/backup.js";
import { markWhatsNewSeen } from "./js/core/whatsnew.js";
import { loadProfile, saveProfile, isComplete } from "./js/core/profile.js";
import { defaultPhaseForWeek, phaseAddOns, normaliseAddOns, phaseTarget } from "./js/core/plan.js";
import { todayISO, planWeek } from "./js/core/dates.js";
import { subscribe } from "./js/core/broadcast.js";
import { getDay } from "./js/core/days.js";
import { newDay, dayTotals, intakeStatus } from "./js/core/day.js";
import { allWeights } from "./js/core/weights.js";
import { formatWeight } from "./js/core/units.js";
import Today from "./Today.jsx";
import Plan from "./Plan.jsx";
import Weight from "./Weight.jsx";
import Settings from "./Settings.jsx";

const Intro = lazy(() => import("./Intro.jsx"));
const Welcome = lazy(() => import("./Welcome.jsx"));

const NUM = new Intl.NumberFormat();

/**
 * Every screen the router can mount, in nav order. A still-vanilla screen
 * carries `open`/`repaint` (rendered through the `VanillaPane` adapter); a
 * converted one carries `Component` (rendered directly). Adding a screen or
 * finishing its conversion means editing this one row — the tab bar and the
 * `?tab=` whitelist both read from it either way.
 */
const SCREENS = [
  { id: "today", label: "Today", icon: "square-check-big", Component: Today },
  { id: "plan", label: "Plan", icon: "clipboard-list", Component: Plan },
  { id: "weight", label: "Weight", icon: "trending-up", Component: Weight },
  { id: "settings", label: "Settings", icon: "sliders-horizontal", Component: Settings },
];

const screenById = (id) => SCREENS.find((s) => s.id === id) ?? null;

/**
 * The tab to open on launch. Normally "today"; a `?tab=weight` (or today /
 * settings) on the URL overrides it, which is how the manifest shortcuts and
 * any deep link land on a section. An unknown value falls back to "today".
 */
function launchTab() {
  const wanted = new URLSearchParams(location.search).get("tab");
  return screenById(wanted) ? wanted : "today";
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

/** What to show, computed fresh each time — the React stand-in for route(). */
function computeView() {
  if (!isAvailable()) return { kind: "storage-off" };
  const profile = loadProfile();
  if (!isComplete(profile)) {
    if (!profile.introSeen) return { kind: "intro" };
    // A "reset all data" leaves a one-shot undo snapshot behind (pass 17). The
    // reset drops the user back here to first-run, so the undo has to be
    // offered on the welcome screen, not just in Settings.
    const snap = snapshotInfo();
    return { kind: "welcome", edit: false, canUndoReset: snap?.reason === "reset" };
  }
  syncPhase(profile);
  return { kind: "shell", panes: [launchTab()] };
}

export default function App() {
  const mountRef = useRef(document.getElementById("app"));
  const [view, setView] = useState(computeView);

  const goRoute = useCallback(() => setView(computeView()), []);
  const openEditSetup = useCallback(() => setView({ kind: "welcome", edit: true }), []);

  // Mark the shell as carrying the nav, or not. Above the desktop breakpoint
  // the nav is a fixed left column, so the shell reserves a gutter for it —
  // but only when it is actually there. The intro, the setup form and the
  // storage-off notice have no nav and keep the plain centred column.
  useEffect(() => {
    mountRef.current.classList.toggle("app-shell--tabbed", view.kind === "shell");
  }, [view.kind]);

  if (view.kind === "storage-off") return <StorageOff />;
  if (view.kind === "intro") {
    return (
      <Suspense fallback={null}>
        <Intro
          onDone={() => {
            saveProfile({ ...loadProfile(), introSeen: true });
            goRoute();
          }}
        />
      </Suspense>
    );
  }
  if (view.kind === "welcome") {
    return (
      <Suspense fallback={null}>
        <Welcome
          edit={view.edit}
          undoReset={
            view.canUndoReset
              ? () => {
                  restoreSnapshot();
                  goRoute();
                }
              : null
          }
          onComplete={() => {
            if (view.edit) {
              // Editing is launched from Settings, so return there — not to
              // Today, which is where a full route() would land. Re-sync the
              // phase in case the target rate or start date moved.
              syncPhase(loadProfile());
              setView({ kind: "shell", panes: ["settings"] });
            } else {
              // A profile completing setup for the first time here has no
              // "before" to compare v2 against — mark it exempt rather than
              // ever showing the What's New card.
              markWhatsNewSeen();
              goRoute();
            }
          }}
        />
      </Suspense>
    );
  }

  return (
    <Shell
      panes={view.panes}
      onNavigate={(id) => setView((v) => ({ ...v, panes: [id] }))}
      onEditSetup={openEditSetup}
      onReset={goRoute}
    />
  );
}

function StorageOff() {
  return (
    <section className="screen">
      <h1 className="screen__title">Storage is off</h1>
      <p className="screen__intro">
        This app keeps everything in your browser’s local storage, and it looks disabled — a private window, or
        blocked for this site. Enable it and reload.
      </p>
    </section>
  );
}

/** The tabbed shell: the content column plus the nav (bottom bar / side rail). */
function Shell({ panes, onNavigate, onEditSetup, onReset }) {
  // Broadcast (core/broadcast.js) fires when any pane repaints from fresh
  // data; the nav glance reads the same day/weight records the screens do, so
  // it goes stale on the same events. Bumping this forces Shell to re-render,
  // which recomputes navGlance() fresh — there's no persistent glance node to
  // patch in place the way the vanilla paintTabbar() did.
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);

  return (
    <>
      <div className="app-content">
        {panes.map((id) => {
          const screen = screenById(id);
          return screen.Component ? (
            <screen.Component key={id} onEditSetup={onEditSetup} onReset={onReset} />
          ) : (
            <VanillaPane key={id} screen={screen} />
          );
        })}
      </div>
      <Tabbar panes={panes} onNavigate={onNavigate} />
    </>
  );
}

/**
 * Mounts one still-vanilla screen into a plain div and keeps it repainted.
 * React's own remount-on-new-key behaviour stands in for the old `setPanes()`
 * diff: a pane whose key persists across a render is left alone (matching
 * "moved, not re-rendered"), and a pane with a brand new key mounts fresh —
 * which is also the right moment to fire the entry crossfade, so it runs from
 * this effect instead of a separate `crossfade()` call.
 */
function VanillaPane({ screen }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el.classList.remove("tab-switching");
    void el.offsetWidth;
    el.classList.add("tab-switching");
    screen.open(el);

    // A screen has repainted itself, so this one may now be showing stale
    // numbers. `fresh` is the set of ids that already caught up.
    return subscribe((fresh) => {
      if (!fresh.has(screen.id)) screen.repaint();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.id]);

  return <div className="pane" data-screen={screen.id} ref={ref} />;
}

/**
 * The desktop side nav's foot: today's intake against target, how much of the
 * plan is left, and the latest weigh-in. Hidden at phone widths by CSS (see
 * `.tabbar__glance`); recomputed on every Shell render, which is what keeps it
 * from showing a stale total after a broadcast.
 */
function NavGlance() {
  const profile = loadProfile();
  if (!isComplete(profile)) return null;

  const today = todayISO();
  const day = getDay(today) ?? newDay(today, profile.currentPhaseId, profile.addOns);
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId).kcal;
  const left = Math.max(0, totals.total - totals.planDone);
  const latest = allWeights().at(-1) ?? null;

  return (
    <div className="tabbar__glance">
      <span className="group__label">
        <Icon name="gauge" size={14} className="group__label-icon" />
        Today
      </span>
      <div className="tabbar__glance-row">
        <span className="tabbar__glance-key">Intake</span>
        <span className={`tabbar__glance-val is-${intakeStatus(day)}`}>
          {NUM.format(totals.kcal)}
          {target ? ` / ${NUM.format(target)}` : ""}
        </span>
      </div>
      <div className="tabbar__glance-row">
        <span className="tabbar__glance-key">Blocks left</span>
        <span className="tabbar__glance-val">{left === 0 ? "None" : `${left}`}</span>
      </div>
      {latest ? (
        <div className="tabbar__glance-row">
          <span className="tabbar__glance-key">Weight</span>
          <span className="tabbar__glance-val">{formatWeight(latest.kg, profile.weightUnit || "kg")}</span>
        </div>
      ) : null}
    </div>
  );
}

function Tabbar({ panes, onNavigate }) {
  const select = (id) => {
    if (panes.length === 1 && panes[0] === id) return;
    onNavigate(id);
  };

  return (
    <nav className="tabbar tabbar--icons" aria-label="Sections">
      {/* Shown only by the desktop side nav (see .tabbar__brand); on a phone
          the bar is four icons edge to edge and has no room for a title. It
          is a button, not a span: a wordmark at the top of a nav reads as
          "home", and Today is this app's home. */}
      <button type="button" className="tabbar__brand" onClick={() => select("today")}>
        Rise
      </button>
      {SCREENS.map((screen) => {
        // "Current" is membership now, not equality — a multi-pane layout
        // could legitimately show more than one nav item as active.
        const current = panes.includes(screen.id);
        return (
          <button
            key={screen.id}
            type="button"
            className={`tabbar__btn${current ? " is-active" : ""}`}
            aria-current={current ? "page" : undefined}
            onClick={() => select(screen.id)}
          >
            <Icon name={screen.icon} className="tabbar__icon" />
            <span className="tabbar__label">{screen.label}</span>
          </button>
        );
      })}
      <NavGlance />
    </nav>
  );
}

/**
 * A Lucide glyph as JSX. `ui/icons.js`'s own `icon()` hands back a detached
 * DOM `<svg>` node — the right shape for the vanilla `el()` tree it was
 * written for, but not something React can render as a child (it isn't a
 * React element). `iconSvg()` returns the same markup as a string instead,
 * which `dangerouslySetInnerHTML` can seat directly — same DOM shape either
 * way, just built through React's own path.
 *
 * `className` decides what box (if any) this renders. Pass one when the icon
 * itself is the sized element (`tabbar__icon`, `group__label-icon` — a real
 * span carrying that class, containing the svg, same as the vanilla
 * `el("span", {class}, icon(...))` it replaces). Omit it when the caller
 * already renders its own sizing wrapper around the icon (`set2-row__icon`
 * and friends expect the `<svg>` as their own direct flex item, sized via
 * `<wrapper> svg { width/height: 100% }`) — `display: contents` keeps this
 * component from adding a second, unsized box in between.
 */
function Icon({ name, size, stroke, className }) {
  const html = { __html: iconSvg(name, { size, stroke }) };
  if (className) return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={html} />;
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={html} />;
}
