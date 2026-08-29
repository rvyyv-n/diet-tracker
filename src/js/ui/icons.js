/**
 * icons.js — the small set of Lucide (0.469) glyphs the app draws inline.
 *
 * The CDN is never loaded; the paths below are copied verbatim from the icon
 * set. Every glyph shares Lucide's frame — a 24×24 viewBox, no fill, round
 * caps and joins — so callers only vary size and stroke width.
 *
 *   icon("pencil")                       -> <svg> node, 20px, stroke 1.75
 *   icon("check", { size: 14, stroke: 2.5 })
 *
 * Stroke defaults to 1.75, not Lucide's 2: at 20px the heavier weight competes
 * with the app's 1px hairlines.
 */

const PATHS = {
  pencil: [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m17 8-5-5-5 5", "M12 3v12"],
  "arrow-down-to-line": ["M12 17V3", "m6 11 6 6 6-6", "M19 21H5"],
  "rotate-ccw": ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "square-check-big": [
    "M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    "m9 11 3 3L22 4",
  ],
  "trending-up": ["M16 7h6v6", "m22 7-8.5 8.5-5-5L2 17"],
  "sliders-horizontal": [
    "M21 4h-7", "M10 4H3", "M21 12h-9", "M8 12H3", "M21 20h-5",
    "M12 20H3", "M14 2v4", "M8 10v4", "M16 18v4",
  ],
  check: ["M20 6 9 17l-5-5"],
};

/** The raw `<svg …>` markup for a glyph — for places that build HTML strings. */
export function iconSvg(name, { size = 20, stroke = 1.75 } = {}) {
  const paths = (PATHS[name] ?? []).map((d) => `<path d="${d}"></path>`).join("");
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
}

/** A glyph as a detached `<svg>` node, ready to drop into `el(...)`. */
export function icon(name, opts) {
  const holder = document.createElement("span");
  holder.innerHTML = iconSvg(name, opts);
  return holder.firstElementChild;
}
