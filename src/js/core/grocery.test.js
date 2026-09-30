import { beforeEach, describe, expect, it } from "vitest";
import {
  groceryKey,
  weekChecks,
  toggleGrocery,
  clearGroceryChecks,
  restoreGroceryChecks,
} from "./grocery.js";

const MON = "2026-09-28";
const WED = "2026-09-30";
const NEXT_MON = "2026-10-05";

beforeEach(() => localStorage.clear());

describe("grocery ticks", () => {
  it("clear empties the week and restore puts the same ticks back", () => {
    const milk = groceryKey("Dairy & eggs", "Full-Fat Milk");
    const eggs = groceryKey("Dairy & eggs", "Eggs");
    toggleGrocery(milk, WED);
    toggleGrocery(eggs, WED);
    const before = { ...weekChecks(WED) };
    clearGroceryChecks(WED);
    expect(weekChecks(WED)).toEqual({});
    restoreGroceryChecks(before, WED);
    expect(weekChecks(WED)).toEqual({ [milk]: true, [eggs]: true });
  });

  it("ticks belong to their Monday and read empty the week after", () => {
    toggleGrocery(groceryKey("Pantry", "Oats"), MON);
    expect(Object.keys(weekChecks(WED))).toHaveLength(1);
    expect(weekChecks(NEXT_MON)).toEqual({});
  });
});
