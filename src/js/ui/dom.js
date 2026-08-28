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
