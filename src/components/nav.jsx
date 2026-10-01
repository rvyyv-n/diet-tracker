/**
 * nav.jsx — the shell's two navigation surfaces (pass 66), ported from the
 * handoff's PhoneNav and SideNav. Both render; CSS shows the phone pill below
 * 1024px and the side nav from there up, so exactly one is ever in the
 * accessibility tree.
 *
 * `items` is the router's screen list ({ id, label, icon }). `active` is the
 * screen on display, and `lit` the item to light instead when that screen has
 * no item of its own here (Recipes on phone lights Plan, its `tabParent`).
 */

import { Icon, Wordmark } from "./core.jsx";
import { StatusDot } from "./tracking.jsx";

const cx = (...names) => names.filter(Boolean).join(" ");

/** The floating four-tab pill, 12px from the edges, with a fade above it. */
export function PhoneNav({ items, active, lit, onSelect }) {
  return (
    <>
      <div className="r-phonenav__fade" aria-hidden="true" />
      <nav className="r-phonenav" aria-label="Sections">
        {items.map((item) => {
          const on = item.id === (lit ?? active);
          return (
            <button
              key={item.id}
              type="button"
              className={cx("r-phonenav__tab", on && "is-active")}
              aria-current={item.id === active ? "page" : undefined}
              onClick={() => onSelect(item.id)}
            >
              <Icon name={item.icon} size={20} strokeWidth={on ? 1.9 : 1.8} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}

/**
 * The 256px desktop nav: the wordmark, every destination, and the Today
 * glance card at its foot. `foot` renders under the card (the rail toggle).
 */
export function SideNav({ items, active, onSelect, glance, foot }) {
  return (
    <nav className="r-sidenav" aria-label="Sections">
      <button type="button" className="r-sidenav__brand" onClick={() => onSelect(items[0].id)}>
        <Wordmark variant="nav" />
      </button>
      {items.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            className={cx("r-sidenav__item", on && "is-active")}
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(item.id)}
          >
            <Icon name={item.icon} size={20} />
            <span className="r-sidenav__label">{item.label}</span>
            {on ? <span className="r-sidenav__dot" aria-hidden="true" /> : null}
          </button>
        );
      })}
      {glance ? (
        <div className="r-sidenav__glance">
          <div className="r-sidenav__glance-label">Today</div>
          <div className="r-sidenav__glance-figure">
            <span className="r-sidenav__glance-kcal">{glance.kcal}</span>
            {glance.target ? (
              <span className="r-sidenav__glance-target">/ {glance.target} kcal</span>
            ) : null}
          </div>
          <div className="r-sidenav__glance-status">
            <StatusDot status={glance.status} />
          </div>
          {glance.latest ? (
            <div className="r-sidenav__glance-latest">
              Latest <b>{glance.latest}</b>
            </div>
          ) : null}
        </div>
      ) : null}
      {foot}
    </nav>
  );
}
