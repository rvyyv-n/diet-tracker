/**
 * date-dropdowns.js — day / month / year as three listboxes.
 *
 * Used for the date of birth, where the value sits ~15–20 years back and a
 * calendar's month paging would be tedious. The day list re-clamps when the
 * month or year changes (31 → 30, or Feb 29 → 28). Empty until all three are
 * chosen; `get()` returns null until then, so the caller's required-field
 * validation works unchanged.
 *
 * Returns { node, get, set, onChange }.
 */
import { el } from "./dom.js";
import { listbox } from "./listbox.js";
import { MONTH_NAMES, daysInMonth } from "../core/dates.js";

export function dateDropdowns({ value, yearFrom, yearTo }) {
  let [y, m, d] = value ? value.split("-").map(Number) : [null, null, null];
  let onChange = null;

  const yearOpts = [];
  for (let yr = yearTo; yr >= yearFrom; yr--) yearOpts.push({ value: yr, label: String(yr) });
  const monthOpts = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }));

  function dayOpts() {
    const max = y && m ? daysInMonth(y, m) : 31;
    const out = [];
    for (let i = 1; i <= max; i++) out.push({ value: i, label: String(i) });
    return out;
  }

  const dayBox = listbox({
    options: dayOpts(), value: d, placeholder: "Day", ariaLabel: "Day",
    onChange: (v) => { d = v; emit(); },
  });
  const monthBox = listbox({
    options: monthOpts, value: m, placeholder: "Month", ariaLabel: "Month",
    onChange: (v) => { m = v; reclampDay(); emit(); },
  });
  const yearBox = listbox({
    options: yearOpts, value: y, placeholder: "Year", ariaLabel: "Year",
    onChange: (v) => { y = v; reclampDay(); emit(); },
  });

  function reclampDay() {
    if (y && m && d && d > daysInMonth(y, m)) d = daysInMonth(y, m);
    dayBox.setOptions(dayOpts(), d);
  }

  function emit() {
    onChange?.(get());
  }

  function get() {
    if (!y || !m || !d) return null;
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const node = el("div", { class: "date-dmy" }, dayBox.node, monthBox.node, yearBox.node);

  return {
    node,
    get,
    set: (iso) => {
      [y, m, d] = iso.split("-").map(Number);
      yearBox.set(y);
      monthBox.set(m);
      dayBox.setOptions(dayOpts(), d);
    },
    onChange: (fn) => { onChange = fn; },
  };
}
