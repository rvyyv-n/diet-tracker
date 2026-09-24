/**
 * shared.jsx — the small components every screen used to define for itself
 * (pass 62). Five screens each carried an identical `Icon`, four a
 * `GroupLabel`, and Plan and Weight a `Group`; Today and Weight each had
 * their own `Imperative`. One copy here, so a change lands everywhere.
 */

import { useEffect, useRef } from "react";
import { iconSvg } from "../js/ui/icons.js";

/** Thousands separators in one fixed locale — "3,110", whatever the device. */
export const NUM = new Intl.NumberFormat("en-US");

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
 * span carrying that class, containing the svg). Omit it when the caller
 * already renders its own sizing wrapper around the icon (`set2-row__icon`
 * and friends expect the `<svg>` as their own direct flex item, sized via
 * `<wrapper> svg { width/height: 100% }`) — `display: contents` keeps this
 * component from adding a second, unsized box in between.
 */
export function Icon({ name, size, stroke, className }) {
  const html = { __html: iconSvg(name, { size, stroke }) };
  if (className) return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={html} />;
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={html} />;
}

/**
 * The uppercase tracked eyebrow above a card, with an optional leading glyph.
 * The glyph is decorative — the label already says what the section is.
 */
export function GroupLabel({ icon: glyph, children, tag: Tag = "span" }) {
  return (
    <Tag className="group__label">
      {glyph ? <Icon name={glyph} size={14} className="group__label-icon" /> : null}
      {children}
    </Tag>
  );
}

/** A labelled section: the eyebrow, then whatever sits under it. */
export function Group({ label, icon: glyph, children }) {
  return (
    <div className="group">
      <GroupLabel icon={glyph}>{label}</GroupLabel>
      {children}
    </div>
  );
}

/** The quiet glyph-and-line stand-in for a list with nothing in it yet. */
export function EmptyState({ glyph, line }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon name={glyph} size={32} />
      </span>
      <p className="empty__line">{line}</p>
    </div>
  );
}

/**
 * Mounts a plain DOM node from one of the vanilla widgets (the calendar, the
 * listbox, Weight's cards) into the React tree. Usually rebuilt fresh every
 * render; a node kept across renders is left in place, because detaching and
 * re-inserting it would drop keyboard focus.
 */
export function Imperative({ node }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current.firstChild !== node || ref.current.childNodes.length !== 1) ref.current.replaceChildren(node);
  });
  return <span style={{ display: "contents" }} ref={ref} />;
}

/** "08:00" -> "8am", "13:30" -> "1:30pm" — a compact time-of-day label. */
export function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}
