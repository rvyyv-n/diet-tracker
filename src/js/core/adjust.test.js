import { describe, it, expect } from "vitest";
import { evaluate, applySuggestion } from "./adjust.js";
import { ADJUSTMENT_RULES } from "./plan.js";

// A trend whose last rolling values are `rates`, with enough weigh-ins to
// clear the "keep logging" gate. Gains and adherence default to values that
// can't trip the stall rule.
function trend(rates, { gains, adherence = [] } = {}) {
  return {
    rolling: rates.map((avgKgPerWeek, i) => ({ week: i + 2, avgKgPerWeek })),
    gains: gains ?? rates.map((gainKg, i) => ({ week: i + 2, gainKg })),
    adherence,
    weeklyCount: rates.length + 1,
  };
}

describe("evaluate", () => {
  it("covers every rule in ADJUSTMENT_RULES", () => {
    expect(ADJUSTMENT_RULES.map((r) => r.id).sort()).toEqual(["on-target", "stalled", "too-fast", "under"]);
  });

  it("asks for more data below three weekly weigh-ins", () => {
    const out = evaluate({ rolling: [{ avgKgPerWeek: 0 }], gains: [], adherence: [], weeklyCount: 2 }, []);
    expect(out.kind).toBe("insufficient");
    expect(out.ruleId).toBeNull();
  });

  describe("under: < 0.20 kg/week for 2 weeks", () => {
    it("adds the next add-on, in order A1 → A2 → A3", () => {
      expect(evaluate(trend([0.1, 0.15]), [])).toMatchObject({ kind: "add-block", ruleId: "under", block: "A1" });
      expect(evaluate(trend([0.1, 0.15]), ["A1"]).block).toBe("A2");
      expect(evaluate(trend([0.1, 0.15]), ["A1", "A2"]).block).toBe("A3");
    });

    it("notes it when every add-on is already on", () => {
      expect(evaluate(trend([0.1, 0.1]), ["A1", "A2", "A3"])).toMatchObject({ kind: "note", ruleId: "under", block: null });
    });

    it("needs both weeks slow, not just the latest", () => {
      expect(evaluate(trend([0.3, 0.1]), []).ruleId).not.toBe("under");
    });
  });

  describe("on-target: 0.25–0.50 kg/week", () => {
    it.each([0.25, 0.4, 0.5])("is on track at %d", (rate) => {
      expect(evaluate(trend([rate, rate]), ["A1"])).toMatchObject({ kind: "on-track", ruleId: "on-target", block: null });
    });

    it("holds without a rule between the bands", () => {
      expect(evaluate(trend([0.22, 0.22]), [])).toMatchObject({ kind: "on-track", ruleId: null });
      expect(evaluate(trend([0.6, 0.6]), [])).toMatchObject({ kind: "on-track", ruleId: null });
    });
  });

  describe("too-fast: > 0.70 kg/week for 2 weeks", () => {
    it("drops the last add-on that's on", () => {
      expect(evaluate(trend([0.8, 0.9]), ["A1", "A2"])).toMatchObject({ kind: "remove-block", ruleId: "too-fast", block: "A2" });
    });

    it("notes it when there's no add-on to drop", () => {
      expect(evaluate(trend([0.8, 0.9]), [])).toMatchObject({ kind: "note", ruleId: "too-fast", block: null });
    });

    it("needs both weeks fast", () => {
      expect(evaluate(trend([0.5, 0.9]), ["A1"]).ruleId).not.toBe("too-fast");
    });
  });

  describe("stalled: flat for 4 weeks at ≥ 90% adherence", () => {
    const flat = [0.05, -0.05, 0, 0.1].map((gainKg, i) => ({ week: i + 2, gainKg }));
    const eaten = (pct) => flat.map((g) => ({ week: g.week, pct }));

    it("suggests a checkup", () => {
      const out = evaluate(trend([0.3, 0.3], { gains: flat, adherence: eaten(95) }), ["A1"]);
      expect(out).toMatchObject({ kind: "checkup", ruleId: "stalled", block: null });
    });

    it("doesn't when adherence was under 90%", () => {
      expect(evaluate(trend([0.3, 0.3], { gains: flat, adherence: eaten(80) }), []).ruleId).not.toBe("stalled");
    });

    it("doesn't with fewer than 4 flat weeks", () => {
      const three = flat.slice(1);
      expect(evaluate(trend([0.3, 0.3], { gains: three, adherence: eaten(95) }), []).ruleId).not.toBe("stalled");
    });

    it("gives way to too-fast, which is checked first", () => {
      expect(evaluate(trend([0.8, 0.8], { gains: flat, adherence: eaten(95) }), ["A1"]).ruleId).toBe("too-fast");
    });
  });

  it("suggests and never mutates the add-on list", () => {
    const addOns = Object.freeze(["A1"]);
    evaluate(trend([0.1, 0.1]), addOns);
    evaluate(trend([0.9, 0.9]), addOns);
    expect(addOns).toEqual(["A1"]);
  });
});

describe("applySuggestion", () => {
  const profile = Object.freeze({ heightCm: 178, addOns: Object.freeze(["A1"]) });

  it("returns a new profile with the block added, in canonical order", () => {
    const next = applySuggestion(profile, { kind: "add-block", block: "A3" });
    expect(next.addOns).toEqual(["A1", "A3"]);
    expect(profile.addOns).toEqual(["A1"]);
  });

  it("returns a new profile with the block removed", () => {
    expect(applySuggestion(profile, { kind: "remove-block", block: "A1" }).addOns).toEqual([]);
  });

  it("changes nothing for a checkup or a note", () => {
    expect(applySuggestion(profile, { kind: "checkup" })).toBe(profile);
    expect(applySuggestion(profile, { kind: "note" })).toBe(profile);
  });
});
