/**
 * day.js — one day's intake, derived from the plan.
 *
 * A day record tracks which blocks were completed and which rotation option is
 * chosen for each meal slot. It never stores calorie numbers: totals are summed
 * on demand from plan.js, using the SELECTED rotation option's value rather than
 * the parent block's nominal one (docs/plan-spec.md — L2 at 630 kcal and L3 at
 * 565 do not share a total).
 *
 * Every function here is pure: it takes a day record and returns a new one, or a
 * derived reading. Persistence is the caller's job.
 */

import {
  activeBlocks,
  blockById,
  phaseTarget,
  phaseAddOns,
  rotationOptionById,
  defaultRotations,
  ADDON_IDS,
  normaliseAddOns,
} from "./plan.js";
import { addDays } from "./dates.js";
import { dayExtras, extrasTotals } from "./extras.js";

/**
 * Intake status cut-offs, as a fraction of the phase's kcal target. The naming
 * follows the deliberate weight-gain inversion: being well UNDER is the failure
 * state, so the low end is what turns red.
 */
const ON_TRACK_AT = 1.0; // at or above target
const PARTIAL_AT = 0.7; // partway there; below this is "low"

/**
 * A fresh day at a given phase: nothing completed, rotations at their defaults
 * unless `rotations` is given (pass 14 — sticky rotations: the caller seeds a
 * new day from the last recorded one, since a fixed slot resetting to BR1 / L1
 * / D1 / standard every day just means re-picking what you almost always eat).
 * A partial seed is topped up over the defaults, so a day carried forward from
 * before a rotation slot existed (e.g. `shake2`) still gets every key filled.
 */
export function newDay(date, phaseId, addOns = phaseAddOns(phaseId), rotations = null) {
  return {
    date, // ISO "YYYY-MM-DD"
    phaseId,
    addOns: [...addOns], // which add-on blocks are on, snapshot at creation so a
    //                      later plan change (the engine) can't rewrite this day
    bonus: [], // add-on block ids added by hand for this day only (pass 8). Kept
    //            apart from `addOns` because the two carry different meaning: an
    //            add-on is the plan for the day and counts toward adherence, a
    //            bonus is extra and counts only toward the day's kcal / protein.
    completed: {}, // block id -> true; an absent key means not done
    rotations: { ...defaultRotations(), ...rotations },
    appetite: null, // optional per-day appetite check, one of APPETITE_VALUES
    extras: [], // off-plan foods: { id, name, kcal, proteinG } (core/extras.js
    //             owns the shape and the transforms). It lives on the day, not
    //             its own record, because it changes that day's total — see
    //             dayTotals() below.
  };
}

/**
 * The add-ons in force for a day: its own snapshot, or — for a day recorded
 * before add-ons were tracked — the default set for its phase.
 */
export function dayAddOns(day) {
  return day.addOns ?? phaseAddOns(day.phaseId);
}

/** The bonus (hand-added, that-day-only) block ids for a day. */
export function dayBonus(day) {
  return day.bonus ?? [];
}

/**
 * Add an add-on block to a day by hand. If the block is one of the day's phase
 * defaults — i.e. one the user dropped earlier with removeBlock — it is restored
 * to `addOns` (back into the plan). Otherwise it is added as a `bonus`: extra
 * kcal, no change to the adherence denominator. A no-op for a non-add-on id or a
 * block already on the day.
 */
export function addBlock(day, blockId) {
  if (!ADDON_IDS.includes(blockId)) return day;
  if (dayAddOns(day).includes(blockId) || dayBonus(day).includes(blockId)) return day;
  if (phaseAddOns(day.phaseId).includes(blockId)) {
    return { ...day, addOns: normaliseAddOns([...dayAddOns(day), blockId]) };
  }
  return { ...day, bonus: normaliseAddOns([...dayBonus(day), blockId]) };
}

/**
 * Remove an add-on block from a day, whether it sat in `addOns` (dropping a
 * phase default — the one path where adherence can be moved by hand; the kcal
 * target does not move, so intakeStatus still measures against the full phase
 * figure) or in `bonus`. Its completed flag is cleared too.
 */
export function removeBlock(day, blockId) {
  const completed = { ...day.completed };
  delete completed[blockId];
  return {
    ...day,
    addOns: dayAddOns(day).filter((id) => id !== blockId),
    bonus: dayBonus(day).filter((id) => id !== blockId),
    completed,
  };
}

/** Toggle a block's completed flag, returning a new day record. */
export function toggleBlock(day, blockId) {
  const completed = { ...day.completed };
  if (completed[blockId]) delete completed[blockId];
  else completed[blockId] = true;
  return { ...day, completed };
}

/** Choose a rotation option for a slot ("breakfast" | "lunch" | "dinner" | "shake"). */
export function chooseRotation(day, slot, optionId) {
  return { ...day, rotations: { ...day.rotations, [slot]: optionId } };
}

/**
 * The appetite check is a three-way tap scale, low on the Today screen and
 * entirely optional. It is a record for the user and the seam the v2 engine
 * reads (appetite is the documented bottleneck, plan-spec.md); nothing computes
 * over it in 1.5.
 */
export const APPETITE_VALUES = ["stuffed", "fine", "hungry"];

/**
 * Set the day's appetite check to one of APPETITE_VALUES, or clear it. Tapping
 * the value that is already set clears it back to null; an unrecognised value
 * clears it too.
 */
export function setAppetite(day, value) {
  const next = APPETITE_VALUES.includes(value) ? value : null;
  return { ...day, appetite: next === day.appetite ? null : next };
}

/**
 * The kcal / protein a single block contributes, resolving through the day's
 * rotation choice when the block has one. Off-plan meals still count here at
 * their planned value — ticking the block is the whole input; the scale corrects
 * the drift later.
 */
export function blockValue(day, blockId) {
  const block = blockById(blockId);
  if (!block) return { kcal: 0, proteinG: 0 };
  if (block.rotation) {
    const option = rotationOptionById(block.rotation, day.rotations[block.rotation]);
    if (option) return { kcal: option.kcal, proteinG: option.proteinG };
  }
  return { kcal: block.kcal, proteinG: block.proteinG };
}

/**
 * Totals for the day: calories and protein from completed blocks and logged
 * extras, and how many things are done.
 *
 * `total` is the plan block count only — bonus blocks and extras add kcal /
 * protein the moment they're logged but never grow the denominator (bonus:
 * pass 8; extras: pass 24, the identical semantics — eating off-plan raises
 * intake, but it isn't part of the plan adherence measures). `planDone` counts
 * completed plan blocks (0..total) and is what adherence reads; `done` also
 * counts ticked bonus blocks and logged extras, so it can exceed `total` — it
 * answers "was this day touched at all" (see the adherence strip in
 * today.js), not an adherence figure.
 */
export function dayTotals(day) {
  const active = activeBlocks(dayAddOns(day));
  let kcal = 0;
  let proteinG = 0;
  let planDone = 0;
  for (const block of active) {
    if (!day.completed[block.id]) continue;
    const v = blockValue(day, block.id);
    kcal += v.kcal;
    proteinG += v.proteinG;
    planDone += 1;
  }
  let bonusDone = 0;
  for (const id of dayBonus(day)) {
    if (!day.completed[id]) continue;
    const v = blockValue(day, id);
    kcal += v.kcal;
    proteinG += v.proteinG;
    bonusDone += 1;
  }
  const extras = extrasTotals(day);
  kcal += extras.kcal;
  proteinG += extras.proteinG;
  return {
    kcal,
    proteinG,
    planDone,
    done: planDone + bonusDone + dayExtras(day).length,
    total: active.length,
  };
}

/**
 * Where the day's calories sit against the phase target, using the weight-gain
 * inversion: "low" (well under) is the failure, not "over".
 * Returns "on-track" | "partial" | "low".
 */
export function intakeStatus(day) {
  const target = phaseTarget(day.phaseId).kcal;
  if (!target) return "low";
  const ratio = dayTotals(day).kcal / target;
  if (ratio >= ON_TRACK_AT) return "on-track";
  if (ratio >= PARTIAL_AT) return "partial";
  return "low";
}

/**
 * Whether a day can still be edited. Today is always open; yesterday stays open
 * through the whole of today and then closes (docs/plan-spec.md — "missed_days":
 * backfillable for 24 h). Anything older is read-only, so the adherence history
 * that feeds the adjustment engine can't be rewritten after the fact.
 */
export function isDayEditable(day, todayIso) {
  return day.date === todayIso || day.date === addDays(todayIso, -1);
}
