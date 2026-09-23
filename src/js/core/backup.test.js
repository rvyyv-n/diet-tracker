import { describe, it, expect, vi, beforeEach } from "vitest";

let backup;
let storage;
beforeEach(async () => {
  vi.resetModules();
  storage = await import("./storage.js");
  backup = await import("./backup.js");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function seed() {
  storage.save("profile", { heightCm: 178, startWeightKg: 60, addOns: ["A1"] });
  storage.save("days", { days: { "2026-09-01": { date: "2026-09-01", done: ["B1"], extras: [] } } });
  storage.save("weights", { weights: { "2026-09-01": 60, "2026-09-08": 60.4 } });
  storage.save("recipes", { recipes: [{ name: "Oats", kcal: 400, proteinG: 15, items: [] }] });
  storage.save("grocery", { weekStart: "2026-08-31", checked: { milk: true } });
}

const withoutStamp = ({ exportedAt, ...rest }) => rest;

describe("export and import", () => {
  it("round-trips everything", () => {
    seed();
    const first = backup.exportAll();
    localStorage.clear();
    expect(backup.importAll(first)).toBe(true);
    expect(withoutStamp(backup.exportAll())).toEqual(withoutStamp(first));
  });

  it("migrates an old backup's records on the way in", () => {
    backup.importAll({
      schemaVersion: 1,
      days: { schemaVersion: 1, days: { "2026-01-01": { done: [] } } },
      recipes: { schemaVersion: 2, recipes: [{ name: "Toast", kcal: 300, proteinG: 10 }] },
    });
    const out = backup.exportAll();
    expect(out.days.days["2026-01-01"].extras).toEqual([]);
    expect(out.recipes.recipes[0].items).toHaveLength(1);
  });

  it("returns false when a write fails part-way", () => {
    seed();
    const envelope = backup.exportAll();
    // Only the weights record grows, so it's the one write that doesn't fit.
    localStorage.capacity = localStorage.used();
    envelope.weights.weights["2026-09-15"] = 61;
    envelope.profile.heightCm = 180;
    expect(backup.importAll(envelope)).toBe(false);
    expect(backup.exportAll().profile.heightCm).toBe(180);
    expect(backup.exportAll().weights.weights["2026-09-15"]).toBeUndefined();
  });

  it("counts records for the preview, leaving grocery ticks out", () => {
    seed();
    expect(backup.countRecords(backup.exportAll())).toEqual({ profiles: 1, days: 1, weights: 2, recipes: 1 });
  });
});

describe("assertImportable", () => {
  it.each([null, "text", 3, []])("rejects %j as not a backup", (obj) => {
    expect(() => backup.assertImportable(obj)).toThrow("That file is not a backup.");
  });

  it("rejects a backup from a newer version", () => {
    expect(() => backup.assertImportable({ schemaVersion: storage.SCHEMA_VERSION + 1 })).toThrow(
      "This backup is from a newer version."
    );
  });

  it("accepts a current or older backup", () => {
    expect(() => backup.assertImportable({ schemaVersion: 1 })).not.toThrow();
    expect(() => backup.assertImportable({})).not.toThrow();
  });
});

describe("parseBackup", () => {
  it("rejects text that isn't JSON", () => {
    expect(() => backup.parseBackup("{nope")).toThrow("That is not valid JSON.");
  });

  it("rejects JSON that isn't an object", () => {
    expect(() => backup.parseBackup("[1]")).toThrow("That does not look like a backup.");
  });
});

describe("the undo slot", () => {
  it("snapshots, restores, and is consumed", () => {
    seed();
    const before = withoutStamp(backup.exportAll());
    expect(backup.takeSnapshot("import")).toBe(true);
    expect(backup.snapshotInfo().reason).toBe("import");
    backup.importAll({ weights: { weights: {} } });
    expect(backup.restoreSnapshot()).toBe(true);
    expect(withoutStamp(backup.exportAll())).toEqual(before);
    expect(backup.snapshotInfo()).toBeNull();
  });

  it("returns false when the snapshot doesn't fit", () => {
    seed();
    localStorage.capacity = localStorage.used();
    expect(backup.takeSnapshot("import")).toBe(false);
    expect(backup.snapshotInfo()).toBeNull();
  });

  it("survives a reset", () => {
    seed();
    backup.takeSnapshot("reset");
    storage.clear();
    expect(backup.snapshotInfo().reason).toBe("reset");
  });

  it("keeps the slot when the restore fails, so Undo can be retried", () => {
    seed();
    backup.takeSnapshot("reset");
    storage.clear();
    localStorage.capacity = localStorage.used();
    expect(backup.restoreSnapshot()).toBe(false);
    expect(backup.snapshotInfo()).not.toBeNull();

    localStorage.capacity = Infinity;
    expect(backup.restoreSnapshot()).toBe(true);
    expect(backup.snapshotInfo()).toBeNull();
  });

  it("returns false with nothing to restore", () => {
    expect(backup.restoreSnapshot()).toBe(false);
  });
});
