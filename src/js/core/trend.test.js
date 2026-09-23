import { describe, it, expect } from "vitest";
import { weeklyWeights, weeklyGains, rollingGain } from "./trend.js";

const START = "2026-09-01";

describe("weeklyWeights", () => {
  it("keeps one reading per plan week, sorted by week", () => {
    const out = weeklyWeights(
      [
        { date: "2026-09-15", kg: 61 },
        { date: "2026-09-01", kg: 60 },
        { date: "2026-09-08", kg: 60.5 },
      ],
      START
    );
    expect(out.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(out.map((w) => w.kg)).toEqual([60, 60.5, 61]);
  });

  it("takes the latest reading when a week has two", () => {
    const out = weeklyWeights(
      [
        { date: "2026-09-12", kg: 60.9 },
        { date: "2026-09-08", kg: 60.2 },
      ],
      START
    );
    expect(out).toEqual([{ week: 2, date: "2026-09-12", kg: 60.9 }]);
  });

  it("leaves a missed week out rather than filling it", () => {
    const out = weeklyWeights(
      [
        { date: "2026-09-01", kg: 60 },
        { date: "2026-09-22", kg: 61 },
      ],
      START
    );
    expect(out.map((w) => w.week)).toEqual([1, 4]);
  });

  it("is empty with no readings", () => {
    expect(weeklyWeights([], START)).toEqual([]);
  });
});

describe("weeklyGains", () => {
  it("is the change between consecutive weekly weights, rounded to 2 dp", () => {
    const series = [
      { week: 1, kg: 60 },
      { week: 2, kg: 60.333 },
      { week: 3, kg: 60.1 },
    ];
    expect(weeklyGains(series)).toEqual([
      { week: 2, gainKg: 0.33 },
      { week: 3, gainKg: -0.23 },
    ]);
  });

  it("spans a gap as one step, dated to the later week", () => {
    expect(weeklyGains([{ week: 1, kg: 60 }, { week: 4, kg: 61 }])).toEqual([{ week: 4, gainKg: 1 }]);
  });

  it("is empty with fewer than two weights", () => {
    expect(weeklyGains([{ week: 1, kg: 60 }])).toEqual([]);
  });
});

describe("rollingGain", () => {
  const gains = [0.1, 0.3, 0.5, 0.7, 0.9].map((gainKg, i) => ({ week: i + 2, gainKg }));

  it("averages up to four recent gains, fewer early on", () => {
    expect(rollingGain(gains)).toEqual([
      { week: 2, avgKgPerWeek: 0.1, samples: 1 },
      { week: 3, avgKgPerWeek: 0.2, samples: 2 },
      { week: 4, avgKgPerWeek: 0.3, samples: 3 },
      { week: 5, avgKgPerWeek: 0.4, samples: 4 },
      { week: 6, avgKgPerWeek: 0.6, samples: 4 },
    ]);
  });

  it("takes a custom window", () => {
    expect(rollingGain(gains, 2).map((r) => r.avgKgPerWeek)).toEqual([0.1, 0.2, 0.4, 0.6, 0.8]);
  });
});
