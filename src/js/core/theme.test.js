import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let theme;
let profile;
let backup;
beforeEach(async () => {
  vi.resetModules();
  profile = await import("./profile.js");
  backup = await import("./backup.js");
  theme = await import("./theme.js");
});

describe("resolving the theme", () => {
  it("pins Light and Dark whatever the OS says", () => {
    expect(theme.resolveTheme("light", true)).toBe("light");
    expect(theme.resolveTheme("dark", false)).toBe("dark");
  });

  it("resolves System from the OS, and treats an unknown pref as System", () => {
    expect(theme.resolveTheme("system", true)).toBe("dark");
    expect(theme.resolveTheme("system", false)).toBe("light");
    expect(theme.resolveTheme(undefined, true)).toBe("dark");
    expect(theme.resolveTheme("sepia", false)).toBe("light");
  });
});

describe("resolving the Look", () => {
  it("accepts the two Looks and falls back to Paper", () => {
    expect(theme.resolveLook("reel")).toBe("reel");
    expect(theme.resolveLook("paper")).toBe("paper");
    expect(theme.resolveLook("noir")).toBe("paper");
    expect(theme.resolveLook(undefined)).toBe("paper");
  });

  it("gives each Look and theme its own status-bar colour", () => {
    const colours = Object.values(theme.META_COLORS).flatMap((c) => [c.light, c.dark]);
    expect(new Set(colours).size).toBe(4);
    expect(theme.resolveAppearance({ lookPref: "reel", themePref: "dark" }, false)).toEqual({
      look: "reel",
      theme: "dark",
      color: theme.META_COLORS.reel.dark,
    });
    expect(theme.resolveAppearance({}, false)).toEqual({
      look: "paper",
      theme: "light",
      color: theme.META_COLORS.paper.light,
    });
  });
});

describe("the profile", () => {
  it("defaults to Paper, and an older profile without the field reads as Paper", () => {
    expect(profile.DEFAULT_PROFILE.lookPref).toBe("paper");
    localStorage.setItem("wgt:profile", JSON.stringify({ heightCm: 178, schemaVersion: 1 }));
    expect(profile.loadProfile().lookPref).toBe("paper");
  });

  it("round-trips both prefs through an export and an import", () => {
    profile.saveProfile({ ...profile.loadProfile(), lookPref: "reel", themePref: "dark" });
    const envelope = backup.exportAll();
    localStorage.clear();
    expect(backup.importAll(envelope)).toBe(true);
    const back = profile.loadProfile();
    expect(back.lookPref).toBe("reel");
    expect(back.themePref).toBe("dark");
  });
});

describe("applying to the document", () => {
  const attrs = {};
  let meta;
  beforeEach(() => {
    for (const k of Object.keys(attrs)) delete attrs[k];
    meta = { content: "", setAttribute: (_k, v) => (meta.content = v) };
    vi.stubGlobal("window", {
      matchMedia: (q) => ({
        matches: q.includes("dark") ? window.osDark : true,
        addEventListener() {},
      }),
      setTimeout: () => 0,
      osDark: false,
    });
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (k, v) => (attrs[k] = v),
        classList: { add() {}, remove() {} },
      },
      getElementById: (id) => (id === "tc" ? meta : null),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("writes both attributes and the status-bar colour on boot", () => {
    theme.initTheme();
    expect(attrs).toEqual({ "data-look": "paper", "data-theme": "light" });
    expect(meta.content).toBe(theme.META_COLORS.paper.light);
  });

  it("resolves System in JS, so the attribute is never left to a media query", () => {
    window.osDark = true;
    theme.initTheme();
    expect(attrs["data-theme"]).toBe("dark");
  });

  it("persists a new Look and a new theme, and applies them", () => {
    expect(theme.setLookPref("reel")).toBe("reel");
    expect(theme.setThemePref("dark")).toBe("dark");
    expect(attrs).toEqual({ "data-look": "reel", "data-theme": "dark" });
    expect(meta.content).toBe(theme.META_COLORS.reel.dark);
    expect(profile.loadProfile()).toMatchObject({ lookPref: "reel", themePref: "dark" });
    expect(theme.setLookPref("noir")).toBe("paper");
  });
});
