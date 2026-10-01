/**
 * dom.js — the one DOM helper the screens share.
 *
 *   el("div", { class: "x", onclick: fn }, child, "text")
 *
 * Props: `class` sets className; an `onEVENT` function is added as a listener;
 * anything else becomes an attribute. Null and undefined props and children are
 * skipped, so `cond && el(...)` and `maybe ?? null` are safe inline.
 */
export function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids) {
    if (kid == null) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

// --- screen-reader announcements --------------------------------------------
// One shared aria-live region, created once and kept OUTSIDE any screen's own
// subtree — every screen here rebuilds its DOM wholesale on each render(), and
// a live region that is itself destroyed and recreated with its final text
// already in place is not reliably announced by assistive tech. Screens call
// announce() with the one fact that changed; they do not narrate the whole
// re-render.

let liveRegion = null;

function getLiveRegion() {
  if (!liveRegion) {
    liveRegion = el("div", { class: "sr-only", "aria-live": "polite", role: "status" });
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

/** Announce a fact to screen readers — state it, never a verdict. */
export function announce(message) {
  const region = getLiveRegion();
  // Cleared first so an identical message (two ticks landing on the same
  // total) still gets re-announced rather than being a silent no-op.
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
