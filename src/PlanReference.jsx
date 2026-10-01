/**
 * PlanReference.jsx — the plan as something to read (pass 48), shown on
 * Recipes: every meal option and the food table. They're what you read when
 * deciding what to eat or log, about once a month, and on Plan they sat as a
 * wall under the list opened every week. Plan's own ladder is the PhaseLadder
 * (pass 69). Each block renders bare — the host screen puts it under its own
 * heading. Restyled in pass 71.
 */

import { NUM } from "./components/shared.jsx";
import { Icon } from "./components/core.jsx";
import { phaseTarget, activeBlocks, rotationOptions } from "./js/core/plan.js";

/**
 * The day's blocks in time order. A block with a rotation lists its options,
 * each a full ingredient sentence that can run to two or three lines on a
 * phone — printed flat that was ~25 unbroken lines, so the options collapse
 * behind the block (closed by default, one open at a time), and each is a
 * bounded row with a hairline above it. The block's head carries the kcal
 * range, so the list still answers "how big is breakfast" without opening it.
 * A block whose meal never varies reads as a rotation of one.
 */
export function MealsBlock({ addOns, phaseId, openMeal, setOpenMeal }) {
  const dayKcal = phaseTarget(phaseId).kcal || 0;
  return (
    <div className="r-meals">
      {activeBlocks(addOns).map((b) => (
        <Meal
          key={b.id}
          b={b}
          dayKcal={dayKcal}
          open={openMeal === b.id}
          onToggle={() => setOpenMeal(openMeal === b.id ? null : b.id)}
        />
      ))}
    </div>
  );
}

function Meal({ b, dayKcal, open, onToggle }) {
  const opts = b.rotation ? rotationOptions(b.rotation) : [{ desc: b.desc, kcal: b.kcal }];
  const kcals = opts.map((o) => o.kcal);
  const lo = Math.min(...kcals);
  const hi = Math.max(...kcals);
  const fig = lo === hi ? `${NUM.format(hi)} kcal` : `${NUM.format(lo)}–${NUM.format(hi)} kcal`;
  // The rail is a size readout, never a status: colour already means
  // on-track, partway or under here, so this only says "about a quarter of
  // the day" and nothing about whether that is good.
  const share = dayKcal && hi ? Math.min(100, Math.round((hi / dayKcal) * 100)) : 0;

  return (
    <div className={`r-meals__meal${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="r-meals__head"
        aria-expanded={open ? "true" : "false"}
        onClick={onToggle}
      >
        <Icon name="clock" size={18} className="r-meals__icon" />
        <span className="r-meals__name">
          <b>{b.name}</b>
          {b.time ? <span className="r-meals__time">{b.time}</span> : null}
        </span>
        <span className="r-meals__fig">{fig}</span>
        <Icon name="chevron-down" size={16} className="r-meals__chevron" />
      </button>
      {share ? (
        <span className="r-meals__share" aria-hidden="true">
          <span className="r-meals__share-fill" style={{ width: `${share}%` }} />
        </span>
      ) : null}
      {open ? (
        <ul className="r-meals__opts">
          {opts.map((o, i) => (
            <li key={i} className="r-meals__opt">
              <span className="r-meals__opt-desc">{o.desc}</span>
              <span className="r-meals__opt-kcal">{NUM.format(o.kcal)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The off-plan food table: `foods` is FOOD_DB without the rows the user hid
 * (core/foods.js), and `onHide(food)` hides one. A name over a run-on
 * "250 ml · 160 kcal · 8 g" line on a phone; aligned columns, with a header
 * naming them, on desktop.
 */
export function FoodsBlock({ foods, onHide }) {
  if (foods.length === 0) {
    return (
      <p className="r-foods__empty">Every food is hidden. Restore them in Settings, under Data.</p>
    );
  }
  return (
    <div className="r-foods">
      <div className="r-foods__head" aria-hidden="true">
        <span>Food</span>
        <span>Amount</span>
        <span className="r-foods__num">Kcal</span>
        <span className="r-foods__num">Protein</span>
        <span />
      </div>
      <ul className="r-foods__list">
        {foods.map((f) => (
          <li key={f.id} className="r-foods__row">
            <span className="r-foods__name">{f.name}</span>
            <span className="r-foods__portion">{f.portion}</span>
            <span className="r-foods__kcal">{NUM.format(f.kcal)} kcal</span>
            <span className="r-foods__protein">{Math.round(f.proteinG)} g</span>
            <button
              type="button"
              className="r-foods__hide"
              aria-label={`Hide ${f.name}`}
              title={`Hide ${f.name}`}
              onClick={() => onHide(f)}
            >
              <Icon name="x" size={16} strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
