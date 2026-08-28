/**
 * weights.js — persistence for the weekly weigh-in.
 *
 * One stored record, a date → kg map, mirroring days.js:
 *
 *   wgt:weights  ->  { weights: { "2026-08-31": 58.4, ... }, schemaVersion: 1 }
 *
 * The plan asks for one reading a week (same day, morning, fasted — see
 * plan-spec.md), but nothing here enforces a cadence; it stores whatever date
 * it's given. The trend maths in trend.js is what groups readings into weeks.
 */

import { load, save } from "./storage.js";

const RECORD = "weights";

function readMap() {
  return load(RECORD, { weights: {} }).weights ?? {};
}

/** The kg logged for an ISO date, or null. */
export function getWeight(dateISO) {
  return readMap()[dateISO] ?? null;
}

/** Record (or overwrite) a reading. `kg` of null/NaN removes the date. */
export function logWeight(dateISO, kg) {
  const weights = readMap();
  if (kg == null || Number.isNaN(kg)) delete weights[dateISO];
  else weights[dateISO] = kg;
  return save(RECORD, { weights });
}

/** Every reading, oldest first: `[{ date, kg }]`. */
export function allWeights() {
  return Object.entries(readMap())
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
