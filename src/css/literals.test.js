import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * No hard-coded design values outside tokens.css.
 *
 * Colours and durations belong in tokens.css; styles and components use the
 * variables. This is a ratchet: each file's count of literals may not go up,
 * and must be lowered here when it goes down, so the list only ever shrinks.
 * The redesign (passes 63-74) takes every entry to zero except theme.js,
 * whose <meta name="theme-color"> values have to be literal hex.
 */
const LEFTOVER = {
  "src/css/app.css": { hex: 0, time: 9 },
  "src/js/core/theme.js": { hex: 2, time: 0 },
};

const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const files = walk("src")
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => /\.(css|jsx?)$/.test(f) && !f.endsWith("tokens.css") && !f.endsWith(".test.js"));

const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.replace(/\s\/\/\s.*$/, ""))
    .join("\n");

function count(file) {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const isCss = file.endsWith(".css");
  const hex = (src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
  // Durations only matter in CSS. 0s and .01ms (the reduced-motion clamp) are not design values.
  const time = isCss
    ? (src.match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? []).filter(
        (t) => !["0s", "0ms", ".01ms"].includes(t),
      ).length
    : 0;
  return { hex, time };
}

describe("design values live in tokens.css", () => {
  for (const file of files) {
    const want = LEFTOVER[file] ?? { hex: 0, time: 0 };
    it(file, () => {
      const got = count(file);
      expect(
        got,
        `${file}: move literals to tokens.css, or lower LEFTOVER if you removed some`,
      ).toEqual(want);
    });
  }
});
