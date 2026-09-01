/**
 * trend.js — the derived numbers the adjustment engine reads.
 *
 * Weight is noisy day to day (water, digestion swing it ±1 kg with no bearing
 * on real gain — plan-spec.md), so everything here works on ONE figure per plan
 * week and a rolling average on top of that. All pure: it takes plain records
 * and returns plain arrays.
 *
 *   weeklyWeights   one kg per plan week (the last reading in the week)
 *   weeklyGains     week-over-week change in kg
 *   rollingGain     N-week rolling average of that change, in kg/week
 *   weeklyAdherence blocks completed vs available, per plan week
 */

import { planWeek } from "./dates.js";
import { dayTotals } from "./day.js";

const DEFAULT_WINDOW = 4;

/**
 * Collapse raw readings to one kg per plan week: the latest reading dated in
 * that week. `readings` is `[{ date, kg }]` (see weights.allWeights).
 */
export function weeklyWeights(readings, startISO) {
  const byWeek = new Map();
  for (const r of readings) {
    const wk = planWeek(startISO, r.date);
    const held = byWeek.get(wk);
    if (!held || r.date > held.date) byWeek.set(wk, r);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, r]) => ({ week, date: r.date, kg: r.kg }));
}

/** Week-over-week change, in kg. One fewer entry than `weeklyWeights`. */
export function weeklyGains(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) {
    out.push({ week: series[i].week, gainKg: round2(series[i].kg - series[i - 1].kg) });
  }
  return out;
}

/**
 * Rolling average of the weekly gain, in kg/week. Each entry averages up to
 * `window` of the most recent gains ending at that week — so early weeks
 * average fewer samples rather than being dropped.
 */
export function rollingGain(gains, window = DEFAULT_WINDOW) {
  return gains.map((_, i) => {
    const slice = gains.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, g) => s + g.gainKg, 0) / slice.length;
    return { week: gains[i].week, avgKgPerWeek: round2(avg), samples: slice.length };
  });
}

/**
 * Adherence per plan week: completed blocks over available blocks across every
 * day recorded in that week. `days` is days.allDays(). Returns
 * `[{ week, pct, dayCount }]`, weeks with no recorded day omitted.
 */
export function weeklyAdherence(days, startISO) {
  const byWeek = new Map();
  for (const day of days) {
    const wk = planWeek(startISO, day.date);
    // planDone, not done: a hand-added bonus block adds kcal but must never
    // push weekly adherence above 100% (pass 8 decision).
    const { planDone, total } = dayTotals(day);
    const acc = byWeek.get(wk) ?? { done: 0, total: 0, dayCount: 0 };
    acc.done += planDone;
    acc.total += total;
    acc.dayCount += 1;
    byWeek.set(wk, acc);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, a]) => ({
      week,
      pct: a.total ? Math.round((a.done / a.total) * 100) : 0,
      dayCount: a.dayCount,
    }));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
