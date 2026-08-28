/**
 * listbox.js — a select replacement styled to the design system.
 *
 * The native <select> drop-down is the control the user singled out as looking
 * dated. This is a trigger button showing the current label plus a floating
 * panel of <button> options — tap or keyboard, hairline border, press states,
 * no hover. Options are `[{ value, label }]`; `value` may be any type.
 *
 * Returns { node, get, set, setOptions }.
 */
import { el } from "./dom.js";
import { attachPopover } from "./popover.js";

export function listbox({ options, value = null, placeholder = "—", ariaLabel, onChange }) {
  let opts = options;
  let current = value;

  const valueEl = el("span", { class: "lb__value" });
  const trigger = el(
    "button",
    {
      class: "lb__trigger",
      type: "button",
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "aria-label": ariaLabel,
    },
    valueEl,
    el("span", { class: "lb__caret", "aria-hidden": "true" }, "▾"),
  );

  const panel = el("div", { class: "lb__panel", hidden: "" });
  const root = el("div", { class: "lb" }, trigger, panel);

  const pop = attachPopover(root, trigger, panel, { onOpen: scrollToCurrent });

  function labelFor(v) {
    return opts.find((o) => o.value === v)?.label ?? null;
  }

  function paint() {
    const label = labelFor(current);
    valueEl.textContent = label ?? placeholder;
    valueEl.classList.toggle("is-placeholder", label == null);

    panel.replaceChildren(
      ...opts.map((o) => {
        const picked = o.value === current;
        const btn = el(
          "button",
          { class: `lb__opt${picked ? " is-picked" : ""}`, type: "button" },
          o.label,
        );
        btn.addEventListener("click", () => {
          current = o.value;
          paint();
          pop.close();
          trigger.focus();
          onChange?.(current);
        });
        return btn;
      }),
    );
  }

  function scrollToCurrent() {
    panel.querySelector(".is-picked")?.scrollIntoView({ block: "nearest" });
  }

  paint();

  return {
    node: root,
    get: () => current,
    set: (v) => {
      current = v;
      paint();
    },
    setOptions: (nextOpts, nextValue) => {
      opts = nextOpts;
      if (nextValue !== undefined) current = nextValue;
      paint();
    },
  };
}
