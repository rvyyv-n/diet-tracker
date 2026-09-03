/**
 * days.js — persistence for daily intake records.
 *
 * Every day lives in ONE stored record, keyed by date inside a `days` map:
 *
 *   wgt:days  ->  { days: { "2026-08-29": <day>, ... }, schemaVersion: N }
 *
 * One record rather than one-key-per-day is deliberate. `storage.js` exposes no
 * way to enumerate keys, and the adjustment engine (a later pass) has to read
 * the whole history at once for its four-week rolling average. A single map is
 * one read, and one target for any future migration. The `days` nesting keeps
 * the date keys clear of the `schemaVersion` stamp `storage.save` adds.
 *
 * `day.js` owns the shape of a <day> and the pure transforms on it; this module
 * only loads and stores.
 */

import { load, save } from "./storage.js";

const RECORD = "days";

function readMap() {
  return load(RECORD, { days: {} }).days ?? {};
}

/** The stored day for an ISO date, or null when nothing is saved yet. */
export function getDay(dateISO) {
  return readMap()[dateISO] ?? null;
}

/** Insert or replace a day, keyed by its own `date`. Returns save() success. */
export function putDay(day) {
  const days = readMap();
  days[day.date] = day;
  return save(RECORD, { days });
}

/** Every stored day, oldest first — the form the adjustment engine wants. */
export function allDays() {
  return Object.values(readMap()).sort((a, b) => a.date.localeCompare(b.date));
}
