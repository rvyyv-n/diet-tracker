import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStorage } from "../../../test/setup.js";

// storage.js holds per-session state (the corrupt-once set, a held failure),
// so every test gets a fresh copy of the module.
let storage;
beforeEach(async () => {
  vi.resetModules();
  storage = await import("./storage.js");
});

const raw = (name) => JSON.parse(localStorage.getItem(`wgt:${name}`));
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("migrations", () => {
  it("backfills extras onto v1 days", () => {
    localStorage.setItem(
      "wgt:days",
      JSON.stringify({ schemaVersion: 1, days: { "2026-01-01": { date: "2026-01-01", done: ["B1"] } } })
    );
    const out = storage.load("days", null);
    expect(out.schemaVersion).toBe(storage.SCHEMA_VERSION);
    expect(out.days["2026-01-01"]).toEqual({ extras: [], date: "2026-01-01", done: ["B1"] });
  });

  it("keeps extras a v1 day already had", () => {
    localStorage.setItem(
      "wgt:days",
      JSON.stringify({ schemaVersion: 1, days: { "2026-01-01": { extras: [{ kcal: 100 }] } } })
    );
    expect(storage.load("days", null).days["2026-01-01"].extras).toEqual([{ kcal: 100 }]);
  });

  it("gives a flat v2 recipe one item mirroring its totals", () => {
    localStorage.setItem(
      "wgt:recipes",
      JSON.stringify({ schemaVersion: 2, recipes: [{ name: "Oats", kcal: 400, proteinG: 15 }] })
    );
    expect(storage.load("recipes", null).recipes[0].items).toEqual([
      { name: "Oats", kcal: 400, proteinG: 15 },
    ]);
  });

  it("leaves a recipe that already has items alone", () => {
    const items = [{ name: "Milk", kcal: 150, proteinG: 8 }];
    localStorage.setItem(
      "wgt:recipes",
      JSON.stringify({ schemaVersion: 2, recipes: [{ name: "Shake", kcal: 150, proteinG: 8, items }] })
    );
    expect(storage.load("recipes", null).recipes[0].items).toEqual(items);
  });

  it("passes records a step doesn't own through unchanged", () => {
    localStorage.setItem("wgt:profile", JSON.stringify({ schemaVersion: 1, heightCm: 178 }));
    expect(storage.load("profile", null)).toEqual({ heightCm: 178, schemaVersion: storage.SCHEMA_VERSION });
  });

  it("rejects a record from a newer version", () => {
    localStorage.setItem("wgt:profile", JSON.stringify({ schemaVersion: storage.SCHEMA_VERSION + 1 }));
    expect(storage.load("profile", "fallback")).toBe("fallback");
  });

  it("returns the fallback for a missing record", () => {
    expect(storage.load("profile", "fallback")).toBe("fallback");
  });
});

describe("save", () => {
  it("stamps the current schema version", () => {
    expect(storage.save("profile", { heightCm: 178 })).toBe(true);
    expect(raw("profile")).toEqual({ heightCm: 178, schemaVersion: storage.SCHEMA_VERSION });
  });

  it("returns false and reports quota when storage is full", async () => {
    const heard = vi.fn();
    storage.onWriteFailure(heard);
    localStorage.capacity = 0;
    expect(storage.save("profile", { heightCm: 178 })).toBe(false);
    await tick();
    expect(heard).toHaveBeenCalledWith("profile", "quota");
  });

  it("reports blocked for any other failure", async () => {
    const heard = vi.fn();
    storage.onWriteFailure(heard);
    localStorage.setItem = () => {
      throw new DOMException("denied", "SecurityError");
    };
    expect(storage.save("profile", {})).toBe(false);
    await tick();
    expect(heard).toHaveBeenCalledWith("profile", "blocked");
  });

  it("delivers failures after a microtask, not synchronously", async () => {
    const heard = vi.fn();
    storage.onWriteFailure(heard);
    localStorage.capacity = 0;
    storage.save("profile", {});
    expect(heard).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(heard).toHaveBeenCalledOnce();
  });

  it("stops delivering once unsubscribed", async () => {
    const heard = vi.fn();
    storage.onWriteFailure(heard)();
    storage.onWriteFailure(() => {});
    localStorage.capacity = 0;
    storage.save("profile", {});
    await tick();
    expect(heard).not.toHaveBeenCalled();
  });

  it("holds a failure raised before anyone subscribed for the first listener", async () => {
    localStorage.capacity = 0;
    storage.save("profile", {});
    const heard = vi.fn();
    storage.onWriteFailure(heard);
    await tick();
    expect(heard).toHaveBeenCalledWith("profile", "quota");
  });
});

describe("a corrupt record", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("wgt:days", "{not json");
  });

  it("loads as the fallback and is set aside under wgt:corrupt:", () => {
    expect(storage.load("days", "fallback")).toBe("fallback");
    expect(localStorage.getItem("wgt:corrupt:days")).toBe("{not json");
  });

  it("is reported once however many times it is read", async () => {
    const heard = vi.fn();
    storage.onWriteFailure(heard);
    for (let i = 0; i < 5; i++) storage.load("days", null);
    await tick();
    expect(heard).toHaveBeenCalledOnce();
    expect(heard).toHaveBeenCalledWith("days", "corrupt");
  });

  it("keeps the set-aside copy when the next write overwrites the original", () => {
    storage.load("days", null);
    storage.save("days", { days: {} });
    expect(localStorage.getItem("wgt:corrupt:days")).toBe("{not json");
  });

  it("is still reported when there's no room for the copy", async () => {
    localStorage.capacity = localStorage.used();
    const heard = vi.fn();
    storage.onWriteFailure(heard);
    storage.load("days", null);
    await tick();
    expect(localStorage.getItem("wgt:corrupt:days")).toBeNull();
    expect(heard).toHaveBeenCalledWith("days", "corrupt");
  });
});

describe("clear", () => {
  it("removes wgt: records, keeps the snapshot and anything outside the namespace", () => {
    localStorage.setItem("wgt:profile", "{}");
    localStorage.setItem("wgt:corrupt:days", "x");
    localStorage.setItem("wgt:snapshot", "{}");
    localStorage.setItem("other", "1");
    storage.clear();
    expect(localStorage.getItem("wgt:profile")).toBeNull();
    expect(localStorage.getItem("wgt:corrupt:days")).toBeNull();
    expect(localStorage.getItem("wgt:snapshot")).toBe("{}");
    expect(localStorage.getItem("other")).toBe("1");
  });
});

it("createStorage enforces its capacity", () => {
  const s = createStorage(10);
  expect(() => s.setItem("ab", "abc")).not.toThrow();
  expect(() => s.setItem("cd", "e")).toThrow(expect.objectContaining({ name: "QuotaExceededError" }));
});

describe("usedChars", () => {
  it("counts wgt: keys and values, and nothing else on the origin", () => {
    localStorage.setItem("wgt:a", "12345");
    localStorage.setItem("other", "x".repeat(100));
    expect(storage.usedChars()).toBe("wgt:a".length + 5);
  });

  it("is zero when Rise has stored nothing", () => {
    expect(storage.usedChars()).toBe(0);
  });
});
