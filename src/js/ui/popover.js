/**
 * popover.js — wire a trigger button to a floating panel.
 *
 * Handles the fiddly bits the date controls share: toggle on trigger click,
 * close on a pointerdown anywhere outside, close on Escape (returning focus to
 * the trigger). Positioning is left to CSS — the panel is absolutely placed
 * under the trigger. Only one concern lives here: open/close and dismissal.
 */
export function attachPopover(root, trigger, panel, { onOpen } = {}) {
  let open = false;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      document.addEventListener("pointerdown", onOutside, true);
      document.addEventListener("keydown", onKey, true);
      onOpen?.();
    } else {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("keydown", onKey, true);
    }
  }

  function onOutside(event) {
    if (!root.contains(event.target)) setOpen(false);
  }

  function onKey(event) {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.focus();
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
