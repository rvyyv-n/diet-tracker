import { describe, it, expect, vi, beforeEach } from "vitest";

let whatsnew;
let storage;
beforeEach(async () => {
  vi.resetModules();
  storage = await import("./storage.js");
  whatsnew = await import("./whatsnew.js");
  localStorage.clear();
});

describe("the What's new card", () => {
  it("shows on a device that has not seen the 3.0 card", () => {
    expect(whatsnew.whatsNewSeen()).toBe(false);
  });

  it("still shows on a device that only dismissed the 2.0 card", () => {
    storage.save("whatsnew", { seenV2: true });
    expect(whatsnew.whatsNewSeen()).toBe(false);
  });

  it("stays dismissed once marked", () => {
    whatsnew.markWhatsNewSeen();
    expect(whatsnew.whatsNewSeen()).toBe(true);
  });
});
