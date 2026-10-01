import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Motion follows the design's tables: every transition and animation reads a
 * duration token and an easing token, none loops, and reduced motion zeroes
 * every duration. (Raw milliseconds are already banned by literals.test.js.)
 */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "");
const app = strip(fs.readFileSync("src/css/app.css", "utf8"));
const tokens = strip(fs.readFileSync("src/css/tokens.css", "utf8"));

// Every `transition:` / `animation:` declaration, with its value.
const declarations = [...app.matchAll(/(?:^|[\s{;])(transition|animation):\s*([^;]+);/g)].map(
  (m) => ({ prop: m[1], value: m[2].replace(/\s+/g, " ").trim() }),
);

describe("motion uses the tokens", () => {
  it("finds the declarations it is checking", () => {
    expect(declarations.length).toBeGreaterThan(20);
  });

  it("gives every transition and animation a duration token", () => {
    const bad = declarations.filter(
      (d) => !d.value.startsWith("none") && !/var\(--(dur-|transition-)/.test(d.value),
    );
    expect(bad).toEqual([]);
  });

  it("uses the easing tokens, never its own curve", () => {
    expect(app).not.toMatch(/cubic-bezier\(|linear\(|steps\(/);
  });

  it("never loops", () => {
    expect(declarations.filter((d) => /\binfinite\b/.test(d.value))).toEqual([]);
  });
});

describe("reduced motion", () => {
  it("zeroes every duration token", () => {
    const durations = [...tokens.matchAll(/--(dur-[a-z]+):\s*\d+ms/g)].map((m) => m[1]);
    expect(durations.length).toBeGreaterThanOrEqual(4);
    const block = tokens.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)[1];
    for (const name of durations) expect(block).toContain(`--${name}: 0ms`);
  });

  it("switches the theme cross-fade off", () => {
    const block = app.match(
      /@media \(prefers-reduced-motion: reduce\) \{\s*:root\.theme-fading[\s\S]*?\n\}/,
    )[0];
    expect(block).toMatch(/transition:\s*none\s*!important/);
  });
});
