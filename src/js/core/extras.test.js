import { describe, expect, it } from "vitest";
import { addExtra, removeExtra, extrasTotals } from "./extras.js";

const day = { date: "2026-09-30", extras: [] };

describe("addExtra", () => {
  it("keeps a valid logged time", () => {
    const out = addExtra(day, { name: "Chicken wrap", kcal: 420, proteinG: 24, at: "14:20" });
    expect(out.extras[0]).toMatchObject({ name: "Chicken wrap", kcal: 420, at: "14:20" });
  });

  it("leaves the time off when none or a malformed one is given", () => {
    expect(addExtra(day, { name: "Tea" }).extras[0]).not.toHaveProperty("at");
    expect(addExtra(day, { name: "Tea", at: "2pm" }).extras[0]).not.toHaveProperty("at");
  });

  it("ignores a blank name and totals what is left after a removal", () => {
    expect(addExtra(day, { name: "  " })).toBe(day);
    const two = addExtra(addExtra(day, { name: "A", kcal: 100 }), { name: "B", kcal: 50 });
    const one = removeExtra(two, two.extras[0].id);
    expect(extrasTotals(one)).toEqual({ kcal: 50, proteinG: 0 });
  });
});
