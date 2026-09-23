import { describe, it, expect } from "vitest";
import { phaseTarget, activeBlocks, normaliseAddOns, scaleGroceryQty, PHASES } from "./plan.js";

describe("phaseTarget", () => {
  it("reads each phase's kcal and protein", () => {
    for (const p of PHASES) expect(phaseTarget(p.id)).toEqual({ kcal: p.kcal, proteinG: p.proteinG });
  });

  it("is zero for an unknown phase", () => {
    expect(phaseTarget(99)).toEqual({ kcal: 0, proteinG: 0 });
  });
});

describe("normaliseAddOns", () => {
  it("orders, dedupes and drops unknown ids", () => {
    expect(normaliseAddOns(["A3", "B1", "A1", "A3", "zz"])).toEqual(["A1", "A3"]);
  });

  it("is empty for nothing", () => {
    expect(normaliseAddOns([])).toEqual([]);
  });
});

describe("activeBlocks", () => {
  it("is the four core blocks with no add-ons", () => {
    expect(activeBlocks().map((b) => b.id)).toEqual(["B1", "B2", "B3", "B4"]);
  });

  it("slots add-ons in by time of day", () => {
    expect(activeBlocks(["A2", "A1", "A3"]).map((b) => b.id)).toEqual(["B1", "B2", "B3", "A1", "A3", "B4", "A2"]);
  });

  it("ignores core ids passed as add-ons", () => {
    expect(activeBlocks(["B1"])).toHaveLength(4);
  });
});

describe("scaleGroceryQty", () => {
  const milk = { qty: 7.5, step: 0.5 };

  it("leaves Phase 2, the baseline, unchanged", () => {
    expect(scaleGroceryQty(milk, 2)).toBe(7.5);
  });

  it("scales by the ratio of the phase kcal targets, rounded to the step", () => {
    // 7.5 × 2565 / 3110 = 6.19 → 6; 7.5 × 3690 / 3110 = 8.90 → 9
    expect(scaleGroceryQty(milk, 1)).toBe(6);
    expect(scaleGroceryQty(milk, 3)).toBe(9);
  });

  it("never goes below one step", () => {
    expect(scaleGroceryQty({ qty: 1, step: 6 }, 1)).toBe(6);
  });

  it("keeps an unmeasured staple null", () => {
    expect(scaleGroceryQty({ qty: null, step: 1 }, 3)).toBeNull();
  });

  it("uses the baseline for an unknown phase", () => {
    expect(scaleGroceryQty(milk, 99)).toBe(7.5);
  });
});
