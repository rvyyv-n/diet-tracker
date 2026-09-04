/**
 * grocery.js — what's been ticked off the weekly grocery list, and the reset.
 *
 * plan.js owns the list itself (GROCERY_LIST). This module owns only the checked
 * state for the current week, in its own record mirroring weights.js / recipes.js:
 *
 *   wgt:grocery  ->  { weekStart: "2026-08-31", checked: { "<key>": true, … }, schemaVersion: N }
 *
 * `weekStart` is the Monday (see core/dates.js startOfWeekISO) of the week the
 * ticks belong to. Every read compares it to the current Monday; once the week
 * has rolled over the ticks read as empty, so the list resets itself every
 * Monday with no need for the app to be open on the day. The stale record is not
 * rewritten until the next toggle — merely opening the app in a new week costs
 * no write.
 *
 * A new record at the current SCHEMA_VERSION needs no migration (see the pass-23
 * note in storage.js): it simply starts existing.
 */

import { load, save } from "./storage.js";
import { startOfWeekISO, todayISO } from "./dates.js";

const RECORD = "grocery";

const EMPTY = { weekStart: null, checked: {} };

/**
 * Stable identity for a list item: its section plus its name. `|` never appears
 * in a GROCERY_LIST name, so it is a safe separator. Exported so the screen and
 * a backup round trip agree on the key.
 */
export function groceryKey(section, name) {
  return `${section}|${name}`;
}

function readRaw() {
  const s = load(RECORD, EMPTY);
  return {
    weekStart: typeof s.weekStart === "string" ? s.weekStart : null,
    checked: s.checked && typeof s.checked === "object" ? s.checked : {},
  };
}

/** The live checked-map for this week — `{}` once the week has rolled over. */
export function weekChecks(onISO = todayISO()) {
  const monday = startOfWeekISO(onISO);
  const raw = readRaw();
  return raw.weekStart === monday ? raw.checked : {};
}

/** True if `key` is ticked for the current week. */
export function isGroceryChecked(key, onISO = todayISO()) {
  return Boolean(weekChecks(onISO)[key]);
}

/**
 * Flip one item's tick and persist, stamping this week's Monday as the anchor.
 * Returns the new checked-map.
 */
export function toggleGrocery(key, onISO = todayISO()) {
  const monday = startOfWeekISO(onISO);
  const checked = { ...weekChecks(onISO) };
  if (checked[key]) delete checked[key];
  else checked[key] = true;
  save(RECORD, { weekStart: monday, checked });
  return checked;
}

/** Clear every tick now, keeping this week's anchor — the manual "reset". */
export function clearGroceryChecks(onISO = todayISO()) {
  save(RECORD, { weekStart: startOfWeekISO(onISO), checked: {} });
}
