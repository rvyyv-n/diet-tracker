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
