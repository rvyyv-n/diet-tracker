import { describe, expect, it } from "vitest";
import { newDay, toggleBlock, addBlock, dayTotals, dayReplay, kcalStatus } from "./day.js";
import { addExtra } from "./extras.js";

describe("dayReplay", () => {
  const base = { ...newDay("2026-10-01", 1), extras: [] };

  it("starts at zero and has nothing more on an untouched day", () => {
    expect(dayReplay(base)).toEqual([{ id: null, time: null, name: null, kcal: 0, proteinG: 0 }]);
  });

  it("runs in clock order, food without a time last, and ends on the day total", () => {
    let day = toggleBlock(toggleBlock(base, "B3"), "B1");
    day = addExtra(day, { name: "Tea", kcal: 40, proteinG: 1 });
    day = addExtra(day, { name: "Wrap", kcal: 420, proteinG: 24, at: "12:15" });
    const points = dayReplay(day);
    expect(points.map((p) => p.time)).toEqual([null, "08:00", "12:15", "13:30", null]);
    expect(points.map((p) => p.name).slice(1)).toEqual(["Breakfast", "Wrap", "Lunch", "Tea"]);
    const last = points.at(-1);
    expect({ kcal: last.kcal, proteinG: last.proteinG }).toEqual({
      kcal: dayTotals(day).kcal,
      proteinG: dayTotals(day).proteinG,
    });
  });

  it("counts a ticked bonus block and skips an unticked one", () => {
    const day = toggleBlock(addBlock(addBlock(base, "A1"), "A3"), "A1");
    expect(dayReplay(day).map((p) => p.id)).toEqual([null, "A1"]);
  });
});

describe("kcalStatus", () => {
  it("uses the intake cut-offs", () => {
    expect(kcalStatus(3000, 3000)).toBe("on-track");
    expect(kcalStatus(2100, 3000)).toBe("partial");
    expect(kcalStatus(2000, 3000)).toBe("low");
    expect(kcalStatus(100, 0)).toBe("low");
  });
});
