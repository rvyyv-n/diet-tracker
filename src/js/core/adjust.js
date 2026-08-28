/**
 * adjust.js — the adjustment engine.
 *
 * Matches the weight trend and weekly adherence against the rule table in
 * plan-spec.md (mirrored in plan.js ADJUSTMENT_RULES) and returns exactly one
 * result: a suggestion to enable or disable an add-on block, a checkup prompt,
 * an "on track", or "not enough data yet". It NEVER mutates — applySuggestion()
 * hands back a new profile for the caller to save once the user confirms.
 *
 * All rates are kg/week, read off the 4-week rolling average of the weekly
 * gain (trend.js). "Two consecutive weeks" means the last two rolling values.
 */

import { ADDON_IDS, normaliseAddOns, blockById } from "./plan.js";

const SLOW = 0.2; // below this, for 2 weeks -> add an add-on
const TARGET_LOW = 0.25;
const TARGET_HIGH = 0.5; // inside [LOW, HIGH] -> on track
const FAST = 0.7; // above this, for 2 weeks -> drop an add-on
const FLAT_EPS = 0.1; // |weekly gain| within this counts as flat
const STALL_WEEKS = 4;
const STALL_ADHERENCE = 90; // percent
const CONSECUTIVE = 2;
const MIN_WEEKLY_WEIGHTS = 3; // need 3 readings for 2 gains for a 2-week look

const kg = (n) => `${n.toFixed(2)} kg/week`;
const blockName = (id) => blockById(id)?.name ?? id;

function nextAddOn(addOns) {
  return ADDON_IDS.find((id) => !addOns.includes(id)) ?? null;
}
function lastAddOn(addOns) {
  const on = normaliseAddOns(addOns);
  return on.length ? on[on.length - 1] : null;
}
function lastN(arr, n) {
  return arr.slice(-n);
}

/**
 * @param {object} trend
 * @param {{week:number, avgKgPerWeek:number}[]} trend.rolling  rollingGain()
 * @param {{week:number, gainKg:number}[]}       trend.gains    weeklyGains()
 * @param {{week:number, pct:number}[]}          trend.adherence weeklyAdherence()
 * @param {number}                              trend.weeklyCount how many weekly weights exist
 * @param {string[]}                            addOns  profile.addOns
 * @returns {{kind:string, headline:string, detail:string, block:?string, ruleId:?string}}
 */
export function evaluate({ rolling, gains, adherence, weeklyCount }, addOns) {
  if (weeklyCount < MIN_WEEKLY_WEIGHTS || rolling.length < CONSECUTIVE) {
    return {
      kind: "insufficient",
      headline: "Keep logging",
      detail: `${MIN_WEEKLY_WEIGHTS} weekly weigh-ins are needed before the plan can adjust.`,
      block: null,
      ruleId: null,
    };
  }

  const recent = lastN(rolling, CONSECUTIVE).map((r) => r.avgKgPerWeek);
  const latest = recent[recent.length - 1];
  const adherenceByWeek = new Map(adherence.map((a) => [a.week, a.pct]));

  // too fast — safety first
  if (recent.every((r) => r > FAST)) {
    const block = lastAddOn(addOns);
    if (block) {
      return {
        kind: "remove-block",
        ruleId: "too-fast",
        headline: `Ease off — drop the ${blockName(block).toLowerCase()}`,
        detail: `Averaging ${kg(latest)} over the last ${CONSECUTIVE} weeks, above ${FAST.toFixed(2)}. Faster than this is mostly fat with no training to direct it.`,
        block,
      };
    }
    return {
      kind: "note",
      ruleId: "too-fast",
      headline: "Gaining fast",
      detail: `Averaging ${kg(latest)} with no add-on blocks to drop. Ease off the shakes or portion sizes.`,
      block: null,
    };
  }

  // stalled — flat for STALL_WEEKS weeks despite eating the plan
  const flatRun = lastN(gains, STALL_WEEKS);
  if (
    flatRun.length === STALL_WEEKS &&
    flatRun.every((g) => Math.abs(g.gainKg) <= FLAT_EPS) &&
    flatRun.every((g) => (adherenceByWeek.get(g.week) ?? 0) >= STALL_ADHERENCE)
  ) {
    return {
      kind: "checkup",
      ruleId: "stalled",
      headline: "Flat for a month — consider a checkup",
      detail: `Weight hasn't moved in ${STALL_WEEKS} weeks despite ≥${STALL_ADHERENCE}% adherence. A basic checkup is worth it before pushing calories higher.`,
      block: null,
    };
  }

  // under target — add the next add-on
  if (recent.every((r) => r < SLOW)) {
    const block = nextAddOn(addOns);
    if (block) {
      return {
        kind: "add-block",
        ruleId: "under",
        headline: `Add the ${blockName(block).toLowerCase()}`,
        detail: `Averaging ${kg(latest)} over the last ${CONSECUTIVE} weeks, below the ${TARGET_LOW.toFixed(2)} target. One more block a day should close the gap.`,
        block,
      };
    }
    return {
      kind: "note",
      ruleId: "under",
      headline: "Below target, every block already on",
      detail: `Averaging ${kg(latest)} with all add-ons enabled. Make the shakes heavier, or check for a stall.`,
      block: null,
    };
  }

  // on track
  if (latest >= TARGET_LOW && latest <= TARGET_HIGH) {
    return {
      kind: "on-track",
      ruleId: "on-target",
      headline: "On track",
      detail: `Averaging ${kg(latest)} — inside the ${TARGET_LOW.toFixed(2)}–${TARGET_HIGH.toFixed(2)} target band. No change.`,
      block: null,
    };
  }

  // between SLOW and TARGET_LOW, or between TARGET_HIGH and FAST — drifting, not
  // yet a rule trigger
  return {
    kind: "on-track",
    ruleId: null,
    headline: latest < TARGET_LOW ? "Almost on target" : "A little quick",
    detail: `Averaging ${kg(latest)}. Hold the plan and watch the next weigh-in.`,
    block: null,
  };
}

/** A new profile with the suggestion applied. Checkup/notes change nothing. */
export function applySuggestion(profile, suggestion) {
  if (suggestion.kind === "add-block") {
    return { ...profile, addOns: normaliseAddOns([...profile.addOns, suggestion.block]) };
  }
  if (suggestion.kind === "remove-block") {
    return { ...profile, addOns: profile.addOns.filter((id) => id !== suggestion.block) };
  }
  return profile;
}
