import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The v2.3.0 to v3.0 upgrade (pass 89). The records below are written the way
 * the v2.3.0 build wrote them: schema 3, no lookPref, no hiddenFoods, no
 * phaseChange, extras with no `at` or `from`, and a What's new flag for 2.0.
 */

let storage;
let backup;
let profile;
let theme;
let whatsnew;
let day;
beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  storage = await import("./storage.js");
  backup = await import("./backup.js");
  profile = await import("./profile.js");
  theme = await import("./theme.js");
  whatsnew = await import("./whatsnew.js");
  day = await import("./day.js");
});

const V23_PROFILE = {
  name: "Sam",
  birthDate: "1998-04-02",
  heightCm: 178,
  heightUnit: "cm",
  startWeightKg: 60,
  weightUnit: "lb",
  targetRateKgPerWeek: 0.3,
  startDate: "2026-06-01",
  currentPhaseId: 2,
  addOns: ["A1", "A2"],
  dismissedSuggestion: null,
  introSeen: true,
  themePref: "dark",
  overviewMetrics: { protein: false },
  navPref: "hover",
  schemaVersion: 3,
};

const V23_DAY = {
  date: "2026-09-20",
  phaseId: 2,
  addOns: ["A1", "A2"],
  bonus: [],
  completed: { B1: true, B2: true },
  rotations: { breakfast: "BR1", lunch: "L1", dinner: "D1", snack: "SN1", shake: "standard" },
  appetite: null,
  extras: [{ id: "x1", name: "Chai", kcal: 120, proteinG: 4 }],
};

function seedV23() {
  const put = (name, data) => localStorage.setItem(`wgt:${name}`, JSON.stringify(data));
  put("profile", V23_PROFILE);
  put("days", { days: { "2026-09-20": V23_DAY }, schemaVersion: 3 });
  put("weights", { weights: { "2026-09-20": 61.2 }, schemaVersion: 3 });
  put("recipes", {
    recipes: [{ id: "r1", name: "Oats", kcal: 400, proteinG: 15, items: [], useCount: 3 }],
    schemaVersion: 3,
  });
  put("whatsnew", { seenV2: true, schemaVersion: 3 });
}

describe("a device that ran v2.3.0", () => {
  it("keeps every saved profile field and fills in the new ones", () => {
    seedV23();
    const p = profile.loadProfile();
    expect(p).toMatchObject(V23_PROFILE);
    expect(p.lookPref).toBe("paper");
    expect(p.hiddenFoods).toEqual([]);
    expect(p.phaseChange).toBeNull();
  });

  it("keeps the saved theme and opens in Paper", () => {
    seedV23();
    const a = theme.resolveAppearance(profile.loadProfile(), false);
    expect(a).toMatchObject({ look: "paper", theme: "dark" });
  });

  it("keeps days, weights and recipes as they were", () => {
    seedV23();
    expect(storage.load("days", null).days["2026-09-20"]).toMatchObject({
      completed: V23_DAY.completed,
      extras: V23_DAY.extras,
    });
    expect(storage.load("weights", null).weights).toEqual({ "2026-09-20": 61.2 });
    expect(storage.load("recipes", null).recipes[0]).toMatchObject({ name: "Oats", useCount: 3 });
  });

  it("replays a v2.3.0 extra that has no clock time, last, to the day total", () => {
    seedV23();
    const stored = storage.load("days", null).days["2026-09-20"];
    const points = day.dayReplay(stored);
    expect(points.at(-1)).toMatchObject({ name: "Chai", time: null });
    expect(points.at(-1).kcal).toBe(day.dayTotals(stored).kcal);
  });

  it("shows the 3.0 What's new card once, then not again", () => {
    seedV23();
    expect(whatsnew.whatsNewSeen()).toBe(false);
    whatsnew.markWhatsNewSeen();
    expect(whatsnew.whatsNewSeen()).toBe(true);
  });

  it("round-trips through export and import without loss", () => {
    seedV23();
    const out = backup.exportAll();
    localStorage.clear();
    expect(backup.importAll(out)).toBe(true);
    expect(profile.loadProfile()).toMatchObject({ themePref: "dark", navPref: "hover" });
    expect(storage.load("days", null).days["2026-09-20"].extras).toHaveLength(1);
  });

  it("keeps the dismissed What's new card through a reset and its undo", () => {
    seedV23();
    whatsnew.markWhatsNewSeen();
    backup.takeSnapshot("reset");
    storage.clear();
    expect(backup.restoreSnapshot()).toBe(true);
    expect(whatsnew.whatsNewSeen()).toBe(true);
    expect(profile.loadProfile().themePref).toBe("dark");
  });
});

describe("a backup file from before v2.3.0", () => {
  it("imports a v1 backup: extras and recipe items are added, the rest is kept", () => {
    const ok = backup.importAll({
      app: "diet-tracker",
      profile: { heightCm: 170, startWeightKg: 55, birthDate: "2000-01-01", themePref: "light" },
      days: { days: { "2026-01-01": { date: "2026-01-01", completed: { B1: true } } } },
      weights: { weights: { "2026-01-01": 55 } },
      recipes: { recipes: [{ name: "Toast", kcal: 300, proteinG: 10 }] },
    });
    expect(ok).toBe(true);
    expect(storage.load("days", null).days["2026-01-01"].extras).toEqual([]);
    expect(storage.load("recipes", null).recipes[0].items).toEqual([
      { name: "Toast", kcal: 300, proteinG: 10 },
    ]);
    expect(storage.load("weights", null).weights["2026-01-01"]).toBe(55);
    expect(profile.loadProfile()).toMatchObject({ themePref: "light", lookPref: "paper" });
  });

  it("totals a day saved before rotations and add-ons were recorded", () => {
    const old = { date: "2026-01-01", phaseId: 1, completed: { B1: true }, extras: [] };
    expect(() => day.dayTotals(old)).not.toThrow();
    expect(day.dayTotals(old).kcal).toBeGreaterThan(0);
    expect(day.dayReplay(old).at(-1).kcal).toBe(day.dayTotals(old).kcal);
  });

  it("does not restamp a record from a newer build as current", () => {
    backup.importAll({
      schemaVersion: 1,
      weights: { schemaVersion: 9, weights: { "2026-01-01": 55 } },
    });
    expect(storage.load("weights", { weights: {} }).weights).toEqual({});
  });
});
