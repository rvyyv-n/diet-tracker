/**
 * popover.js — wire a trigger button to a floating panel.
 *
 * Handles the fiddly bits the date controls share: toggle on trigger click,
 * close on a pointerdown anywhere outside, close on Escape (returning focus to
 * the trigger), and close when focus leaves the control (pass 59) so a Tab
 * away doesn't strand an open panel. Positioning is left to CSS — the panel
 * is absolutely placed under the trigger. Only one concern lives here:
 * open/close and dismissal.
 *
 * `trapFocus` (pass 59) keeps Tab inside the panel while it's open, for a
 * panel that takes focus itself (the calendar dialog). A listbox keeps focus
 * on its trigger instead, so it doesn't use it.
 */
const FOCUSABLE = "button:not([disabled]):not([tabindex='-1']), [tabindex='0']";

export function attachPopover(root, trigger, panel, { onOpen, trapFocus = false } = {}) {
  let open = false;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      document.addEventListener("pointerdown", onOutside, true);
      document.addEventListener("keydown", onKey, true);
      root.addEventListener("focusout", onFocusOut);
      onOpen?.();
    } else {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("keydown", onKey, true);
      root.removeEventListener("focusout", onFocusOut);
    }
  }

  // relatedTarget is null when focus goes nowhere (a click on blank page, or
  // a panel repainting under the focused node) — the pointerdown handler
  // already covers the first, and the second must not close the panel.
  function onFocusOut(event) {
    if (event.relatedTarget && !root.contains(event.relatedTarget)) setOpen(false);
  }

  function onOutside(event) {
    if (!root.contains(event.target)) setOpen(false);
  }

  function onKey(event) {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.focus();
    } else if (event.key === "Tab" && trapFocus) {
      const stops = [...panel.querySelectorAll(FOCUSABLE)];
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (event.shiftKey ? at === first || !panel.contains(at) : at === last || !panel.contains(at)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }

  trigger.addEventListener("click", () => setOpen(!open));

  return {
    close: () => setOpen(false),
    get isOpen() {
      return open;
    },
  };
}
