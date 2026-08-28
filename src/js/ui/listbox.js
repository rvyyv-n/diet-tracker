/**
 * listbox.js — a select replacement styled to the design system.
 *
 * The native <select> drop-down is the control the user singled out as looking
 * dated. This is a trigger button showing the current label plus a floating
 * panel of <button> options — hairline border, press states, no hover.
 *
 * Keyboard, matching a native <select> (focus the trigger, panel open or not):
 *   - type characters   jump to the option whose label starts with what you
 *                       typed ("j","u","n" → June; "2","0","0","8" → 2008),
 *                       buffer clears after a short pause
 *   - ↑ / ↓             previous / next option
 *   - Home / End        first / last option
 *   - Enter / Space     open, or (when open) confirm and close
 *   - Esc               close
 *
 * Options are `[{ value, label }]`; `value` may be any type.
 * Returns { node, get, set, setOptions }.
 */
import { el } from "./dom.js";
import { attachPopover } from "./popover.js";

const TYPEAHEAD_RESET_MS = 800;

export function listbox({ options, value = null, placeholder = "—", ariaLabel, onChange }) {
  let opts = options;
  let current = value;
  let typed = "";
  let typedTimer = null;

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
        btn.addEventListener("click", () => choose(o.value, { close: true }));
        return btn;
      }),
    );
  }

  function scrollToCurrent() {
    panel.querySelector(".is-picked")?.scrollIntoView({ block: "nearest" });
  }

  /** Set the value, repaint, notify. Closes the panel only when asked. */
  function choose(v, { close = false } = {}) {
    if (v !== current) {
      current = v;
      paint();
      onChange?.(current);
    }
    if (close) pop.close();
    else scrollToCurrent();
    trigger.focus();
  }

  function moveBy(delta) {
    if (!opts.length) return;
    const at = opts.findIndex((o) => o.value === current);
    const next = at < 0 ? (delta > 0 ? 0 : opts.length - 1) : (at + delta + opts.length) % opts.length;
    choose(opts[next].value);
  }

  function typeAhead(ch) {
    clearTimeout(typedTimer);
    typed += ch.toLowerCase();
    typedTimer = setTimeout(() => { typed = ""; }, TYPEAHEAD_RESET_MS);
    const hit = opts.find((o) => String(o.label).toLowerCase().startsWith(typed));
    if (hit) choose(hit.value);
  }

  trigger.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveBy(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveBy(-1);
        break;
      case "Home":
        event.preventDefault();
        if (opts.length) choose(opts[0].value);
        break;
      case "End":
        event.preventDefault();
        if (opts.length) choose(opts[opts.length - 1].value);
        break;
      case "Enter":
      case " ":
        // fall through to the button's native click → attachPopover toggles
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          typeAhead(event.key);
        }
    }
  });

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
