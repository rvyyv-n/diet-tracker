/**
 * shared.jsx — the small plumbing every screen uses (pass 62). v3.0 (passes
 * 65-71) moved the design components to core.jsx, tracking.jsx and
 * surfaces.jsx; what stays here is `NUM` and `Imperative`, which are not
 * design: a number format, and the bridge that mounts a vanilla widget.
 */

import { useEffect, useRef } from "react";

/** Thousands separators in one fixed locale — "3,110", whatever the device. */
export const NUM = new Intl.NumberFormat("en-US");

/**
 * Mounts a plain DOM node from one of the vanilla widgets (the calendar, the
 * listbox, Weight's cards) into the React tree. Usually rebuilt fresh every
 * render; a node kept across renders is left in place, because detaching and
 * re-inserting it would drop keyboard focus.
 */
export function Imperative({ node }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current.firstChild !== node || ref.current.childNodes.length !== 1)
      ref.current.replaceChildren(node);
  });
  return <span style={{ display: "contents" }} ref={ref} />;
}
