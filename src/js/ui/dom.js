import { icon } from "./icons.js";

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

/**
 * The uppercase tracked eyebrow that sits above a card, with an optional
 * leading glyph (pass 39). Every screen had rolled its own copy of the same
 * two lines; they are here now so the icon slot only had to be built once.
 *
 * The glyph is decorative — the label beside it already says what the section
 * is — so it is hidden from the accessibility tree. Pass no glyph and the
 * output is exactly what the screens produced before.
 */
export function groupLabel(label, glyph, tag = "span") {
  return el(
    tag,
    { class: "group__label" },
    glyph
      ? el("span", { class: "group__label-icon", "aria-hidden": "true" }, icon(glyph, { size: 14 }))
      : null,
    label,
  );
}

/**
 * The empty state (pass 41): one large muted glyph over a line of copy, and
 * nothing else. No illustration budget, no invented token.
 *
 * Only two surfaces in the app are ever genuinely empty — the weight history
 * before the first weigh-in, and the recipe book before the first save. Today's
 * checklist always renders the day's blocks and the grocery list always renders
 * its aisles, so neither gets one of these: they are at zero progress, not
 * empty, and covering real rows with a glyph would be a regression.
 *
 * The copy states a fact and points at the action that fills the surface. The
 * action is always already on screen just above, so this never grows a button —
 * a second one would compete with the real one.
 */
export function emptyState(glyph, line) {
  return el(
    "div",
    { class: "empty" },
    el("span", { class: "empty__icon", "aria-hidden": "true" }, icon(glyph, { size: 32 })),
    el("p", { class: "empty__line" }, line),
  );
}

/**
 * Re-render a screen while carrying keyboard focus across the rebuild.
 * Every screen here fully replaces its subtree with replaceChildren() on
 * every interaction — fine for a tap, but a Tab-and-Enter user loses focus to
 * <body> the instant their own node is torn down, since it no longer exists
 * when the callback returns. An element that wants to survive a rebuild
 * carries a stable `data-focus-key` (the checklist ticks and grocery rows do);
 * this captures the currently focused one's key, if any, runs `renderFn`, then
 * refocuses whichever new node was given the same key.
 */
export function renderPreservingFocus(root, renderFn) {
  const active = document.activeElement;
  const key = active && root.contains(active) ? active.getAttribute("data-focus-key") : null;
  renderFn();
  if (key) {
    root.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  }
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

// --- suppressing entrance-animation replay ----------------------------------
// A picker, panel or confirm carries `accordion-drop` (app.css) to announce
// itself as newly open. But every screen here rebuilds its whole subtree with
// replaceChildren() on each render(), so that node is destroyed and recreated
// even when the thing it represents was already open before this render —
// ticking an unrelated block re-renders the whole screen and would otherwise
// replay an already-open rotation picker's drop every time.
//
// `justOpened(key, isOpen)` is true only on the render where `isOpen` first
// turns truthy for that key; the caller adds an `is-entering` class only then.
// It must be called exactly once per render, unconditionally, from a function
// that always runs regardless of `isOpen` — otherwise the "was open" bookkeeping
// for a key that stops being called goes stale. A per-instance key (e.g. one
// block's picker) tracks each instance separately, so switching straight from
// one open thing to a different one of the same kind still counts as opening.
const openKeys = new Set();
export function justOpened(key, isOpen) {
  const was = openKeys.has(key);
  if (isOpen) openKeys.add(key);
  else openKeys.delete(key);
  return Boolean(isOpen) && !was;
}
