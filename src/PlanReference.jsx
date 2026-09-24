/**
 * PlanReference.jsx — the plan as something to read (pass 48). The target
 * ladder stays on Plan, beside the groceries: both change with the phase. The
 * meals and the food table moved to Recipes, beside the book: they're what you
 * read when deciding what to eat or log, about once a month, and on Plan they
 * sat as a wall under the list opened every week. Each block renders bare —
 * the host screen puts it in a card under its own group label.
 */

import { NUM, Icon, fmtTime } from "./components/shared.jsx";
import { PHASES, phaseTarget, activeBlocks, rotationOptions, FOOD_DB } from "./js/core/plan.js";

/** The three-rung target ladder, the active phase picked out. */
export function TargetsBlock({ phaseId }) {
  return (
    <div className="planref__block">
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
export function MealsBlock({ addOns, phaseId, openMeal, setOpenMeal }) {
  const dayKcal = phaseTarget(phaseId).kcal || 0;
  return (
    <div className="planref__block">
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
export function FoodsBlock() {
  return (
    <div className="planref__block">
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

