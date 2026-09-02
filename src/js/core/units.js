/**
 * units.js — weight unit display and entry.
 *
 * Weight is stored in kilograms everywhere it matters: weights.js, the trend
 * engine, the plan targets. `profile.weightUnit` ("kg" | "lb" | "st") only
 * decides how a stored figure is shown and how a typed figure is read back —
 * the same display-side discipline `heightUnit` uses for height. Nothing
 * downstream of a save ever sees pounds or stone.
 */

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;
const LB_PER_ST = 14;

export const WEIGHT_UNITS = ["kg", "lb", "st"];

/** Sanity bounds, in kg — the same loose typo check profile.validate applies. */
export const KG_MIN = 25;
export const KG_MAX = 300;

/** The short label for a unit — "kg", "lb", "st". */
export function weightUnitLabel(unit) {
  return unit === "lb" ? "lb" : unit === "st" ? "st" : "kg";
}

export function kgToLb(kg) {
  return kg * LB_PER_KG;
}

export function lbToKg(lb) {
  return lb * KG_PER_LB;
}

/** kg -> { st, lb } with pounds carrying the fraction ("10 st 6.4 lb"). */
export function kgToStLb(kg) {
  const totalLb = kgToLb(kg);
  const st = Math.floor(totalLb / LB_PER_ST);
  return { st, lb: totalLb - st * LB_PER_ST };
}

export function stLbToKg(st, lb) {
  return lbToKg((Number(st) || 0) * LB_PER_ST + (Number(lb) || 0));
}

/**
 * A stored kg value as a display string in `unit`:
 *   formatWeight(68.2, "kg") -> "68.2 kg"
 *   formatWeight(68.2, "lb") -> "150.4 lb"
 *   formatWeight(68.2, "st") -> "10 st 10.4 lb"
 * `withUnit: false` drops the trailing "kg"/"lb" for a value that already sits
 * under a unit column header. Stone always keeps its words.
 */
export function formatWeight(kg, unit = "kg", { withUnit = true } = {}) {
  if (kg == null || Number.isNaN(kg)) return "—";
  if (unit === "st") {
    const { st, lb } = kgToStLb(kg);
    return `${st} st ${lb.toFixed(1)} lb`;
  }
  const n = unit === "lb" ? kgToLb(kg) : kg;
  return withUnit ? `${n.toFixed(1)} ${weightUnitLabel(unit)}` : n.toFixed(1);
}

/**
 * A signed kg *difference* as a display string. Stone weight changes are read
 * in pounds by convention, so this only ever uses kg or lb:
 *   formatWeightDelta(0.3, "kg")  -> "+0.30 kg"
 *   formatWeightDelta(-0.9, "st") -> "-2.0 lb"
 */
export function formatWeightDelta(kgDelta, unit = "kg") {
  const inLb = unit === "lb" || unit === "st";
  const v = inLb ? kgToLb(kgDelta) : kgDelta;
  const sign = v >= 0 ? "+" : "-";
  const mag = Math.abs(v);
  return inLb ? `${sign}${mag.toFixed(1)} lb` : `${sign}${mag.toFixed(2)} kg`;
}

/** The "roughly 25–300 kg" range, restated in `unit`, for a validation hint. */
export function weightRangeText(unit = "kg") {
  if (unit === "lb") {
    return `roughly ${Math.round(kgToLb(KG_MIN))}–${Math.round(kgToLb(KG_MAX))} lb`;
  }
  if (unit === "st") {
    return `roughly ${Math.round(KG_MIN / (LB_PER_ST * KG_PER_LB))}–${Math.round(
      KG_MAX / (LB_PER_ST * KG_PER_LB),
    )} st`;
  }
  return `roughly ${KG_MIN}–${KG_MAX} kg`;
}
