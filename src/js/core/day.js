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
} from "./plan.js";
import { addDays } from "./dates.js";

/**
 * Intake status cut-offs, as a fraction of the phase's kcal target. The naming
 * follows the deliberate weight-gain inversion: being well UNDER is the failure
 * state, so the low end is what turns red.
 */
const ON_TRACK_AT = 1.0; // at or above target
const PARTIAL_AT = 0.7; // partway there; below this is "low"

/** A fresh day at a given phase: nothing completed, rotations at their defaults. */
export function newDay(date, phaseId, addOns = phaseAddOns(phaseId)) {
  return {
    date, // ISO "YYYY-MM-DD"
    phaseId,
    addOns: [...addOns], // which add-on blocks are on, snapshot at creation so a
    //                      later plan change (the engine) can't rewrite this day
    completed: {}, // block id -> true; an absent key means not done
    rotations: defaultRotations(),
    appetite: null, // optional free note — appetite is the real bottleneck
    extras: [], // off-plan foods: { name, kcal, proteinG }. Reserved for the v2
    //             custom-recipe feature; nothing reads it yet. It lives on the
    //             day (not its own record) because it changes that day's total.
  };
}

/**
 * The add-ons in force for a day: its own snapshot, or — for a day recorded
 * before add-ons were tracked — the default set for its phase.
 */
export function dayAddOns(day) {
  return day.addOns ?? phaseAddOns(day.phaseId);
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

/** Attach or clear the day's appetite note. */
export function setAppetite(day, note) {
  return { ...day, appetite: note || null };
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
 * Totals for the day: calories and protein from completed blocks, and how many
 * of the phase's active blocks are done.
 */
export function dayTotals(day) {
  const active = activeBlocks(dayAddOns(day));
  let kcal = 0;
  let proteinG = 0;
  let done = 0;
  for (const block of active) {
    if (!day.completed[block.id]) continue;
    const v = blockValue(day, block.id);
    kcal += v.kcal;
    proteinG += v.proteinG;
    done += 1;
  }
  return { kcal, proteinG, done, total: active.length };
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

/** Day-level completion fraction (0–1). Weekly adherence is computed elsewhere. */
export function dayAdherence(day) {
  const { done, total } = dayTotals(day);
  return total ? done / total : 0;
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
