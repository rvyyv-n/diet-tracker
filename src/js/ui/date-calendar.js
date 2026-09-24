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
 * Keyboard (pass 59), following the ARIA date-picker dialog: opening moves
 * focus onto the selected day, and only that one day is in the tab order.
 *   - ← / →             previous / next day
 *   - ↑ / ↓             same day last / next week
 *   - Home / End        start / end of the week (Monday / Sunday)
 *   - PageUp / PageDown previous / next month; with Shift, year
 *   - Enter / Space     pick the focused day
 *   - Tab               cycles the month buttons and the day, never out
 *   - Esc               close, focus back on the trigger
 * Moving past the edge of the month turns the page; `max` is a wall.
 *
 * Returns { node, get, set, onChange }.
 */
import { el } from "./dom.js";
import { icon } from "./icons.js";
import { attachPopover } from "./popover.js";
import { todayISO, humanDate, daysInMonth, addDays, startOfWeekISO, MONTH_NAMES } from "../core/dates.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** An ISO date moved by whole months, the day clamped to the new month's length. */
function addMonths(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** "Thursday 24 September 2026" — what a screen reader hears for a day. */
function spokenDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return `${WEEKDAY_NAMES[dow]} ${humanDate(iso)}`;
}

export function dateCalendar({ value, max = null }) {
  let selected = value || todayISO();
  let [viewY, viewM] = selected.split("-").map(Number); // month on screen
  let focusISO = selected; // the one day in the tab order

  const valueEl = el("span", { class: "cal__value" });
  const trigger = el(
    "button",
    { class: "cal__trigger", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false" },
    valueEl,
    el("span", { class: "cal__caret", "aria-hidden": "true" }, icon("chevron-down", { size: 14 })),
  );

  // Polite live region: a month turned by keyboard is announced.
  const heading = el("span", { class: "cal__heading", "aria-live": "polite" });
  const grid = el("div", { class: "cal__grid" });
  grid.addEventListener("keydown", onGridKey);
  const panel = el(
    "div",
    { class: "cal__panel", hidden: "", role: "dialog", "aria-label": "Choose a date" },
    el(
      "div",
      { class: "cal__bar" },
      navBtn("chevrons-left", "Previous year", () => shift(0, -1)),
      navBtn("chevron-left", "Previous month", () => shift(-1, 0)),
      heading,
      navBtn("chevron-right", "Next month", () => shift(1, 0)),
      navBtn("chevrons-right", "Next year", () => shift(0, 1)),
    ),
    el("div", { class: "cal__weekdays" }, ...WEEKDAYS.map((w) => el("span", {}, w))),
    grid,
  );
  const root = el("div", { class: "cal" }, trigger, panel);

  const pop = attachPopover(root, trigger, panel, { onOpen: openAtSelected, trapFocus: true });
  let onChange = null;

  // Lucide glyphs rather than the « ‹ › » characters this used to type. Those are
  // font-dependent, sit on the text baseline inside a 28px box, and read as a
  // different family from every other control in the app.
  function navBtn(glyph, label, fn) {
    const b = el(
      "button",
      { class: "cal__nav", type: "button", "aria-label": label },
      icon(glyph, { size: 16 }),
    );
    b.addEventListener("click", fn);
    return b;
  }

  /** Past `max` isn't a place focus can go. */
  function clamp(iso) {
    return max != null && iso > max ? max : iso;
  }

  function showMonthOf(iso) {
    [viewY, viewM] = iso.split("-").map(Number);
  }

  function openAtSelected() {
    focusISO = clamp(selected);
    showMonthOf(focusISO);
    paintGrid();
    focusDay();
  }

  function focusDay() {
    grid.querySelector('[tabindex="0"]')?.focus();
  }

  // The month buttons carry the roving day along, so there's always one day
  // in the tab order on the page being shown.
  function shift(dMonth, dYear) {
    focusISO = clamp(addMonths(focusISO, dMonth + dYear * 12));
    showMonthOf(focusISO);
    paintGrid();
  }

  function onGridKey(event) {
    let next = null;
    switch (event.key) {
      case "ArrowLeft": next = addDays(focusISO, -1); break;
      case "ArrowRight": next = addDays(focusISO, 1); break;
      case "ArrowUp": next = addDays(focusISO, -7); break;
      case "ArrowDown": next = addDays(focusISO, 7); break;
      case "Home": next = startOfWeekISO(focusISO); break;
      case "End": next = addDays(startOfWeekISO(focusISO), 6); break;
      case "PageUp": next = addMonths(focusISO, event.shiftKey ? -12 : -1); break;
      case "PageDown": next = addMonths(focusISO, event.shiftKey ? 12 : 1); break;
      default: return; // Enter / Space fall through to the button's own click
    }
    event.preventDefault();
    focusISO = clamp(next);
    showMonthOf(focusISO);
    paintGrid();
    focusDay();
  }

  function paintTrigger() {
    valueEl.textContent = humanDate(selected);
  }

  // The screens that host this rebuild their DOM on every render, so an
  // onChange that updates state replaces this whole control, and the focus
  // just returned to the trigger goes with it. Once the re-render has landed,
  // hand focus to whichever calendar trigger now sits under the nearest
  // ancestor that survived. A no-op when nothing was replaced.
  function lineage(node) {
    const out = [];
    for (let n = node.parentElement; n; n = n.parentElement) out.push(n);
    return out;
  }

  function refocusSuccessor(ancestors) {
    setTimeout(() => {
      if (trigger.isConnected) return;
      const holder = ancestors.find((n) => n.isConnected);
      holder?.querySelector(".cal__trigger")?.focus();
    });
  }

  function paintGrid() {
    // Only on a real month change: the heading is a live region, and
    // rewriting the same text re-announces it on every arrow key.
    const title = `${MONTH_NAMES[viewM - 1]} ${viewY}`;
    if (heading.textContent !== title) heading.textContent = title;
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
          tabindex: iso === focusISO ? "0" : "-1",
          "aria-label": spokenDate(iso),
          "aria-pressed": iso === selected ? "true" : "false",
          "aria-current": iso === today ? "date" : null,
        },
        String(dm),
      );
      if (!disabled) {
        btn.addEventListener("click", () => {
          selected = iso; // viewY / viewM already match the shown month
          focusISO = iso;
          paintTrigger();
          pop.close();
          trigger.focus();
          const ancestors = lineage(root);
          onChange?.(selected);
          refocusSuccessor(ancestors);
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
      focusISO = iso;
      showMonthOf(iso);
      paintTrigger();
    },
    onChange: (fn) => { onChange = fn; },
  };
}
