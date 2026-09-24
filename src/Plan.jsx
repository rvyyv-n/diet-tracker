/**
 * Plan.jsx — the Plan tab, converted from plan-view.js (pass 45's third
 * screen). What changes week to week: the grocery checklist and the phase
 * target ladder. The meals and the food table moved to Recipes in pass 48;
 * a row at the foot links there, which is how a phone reaches them.
 *
 * The vanilla version wrapped every render in `renderPreservingFocus()`,
 * because its full `replaceChildren()` rebuild would otherwise drop a
 * keyboard user's focus to `<body>` on every tick. React's own reconciler
 * doesn't tear the tree down like that — an element that's still there next
 * render keeps its identity and its focus — so that wrapper (and its
 * `data-focus-key` attributes) isn't needed here at all.
 */

import { useEffect, useRef, useState } from "react";
import { announce } from "./js/ui/dom.js";
import { loadProfile } from "./js/core/profile.js";
import { GROCERY_LIST, scaleGroceryQty, phaseById } from "./js/core/plan.js";
import { planWeek, todayISO } from "./js/core/dates.js";
import { groceryKey, weekChecks, toggleGrocery, clearGroceryChecks } from "./js/core/grocery.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { Icon, Group } from "./components/shared.jsx";
import { TargetsBlock } from "./PlanReference.jsx";

export default function Plan({ onNavigate }) {
  const paneRef = useRef(null);

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
  useEffect(() => subscribe((fresh) => {
    if (!fresh.has("plan")) bump((n) => n + 1);
  }), []);

  const profile = loadProfile();
  const phaseId = profile.currentPhaseId || 2;
  const phase = phaseById(phaseId);
  const week = planWeek(profile.startDate || todayISO(), todayISO());

  return (
    <div className="pane" data-screen="plan" ref={paneRef}>
      <section className="screen planscreen">
        <div className="screen-head">
          <h1 className="screen__title screen__title--lg">Plan</h1>
          <p className="phase-banner">{phase.name} · Week {week}</p>
        </div>
        <Group label="Groceries" icon="shopping-cart">
          <GroceryCard phaseId={phaseId} bump={bump} />
        </Group>
        <Group label="Targets" icon="target">
          <div className="card planref">
            <TargetsBlock phaseId={phaseId} />
          </div>
        </Group>
        <div className="card set2-card">
          <button className="set2-row" type="button" onClick={() => onNavigate("recipes")}>
            <span className="set2-row__icon" aria-hidden="true">
              <Icon name="book-open" />
            </span>
            <span className="set2-row__body">
              <span className="set2-row__name">Meals, food table and recipes</span>
              <span className="set2-row__desc">Every meal option, the foods to log from, and your recipe book.</span>
            </span>
            <span className="set2-row__chev" aria-hidden="true">
              <Icon name="chevron-right" size={16} stroke={2} />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

// --- groceries ----------------------------------------------------------

/** Ticked / total across every aisle, over items the plan still names — a
 * renamed entry can't inflate the count. Shared by the status line and the
 * live-region announcement so they can never disagree. */
function groceryCounts() {
  const checks = weekChecks();
  let total = 0;
  let done = 0;
  for (const sec of GROCERY_LIST) {
    for (const item of sec.items) {
      total += 1;
      if (checks[groceryKey(sec.section, item.name)]) done += 1;
    }
  }
  return { done, total };
}

function announceGroceryProgress() {
  const { done, total } = groceryCounts();
  announce(`${done} of ${total} ticked.`);
}

/**
 * The list as tickable rows, grouped by aisle, with quantities scaled to the
 * current phase. The count line and the "Clear" action state facts only
 * (insight_copy_states_facts) — no "well done", no colour.
 */
function GroceryCard({ phaseId, bump }) {
  const checks = weekChecks();
  const { done, total } = groceryCounts();

  function tick(key) {
    toggleGrocery(key);
    announceGroceryProgress();
    bump((n) => n + 1);
  }

  function clearAll() {
    clearGroceryChecks();
    announceGroceryProgress();
    bump((n) => n + 1);
  }

  return (
    <div className="card grocery">
      <p className="grocery__status">New list each Monday · {done} of {total} ticked</p>
      {GROCERY_LIST.map((sec) => (
        <GrocerySection key={sec.section} sec={sec} phaseId={phaseId} checks={checks} onTick={tick} />
      ))}
      {done > 0 ? (
        <div className="grocery__reset">
          <button className="btn btn--secondary btn--sm" type="button" onClick={clearAll}>
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Aisle -> glyph. Keyed by the `section` string in GROCERY_LIST, so an aisle
 * added there without an entry here simply renders its subhead without an
 * icon rather than throwing — `Subhead` already treats a missing glyph as
 * "no icon".
 */
const AISLE_GLYPH = {
  "Dairy & eggs": "egg",
  Pantry: "archive",
  Protein: "drumstick",
  Produce: "leaf",
};

function GrocerySection({ sec, phaseId, checks, onTick }) {
  return (
    <div className="grocery__section">
      <Subhead label={sec.section} glyph={AISLE_GLYPH[sec.section]} />
      <ul className="grocery__list">
        {sec.items.map((item) => (
          <GroceryRow key={item.name} section={sec.section} item={item} phaseId={phaseId} checks={checks} onTick={onTick} />
        ))}
      </ul>
    </div>
  );
}

function GroceryRow({ section, item, phaseId, checks, onTick }) {
  const key = groceryKey(section, item.name);
  const on = Boolean(checks[key]);
  return (
    <li>
      <button
        className={`grocery__row${on ? " is-checked" : ""}`}
        type="button"
        aria-pressed={String(on)}
        onClick={() => onTick(key)}
      >
        <span className={`block-row__tick${on ? " is-done" : ""}`}>
          {on ? <Icon name="check" size={14} stroke={2.5} /> : null}
        </span>
        <span className="grocery__label">{groceryLine(item, phaseId)}</span>
      </button>
    </li>
  );
}

/** "7.5 L Full-fat milk", "24 Eggs", "Wholemeal flour" (unmeasured staple).
 *  scaleGroceryQty already rounds to <=2dp, so String() is enough. */
function groceryLine(item, phaseId) {
  const qty = scaleGroceryQty(item, phaseId);
  if (qty == null) return item.name;
  return item.unit ? `${qty} ${item.unit} ${item.name}` : `${qty} ${item.name}`;
}

/**
 * A grocery aisle heading: caption size in full ink with a muted glyph, so the
 * aisles read as landmarks when the list is scrolled. The icon is decorative —
 * the label already says what the aisle is — so it is hidden from the tree.
 */
function Subhead({ label, glyph }) {
  return (
    <p className="planscreen__subhead">
      {glyph ? <Icon name={glyph} size={16} className="planscreen__subhead-icon" /> : null}
      {label}
    </p>
  );
}
