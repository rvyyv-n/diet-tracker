/**
 * Plan.jsx — the Plan tab, built on the v3.0 tracking components (pass 69).
 * What changes week to week: the grocery checklist and the phase ladder. The
 * meals and the food table live on Recipes (pass 48); a row at the foot links
 * there, which is how a phone reaches them.
 *
 * On desktop the screen splits into `.r-columns`: the groceries in the main
 * column (the aisles in two columns), the ladder and the Recipes link in the
 * 340px support column.
 *
 * Groceries scale from the Phase 2 baseline with `scaleGroceryQty`, and a
 * quantity that differs from the baseline shows in accent text. Ticks live in
 * core/grocery.js, keyed by aisle and name, so they carry over a phase change
 * untouched and clear themselves each Monday. Clear keeps a copy for the
 * toast's Undo.
 *
 * React's reconciler keeps an element's focus across renders, so the vanilla
 * version's `renderPreservingFocus()` wrapper isn't needed here.
 */

import { useEffect, useRef, useState } from "react";
import { announce } from "./js/ui/dom.js";
import { loadProfile } from "./js/core/profile.js";
import { PHASES, GROCERY_LIST, scaleGroceryQty, phaseById, phaseTarget } from "./js/core/plan.js";
import { planWeek, todayISO, startOfWeekISO, addDays } from "./js/core/dates.js";
import {
  groceryKey,
  weekChecks,
  toggleGrocery,
  clearGroceryChecks,
  restoreGroceryChecks,
} from "./js/core/grocery.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { NUM } from "./components/shared.jsx";
import { Eyebrow, Icon, SectionHeading } from "./components/core.jsx";
import { Toast } from "./components/surfaces.jsx";
import { GroceryList, PhaseLadder } from "./components/tracking.jsx";
import { shortDate } from "./LogFood.jsx";

// How long a toast stays before it goes on its own (as on Today and Weight).
const TOAST_MS = 4000;

/** Aisle -> glyph in the Rise icon set. An aisle without an entry has no mark. */
const AISLE_ICON = {
  "Dairy & eggs": "dairy",
  Pantry: "pantry",
  Protein: "protein",
  Produce: "produce",
};

export default function Plan({ onNavigate }) {
  const paneRef = useRef(null);
  const [toast, setToast] = useState(null); // { message, undo }

  useEffect(() => {
    const node = paneRef.current;
    node.classList.remove("tab-switching");
    void node.offsetWidth;
    node.classList.add("tab-switching");
  }, []);

  useEffect(() => {
    publish("plan");
  });

  const [, bump] = useState(0);
  useEffect(
    () =>
      subscribe((fresh) => {
        if (!fresh.has("plan")) bump((n) => n + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const profile = loadProfile();
  const phaseId = profile.currentPhaseId || 2;
  const phase = phaseById(phaseId) ?? phaseById(2);
  const today = todayISO();
  const week = planWeek(profile.startDate || today, today);
  const checks = weekChecks();
  const aisles = groceryAisles(phaseId, checks);
  const total = aisles.reduce((n, a) => n + a.items.length, 0);
  const done = aisles.reduce((n, a) => n + a.items.filter((it) => it.done).length, 0);
  const nextMonday = addDays(startOfWeekISO(today), 7);

  function tick(ai, ii) {
    const sec = GROCERY_LIST[ai];
    toggleGrocery(groceryKey(sec.section, sec.items[ii].name));
    const after = groceryAisles(phaseId, weekChecks());
    const ticked = after.reduce((n, a) => n + a.items.filter((it) => it.done).length, 0);
    announce(`${ticked} of ${total} ticked.`);
    bump((n) => n + 1);
  }

  function clearAll() {
    const before = { ...checks };
    const count = done;
    if (!count) return;
    clearGroceryChecks();
    announce(`Cleared ${count} tick${count === 1 ? "" : "s"}.`);
    setToast({
      message: `Cleared ${count} tick${count === 1 ? "" : "s"}`,
      undo: () => {
        restoreGroceryChecks(before);
        setToast(null);
        announce(`${count} tick${count === 1 ? "" : "s"} restored.`);
        bump((n) => n + 1);
      },
    });
    bump((n) => n + 1);
  }

  return (
    <div className="pane" data-screen="plan" ref={paneRef}>
      <section className="r-plan">
        <header className="r-plan__head">
          <Eyebrow>
            Week {week} · {shortDate(today)}
          </Eyebrow>
          <h1 className="r-plan__title">
            Phase {phase.id}, {phase.name}
          </h1>
          <p className="r-plan__target">
            {NUM.format(phase.kcal)} kcal · {phase.proteinG} g protein a day
          </p>
        </header>
        <div className="r-columns">
          <div className="r-plan__main">
            <SectionHeading
              meta={
                <>
                  <b className="r-plan__count">
                    {done} of {total}
                  </b>{" "}
                  ticked · new list {shortDate(nextMonday)}
                </>
              }
            >
              Groceries
            </SectionHeading>
            <div className="r-plan__card">
              <GroceryList
                aisles={aisles}
                scaleNote={scaleNote(phaseId)}
                onToggle={tick}
                onClear={clearAll}
              />
            </div>
          </div>
          <aside className="r-plan__support" aria-label="Targets">
            <div>
              <SectionHeading>Targets</SectionHeading>
              <div className="r-plan__card">
                <PhaseLadder rungs={ladderRungs(phaseId)} note={ladderNote(phaseId)} />
              </div>
            </div>
            <button type="button" className="r-plan__link" onClick={() => onNavigate("recipes")}>
              <span className="r-plan__link-icon" aria-hidden="true">
                <Icon name="recipes" size={20} />
              </span>
              <span className="r-plan__link-text">
                <span className="r-plan__link-title">Recipes</span>
                <span className="r-plan__link-hint">
                  Every meal option, the food table and your saved recipes.
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="r-plan__link-chevron" />
            </button>
          </aside>
        </div>
      </section>
      {toast ? <Toast message={toast.message} onUndo={toast.undo} /> : null}
    </div>
  );
}

// --- groceries ----------------------------------------------------------

/**
 * The list as the component wants it: aisles of `{ name, qty, done, changed }`,
 * quantities scaled to `phaseId`. `changed` marks a quantity that differs from
 * the Phase 2 baseline, which is what a phase change does to it. Only items
 * the plan still names are counted, so a renamed entry can't inflate the total.
 */
function groceryAisles(phaseId, checks) {
  return GROCERY_LIST.map((sec) => ({
    name: sec.section,
    icon: AISLE_ICON[sec.section],
    items: sec.items.map((item) => {
      const qty = scaleGroceryQty(item, phaseId);
      return {
        name: item.name,
        qty: qty == null ? "" : item.unit ? `${qty} ${item.unit}` : String(qty),
        done: Boolean(checks[groceryKey(sec.section, item.name)]),
        changed: qty != null && qty !== item.qty,
      };
    }),
  }));
}

/** The line under the list: the baseline phase says so, any other says what it scaled to. */
function scaleNote(phaseId) {
  return phaseId === 2
    ? "Quantities for Phase 2."
    : `Scaled to Phase ${phaseId}, ${NUM.format(phaseTarget(phaseId).kcal)} kcal.`;
}

// --- the ladder ---------------------------------------------------------

/**
 * The three rungs, each with a status word: the current phase is Now, earlier
 * ones Done, and the next Week 3 (Target, from Ramp-up) or If stalled (Pushed).
 */
function ladderRungs(phaseId) {
  return PHASES.map((p) => ({
    name: p.name,
    status:
      p.id === phaseId ? "Now" : p.id < phaseId ? "Done" : p.id === 3 ? "If stalled" : "Week 3",
    when: p.when,
    kcal: `${NUM.format(p.kcal)} kcal`,
    protein: `${p.proteinG} g protein`,
    state: p.id === phaseId ? "now" : p.id < phaseId ? "past" : "next",
  }));
}

/** What to know about the phases, stated as facts. Phase 3 is never entered automatically. */
function ladderNote(phaseId) {
  if (phaseId === 1) {
    return "Two weeks at Ramp-up, then Target. Jumping straight in is what makes week one collapse.";
  }
  if (phaseId === 3) return "Phase 3 adds Shake 2 at 17:00.";
  return "Phase 3 is only ever suggested from Weight, never switched on by itself.";
}
