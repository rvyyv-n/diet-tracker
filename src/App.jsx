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

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { isAvailable, onWriteFailure } from "./js/core/storage.js";
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
import Recipes from "./Recipes.jsx";
import { Segmented } from "./components/core.jsx";
import { PhoneNav, SideNav } from "./components/nav.jsx";
import { Banner } from "./components/surfaces.jsx";
import { downloadBackup } from "./js/ui/download.js";

const Intro = lazy(() => import("./Intro.jsx"));
const Welcome = lazy(() => import("./Welcome.jsx"));

const NUM = new Intl.NumberFormat("en-US");

/**
 * Every screen the router can mount, in nav order. A still-vanilla screen
 * carries `open`/`repaint` (rendered through the `VanillaPane` adapter); a
 * converted one carries `Component` (rendered directly). Adding a screen or
 * finishing its conversion means editing this one row — the nav and the
 * `?tab=` whitelist both read from it either way.
 */
const SCREENS = [
  { id: "today", label: "Today", icon: "today", Component: Today },
  { id: "plan", label: "Plan", icon: "plan", Component: Plan },
  { id: "weight", label: "Weight", icon: "weight", Component: Weight },
  // The side nav has room for a fifth item (pass 51); the phone pill stays
  // four tabs, so `wideOnlyTab` keeps Recipes out of it. The screen itself
  // opens at any width (pass 48): a phone reaches it from the row at the foot
  // of Plan, and `tabParent` lights Plan's tab while it's open. Sits above
  // Settings so Settings stays the last item in the side nav.
  {
    id: "recipes",
    label: "Recipes",
    icon: "recipes",
    Component: Recipes,
    wideOnlyTab: true,
    tabParent: "plan",
  },
  { id: "settings", label: "Settings", icon: "settings", Component: Settings },
];

const screenById = (id) => SCREENS.find((s) => s.id === id) ?? null;

/**
 * The tab to open on launch. Normally "today"; a `?tab=weight` (or today /
 * plan / settings / recipes) on the URL overrides it, which is how the
 * manifest shortcuts and any deep link land on a section. An unknown value
 * falls back to "today".
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
  if (unchanged) return;
  const moved = phaseId !== profile.currentPhaseId;
  const phaseChange = moved
    ? { from: profile.currentPhaseId, to: phaseId, on: todayISO() }
    : profile.phaseChange;
  saveProfile({ ...profile, currentPhaseId: phaseId, addOns, phaseChange });
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
  // Stable, like the two beside it, so Shell's memoised pane tree survives a
  // re-render; screens get it too now (Plan links to Recipes, pass 48).
  const navigate = useCallback((id) => setView((v) => ({ ...v, panes: [id] })), []);
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
        {/* Here too: a corrupt profile lands on setup, and should say why. */}
        <WriteFailureNotice />
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
        {/* Here too: a corrupt profile lands on setup, and should say why. */}
        <WriteFailureNotice />
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
    <Shell panes={view.panes} onNavigate={navigate} onEditSetup={openEditSetup} onReset={goRoute} />
  );
}

function StorageOff() {
  return (
    <section className="screen">
      <h1 className="screen__title">Storage is off</h1>
      <p className="screen__intro">
        This app keeps everything in your browser’s local storage, and it looks disabled — a private
        window, or blocked for this site. Enable it and reload.
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
  // patch in place the way the vanilla paintTabbar() did. The nav's own
  // pinned/hover toggle (pass 47) reuses this same counter rather than a
  // second one — flipping it is just another profile write Shell needs to
  // notice.
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);

  // A different screen opens at its top (pass 48). The document is the
  // scroller, so switching tabs used to land the new screen at whatever depth
  // the old one was left at, and Plan's foot link to Recipes opened it
  // hundreds of pixels down.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [panes]);

  const profile = loadProfile();
  const navPref = profile.navPref === "hover" ? "hover" : "visible";

  // `.app-shell--nav-hover` drives the collapsed-rail CSS (app.css, pass 47).
  // It lives on the same #app element `.app-shell--tabbed` does, toggled here
  // rather than in App()'s effect because navPref can change without view.kind
  // ever changing — a tap on the toggle below never leaves the "shell" view.
  useEffect(() => {
    document.getElementById("app")?.classList.toggle("app-shell--nav-hover", navPref === "hover");
  }, [navPref]);

  function setNavPref(next) {
    if (next === navPref) return;
    saveProfile({ ...profile, navPref: next });
    bump((n) => n + 1);
  }

  // Memoized on identity, not recomputed by the `bump` above: every screen
  // publishes on its own render with no dependency array (see Today.jsx),
  // and each publish flows straight back here and bumps this same counter.
  // Without this memo, that bump re-renders the pane subtree too, which
  // re-fires the very publish that caused it — a self-sustaining loop with
  // nothing about it that depends on user input to keep going once started.
  // The vanilla broadcast.js this is ported from relied on a subscriber's
  // reaction being *synchronous* (a sibling's render() call, straight down
  // the call stack) so the "a publish raised while the queue drains is
  // dropped" guard could catch the bounce-back; a React state update is
  // deferred to its own commit, which lands after that guard has already
  // reset, so the loop gets through. Handing React back the exact same
  // element tree (`panes`/`onEditSetup`/`onReset` are all stable across a
  // bump-only re-render) lets it bail out of reconciling this subtree
  // entirely, so a bump only ever repaints the nav — which is all it was
  // ever meant to do.
  const appContent = useMemo(
    () => (
      <div className="app-content">
        {panes.map((id) => {
          const screen = screenById(id);
          return screen.Component ? (
            <screen.Component
              key={id}
              onEditSetup={onEditSetup}
              onReset={onReset}
              onNavigate={onNavigate}
            />
          ) : (
            <VanillaPane key={id} screen={screen} />
          );
        })}
      </div>
    ),
    [panes, onEditSetup, onReset, onNavigate],
  );

  return (
    <>
      <WriteFailureNotice />
      {appContent}
      <Nav panes={panes} onNavigate={onNavigate} navPref={navPref} onSetNavPref={setNavPref} />
    </>
  );
}

/** What a failed write means, stated plainly — see storage.js onWriteFailure(). */
const WRITE_FAILURE_COPY = {
  quota: {
    title: "Storage is full",
    sub: "Ticks may not save. Download a backup.",
    action: "Backup",
  },
  blocked: { title: "Storage is blocked", sub: "Nothing saves on this site until it's allowed." },
  corrupt: {
    title: "Some saved data couldn't be read",
    sub: "It was set aside. What's on screen may be incomplete.",
  },
};

/**
 * The storage banner above the screens, for a write that didn't land or a
 * record that couldn't be read (pass 57, restyled in pass 67). The screens
 * re-read storage on every render, so a failed tick already bounces back;
 * this says why. It shows the latest failure only; storage full offers the
 * backup download, the others a Dismiss.
 */
function WriteFailureNotice() {
  const [kind, setKind] = useState(null);
  useEffect(() => onWriteFailure((_name, next) => setKind(next)), []);
  if (!kind) return null;
  const copy = WRITE_FAILURE_COPY[kind] ?? WRITE_FAILURE_COPY.blocked;
  return (
    <div className="write-failure">
      <Banner
        kind="storage"
        title={copy.title}
        sub={copy.sub}
        action={copy.action ?? "Dismiss"}
        onAction={copy.action ? downloadBackup : () => setKind(null)}
      />
    </div>
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
 * The Today glance at the foot of the desktop nav: today's intake against
 * target with its status word, and the latest weigh-in. Recomputed on every
 * Shell render, which is what keeps it from showing a stale total after a
 * broadcast.
 */
function navGlance() {
  const profile = loadProfile();
  if (!isComplete(profile)) return null;

  const today = todayISO();
  const day = getDay(today) ?? newDay(today, profile.currentPhaseId, profile.addOns);
  const target = phaseTarget(day.phaseId).kcal;
  const latest = allWeights().at(-1) ?? null;

  return {
    kcal: NUM.format(dayTotals(day).kcal),
    target: target ? NUM.format(target) : null,
    status: intakeStatus(day),
    latest: latest ? formatWeight(latest.kg, profile.weightUnit || "kg") : null,
  };
}

/**
 * The shell's navigation (pass 66): the floating phone pill and the desktop
 * side nav, both rendered, one shown by CSS. The phone pill has four tabs;
 * Recipes lives only in the side nav, and while it is open the pill lights
 * its `tabParent` (Plan) instead.
 */
function Nav({ panes, onNavigate, navPref, onSetNavPref }) {
  const active = panes[0];
  const select = (id) => {
    if (panes.length === 1 && panes[0] === id) return;
    onNavigate(id);
  };

  return (
    <>
      <PhoneNav
        items={SCREENS.filter((s) => !s.wideOnlyTab)}
        active={active}
        lit={screenById(active)?.tabParent}
        onSelect={select}
      />
      <SideNav
        items={SCREENS}
        active={active}
        onSelect={select}
        glance={navGlance()}
        foot={<NavPinToggle navPref={navPref} onSetNavPref={onSetNavPref} />}
      />
    </>
  );
}

/**
 * The desktop nav's own pinned / show-on-hover switch (pass 47). Sits under
 * the glance card and is itself part of what a collapsed rail hides: reaching
 * it means the rail is already expanded (by hover, or by tabbing into it),
 * which is how a keyboard user switches it back to pinned. CSS renders it
 * only at desktop width on a device that can hover.
 */
function NavPinToggle({ navPref, onSetNavPref }) {
  return (
    <div className="r-sidenav__pin">
      <Segmented
        label="Side nav width"
        options={[
          { value: "visible", label: "Pinned" },
          { value: "hover", label: "On hover" },
        ]}
        value={navPref === "hover" ? "hover" : "visible"}
        onChange={onSetNavPref}
      />
    </div>
  );
}
