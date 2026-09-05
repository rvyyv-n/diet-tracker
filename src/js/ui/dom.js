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
