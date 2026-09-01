/**
 * version.js — semantic-version comparison, kept pure and off the network so it
 * can be reasoned about and tested on its own.
 *
 * This is the highest-care piece of the update check (pass 12): whatever ships
 * is the code that decides, when v2 lands, whether a 1.5 install can see it. A
 * plain string compare passes today ("v1.5.0" > "v1.0.0") and silently breaks
 * at "v10.0.0" < "v9.0.0", so the compare is numeric, part by part.
 *
 * Release tags read "v1.0.0"; settings.js's version reads "1.0.0". The leading
 * "v" is stripped either way. Prerelease / build suffixes ("-rc.1", "+meta")
 * are dropped — /latest already excludes prereleases, this is belt-and-braces.
 *
 * Worked cases:
 *   compareVersions("v1.5.0", "1.0.0")   ->  1
 *   compareVersions("v10.0.0", "v9.0.0") ->  1   (numeric, not lexical)
 *   compareVersions("1.0.0", "v1.0.0")   ->  0
 *   compareVersions("1.2", "1.2.0")      ->  0   (missing parts are 0)
 *   isNewer("v2.0.0", "1.5.0")           ->  true
 */

/** "v1.5.0" | "1.5" | "v2.0.0-rc.1" -> [major, minor, patch], each a number ≥ 0. */
export function parseVersion(input) {
  const cleaned = String(input ?? "")
    .trim()
    .replace(/^v/i, "")
    .split(/[-+]/)[0]; // drop prerelease / build metadata
  const nums = cleaned.split(".").map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  while (nums.length < 3) nums.push(0);
  return nums.slice(0, 3);
}

/** -1 if a < b, 0 if equal, 1 if a > b. Compares major, then minor, then patch. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

/** True when `candidate` is a strictly newer version than `current`. */
export function isNewer(candidate, current) {
  return compareVersions(candidate, current) > 0;
}
