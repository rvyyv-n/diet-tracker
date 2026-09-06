/**
 * Plan.jsx — the Plan tab, converted from plan-view.js (pass 45's third
 * screen). The weekly grocery checklist, and a read-only reference sheet for
 * the plan itself.
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
import { iconSvg } from "./js/ui/icons.js";
import { loadProfile } from "./js/core/profile.js";
import {
  GROCERY_LIST,
  scaleGroceryQty,
  PHASES,
  phaseById,
  phaseTarget,
  activeBlocks,
  normaliseAddOns,
  rotationOptions,
  FOOD_DB,
} from "./js/core/plan.js";
import { planWeek, todayISO } from "./js/core/dates.js";
import { groceryKey, weekChecks, toggleGrocery, clearGroceryChecks } from "./js/core/grocery.js";
import { publish, subscribe } from "./js/core/broadcast.js";

const NUM = new Intl.NumberFormat("en-US"); // 3,110

/** Same dual-mode design as App.jsx's / Settings.jsx's `Icon` — see either. */
function Icon({ name, size, stroke, className }) {
  const html = { __html: iconSvg(name, { size, stroke }) };
  if (className) return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={html} />;
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={html} />;
}

function GroupLabel({ icon: glyph, children }) {
  return (
    <span className="group__label">
      {glyph ? <Icon name={glyph} size={14} className="group__label-icon" /> : null}
      {children}
    </span>
  );
}

function Group({ label, icon: glyph, children }) {
  return (
    <div className="group">
      <GroupLabel icon={glyph}>{label}</GroupLabel>
      {children}
    </div>
  );
}

export default function Plan() {
  const paneRef = useRef(null);
  // The block id whose rotation options are expanded in the reference sheet,
  // or null for all closed. One at a time: the point of the disclosure is
  // that the sheet stays an index you can scan, and letting every block open
  // at once rebuilds the wall it was added to remove.
  const [openMeal, setOpenMeal] = useState(null);

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
  // The add-ons this user actually runs (the engine may have changed them),
  // so the reference "Meals" list matches what Today shows — not the bare
  // phase.
  const addOns = normaliseAddOns(profile.addOns ?? []);

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
        <Group label="The plan" icon="clipboard-list">
          <ReferenceCard phaseId={phaseId} addOns={addOns} openMeal={openMeal} setOpenMeal={setOpenMeal} />
        </Group>
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

// --- the reference sheet ---------------------------------------------------

/**
 * A section mark on the reference sheet. The label was a 12px muted-soft line
 * that disappeared between the rows it was meant to introduce; it now sits at
 * caption size in full ink with a muted glyph beside it, so the three sections
 * read as landmarks when the sheet is scrolled. The icon is decorative — the
 * label already says what the section is — so it is hidden from the tree.
 */
function Subhead({ label, glyph }) {
  return (
    <p className="planscreen__subhead">
      {glyph ? <Icon name={glyph} size={16} className="planscreen__subhead-icon" /> : null}
      {label}
    </p>
  );
}

function ReferenceCard({ phaseId, addOns, openMeal, setOpenMeal }) {
  return (
    <div className="card planref">
      <TargetsBlock phaseId={phaseId} />
      <MealsBlock addOns={addOns} phaseId={phaseId} openMeal={openMeal} setOpenMeal={setOpenMeal} />
      <FoodsBlock />
    </div>
  );
}

/** The three-rung target ladder, the active phase picked out. */
function TargetsBlock({ phaseId }) {
  return (
    <div className="planref__block">
      <Subhead label="Targets" glyph="target" />
      <ul className="planref__targets">
        {PHASES.map((p) => (
          <li key={p.id} className={`planref__target${p.id === phaseId ? " is-now" : ""}`}>
            {/* The rung dot: the only thing on the ladder that says which
                phase is live, now that the figures beside it carry colour
                of their own. */}
            <span className="planref__target-dot" aria-hidden="true" />
            <span className="planref__target-name">{p.name}</span>
            {/* Three cells rather than one joined string, so kcal and
                protein can take different weights and colours. The "·"
                between them is drawn in CSS, as it is in the food table. */}
            <span className="planref__target-fig">
              <span className="planref__target-kcal">{NUM.format(p.kcal)} kcal</span>
              <span className="planref__target-protein">{p.proteinG} g</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The day's blocks in time order. A block with a rotation lists four options,
 * each a full ingredient sentence that wraps to two or three lines on a phone
 * — printed flat that was ~25 unbroken lines of text, which is what made this
 * sheet unreadable. Two changes fix it: the options collapse behind the block
 * (closed by default, one open at a time), and each option is a bounded row
 * with a hairline above it rather than another paragraph in a run. The block
 * header carries the kcal range, so the sheet still answers "how big is
 * breakfast" without being opened.
 */
function MealsBlock({ addOns, phaseId, openMeal, setOpenMeal }) {
  const dayKcal = phaseTarget(phaseId).kcal || 0;
  return (
    <div className="planref__block">
      <Subhead label="Meals" glyph="utensils" />
      {activeBlocks(addOns).map((b) =>
        b.rotation ? (
          <RotationMeal key={b.id} b={b} dayKcal={dayKcal} openMeal={openMeal} setOpenMeal={setOpenMeal} />
        ) : (
          <FixedMeal key={b.id} b={b} dayKcal={dayKcal} openMeal={openMeal} setOpenMeal={setOpenMeal} />
        ),
      )}
    </div>
  );
}

/**
 * The share rail under a meal head: a hairline filled to the meal's largest
 * option as a fraction of the day's target.
 *
 * Deliberately a *size* readout and not a status one. Colour on this app
 * already means one thing — on-track / partway / under, and inverted for a
 * gain tracker — so a second meaning for colour on the same screen would
 * misread. This says "breakfast is about a quarter of your day" and nothing
 * about whether that is good, which is the only honest thing a plan sheet can
 * say about a meal you have not eaten yet.
 */
function ShareRail({ kcal, dayKcal }) {
  if (!dayKcal || !kcal) return null;
  const pct = Math.min(100, Math.round((kcal / dayKcal) * 100));
  return (
    <span className="planref__share" aria-hidden="true">
      <span className="planref__share-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * A block whose meal never varies. It reads as a rotation with exactly one
 * option: same head, same figure, same chevron, and the one description sits
 * in the same disclosure the rotations use. Before, it was the only row on
 * the sheet showing its description unprompted and the only one quoting
 * protein beside its kcal, which made Pre-bed look like a different kind of
 * thing rather than the same thing with nothing to choose between.
 */
function FixedMeal({ b, dayKcal, openMeal, setOpenMeal }) {
  return (
    <MealDisclosure
      b={b}
      fig={`${NUM.format(b.kcal)} kcal`}
      opts={[{ desc: b.desc, kcal: b.kcal }]}
      kcal={b.kcal}
      dayKcal={dayKcal}
      openMeal={openMeal}
      setOpenMeal={setOpenMeal}
    />
  );
}

/** A block with a rotation: a disclosure button over the option list. */
function RotationMeal({ b, dayKcal, openMeal, setOpenMeal }) {
  const opts = rotationOptions(b.rotation);
  const kcals = opts.map((o) => o.kcal);
  const lo = Math.min(...kcals);
  const hi = Math.max(...kcals);
  const range = lo === hi ? `${NUM.format(lo)} kcal` : `${NUM.format(lo)}–${NUM.format(hi)} kcal`;
  return (
    <MealDisclosure b={b} fig={range} opts={opts} kcal={hi} dayKcal={dayKcal} openMeal={openMeal} setOpenMeal={setOpenMeal} />
  );
}

/**
 * The shared meal row: a head that expands to a list of options. `fig` is the
 * figure shown beside the chevron — a range for a rotation, the single number
 * for a fixed meal.
 */
function MealDisclosure({ b, fig, opts, kcal, dayKcal, openMeal, setOpenMeal }) {
  const open = openMeal === b.id;

  return (
    <div className={`planref__meal${open ? " is-open" : ""}`}>
      <button
        className="planref__meal-head planref__meal-head--btn"
        type="button"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpenMeal(open ? null : b.id)}
      >
        <MealName b={b} />
        <span className="planref__meal-fig">{fig}</span>
        <Icon name="chevron-down" size={16} className="planref__meal-chev" />
      </button>
      <ShareRail kcal={kcal} dayKcal={dayKcal} />
      {open ? (
        <ul className="planref__opts">
          {opts.map((o, i) => (
            <li key={i} className="planref__opt">
              <span className="planref__opt-desc">{o.desc}</span>
              <span className="planref__opt-kcal">{NUM.format(o.kcal)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * One Lucide glyph per meal block (pass 41, settling phase 6's open call).
 * Keyed by block id rather than name so renaming a block in plan.js does not
 * silently drop its glyph. Both shakes share `milk` — they are the same drink
 * at two times of day, and giving the second one its own glyph would imply a
 * difference that isn't there. A block with no entry simply renders no icon.
 */
const BLOCK_GLYPH = {
  B1: "egg", // Breakfast
  B2: "milk", // Shake
  B3: "sandwich", // Lunch
  A1: "cookie", // Snack
  A3: "milk", // Shake 2
  B4: "utensils", // Dinner
  A2: "moon", // Pre-bed
};

function MealName({ b }) {
  const glyph = BLOCK_GLYPH[b.id];
  return (
    <span className="planref__meal-name">
      {glyph ? <Icon name={glyph} size={16} className="planref__meal-icon" /> : null}
      {b.name}
      {b.time ? <span className="planref__meal-time">{fmtTime(b.time)}</span> : null}
    </span>
  );
}

/** The off-plan food table, straight from FOOD_DB. */
function FoodsBlock() {
  return (
    <div className="planref__block">
      <Subhead label="Food table" glyph="table" />
      {/* The column key. Four unlabelled columns of numbers left "160" and "8"
          to be told apart by magnitude alone; this names them. Desktop only —
          on a phone the row is a name over a run-on "250 ml · 160 kcal · 8 g"
          line, where the units are already in the text and a header would be
          labelling columns that do not exist. */}
      <div className="planref__foods-head" aria-hidden="true">
        <span>Food</span>
        <span>Amount</span>
        <span className="planref__foods-head-kcal">Kcal</span>
        <span className="planref__foods-head-protein">Protein</span>
      </div>
      <ul className="planref__foods">
        {FOOD_DB.map((f) => (
          <li key={f.name} className="planref__food">
            <span className="planref__food-name">{f.name}</span>
            {/* Three separate cells, not one joined sentence: the desktop
                layout spreads them into aligned columns, and the "·"
                separators that hold them together on a phone are drawn in
                CSS. */}
            <span className="planref__food-meta">
              <span className="planref__food-portion">{f.portion}</span>
              <span className="planref__food-kcal">{NUM.format(f.kcal)} kcal</span>
              <span className="planref__food-protein">{Math.round(f.proteinG)} g</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- helpers -------------------------------------------------------------

/** "08:00" -> "8am", "13:30" -> "1:30pm" — mirrors today.js. */
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}
