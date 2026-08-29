/**
 * date-calendar.js — a month-grid calendar in a popover.
 *
 * Used for the plan start date, which sits on or near today, so month stepping
 * is enough; year arrows are there for completeness. Weeks run Monday-first.
 * Always holds a value (the caller seeds it with today), so there is nothing to
 * validate.
 *
 * Pass `max` (an ISO date) to forbid later days — those cells render disabled
 * and unclickable. The weigh-in picker uses this so a reading can't be filed in
 * the future.
 *
 * Returns { node, get, set, onChange }.
 */
import { el } from "./dom.js";
import { attachPopover } from "./popover.js";
import { todayISO, humanDate, daysInMonth, MONTH_NAMES } from "../core/dates.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function dateCalendar({ value, max = null }) {
  let selected = value || todayISO();
  let [viewY, viewM] = selected.split("-").map(Number); // month on screen

  const valueEl = el("span", { class: "cal__value" });
  const trigger = el(
    "button",
    { class: "cal__trigger", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false" },
    valueEl,
    el("span", { class: "cal__caret", "aria-hidden": "true" }, "▾"),
  );

  const heading = el("span", { class: "cal__heading" });
  const grid = el("div", { class: "cal__grid" });
  const panel = el(
    "div",
    { class: "cal__panel", hidden: "", role: "dialog", "aria-label": "Choose a date" },
    el(
      "div",
      { class: "cal__bar" },
      navBtn("«", "Previous year", () => shift(0, -1)),
      navBtn("‹", "Previous month", () => shift(-1, 0)),
      heading,
      navBtn("›", "Next month", () => shift(1, 0)),
      navBtn("»", "Next year", () => shift(0, 1)),
    ),
    el("div", { class: "cal__weekdays" }, ...WEEKDAYS.map((w) => el("span", {}, w))),
    grid,
  );
  const root = el("div", { class: "cal" }, trigger, panel);

  const pop = attachPopover(root, trigger, panel, { onOpen: paintGrid });
  let onChange = null;

  function navBtn(glyph, label, fn) {
    const b = el("button", { class: "cal__nav", type: "button", "aria-label": label }, glyph);
    b.addEventListener("click", fn);
    return b;
  }

  function shift(dMonth, dYear) {
    viewM += dMonth;
    viewY += dYear;
    if (viewM < 1) { viewM = 12; viewY -= 1; }
    if (viewM > 12) { viewM = 1; viewY += 1; }
    paintGrid();
  }

  function paintTrigger() {
    valueEl.textContent = humanDate(selected);
  }

  function paintGrid() {
    heading.textContent = `${MONTH_NAMES[viewM - 1]} ${viewY}`;
    const lead = (new Date(viewY, viewM - 1, 1).getDay() + 6) % 7; // Mon = 0
    const total = daysInMonth(viewY, viewM);
    const today = todayISO();

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(el("span", { class: "cal__cell is-blank" }));
    for (let dm = 1; dm <= total; dm++) {
      const iso = `${viewY}-${String(viewM).padStart(2, "0")}-${String(dm).padStart(2, "0")}`;
      const disabled = max != null && iso > max;
      const btn = el(
        "button",
        {
          class:
            "cal__cell" +
            (iso === selected ? " is-selected" : "") +
            (iso === today ? " is-today" : "") +
            (disabled ? " is-disabled" : ""),
          type: "button",
          disabled: disabled ? "" : null,
        },
        String(dm),
      );
      if (!disabled) {
        btn.addEventListener("click", () => {
          selected = iso; // viewY / viewM already match the shown month
          paintTrigger();
          pop.close();
          trigger.focus();
          onChange?.(selected);
        });
      }
      cells.push(btn);
    }
    grid.replaceChildren(...cells);
  }

  paintTrigger();

  return {
    node: root,
    get: () => selected,
    set: (iso) => {
      selected = iso;
      [viewY, viewM] = iso.split("-").map(Number);
      paintTrigger();
    },
    onChange: (fn) => { onChange = fn; },
  };
}
