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
 *
 * A glyph is either an array of `d` strings (drawn as `<path>` elements) or a
 * raw inner-markup string for the few that also need a `<circle>`.
 */

const PATHS = {
  pencil: [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m17 8-5-5-5 5", "M12 3v12"],
  "rotate-ccw": ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5"],
  "refresh-cw": [
    "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
    "M21 3v5h-5",
    "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
    "M3 21v-5h5",
  ],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  // The year steppers in the calendar popover. Lucide's double chevrons, so
  // the month and year controls read as the same family at a glance.
  "chevrons-left": ["m11 17-5-5 5-5", "m18 17-5-5 5-5"],
  "chevrons-right": ["m6 17 5-5-5-5", "m13 17 5-5-5-5"],
  // Drawn rather than typed. A "+" / "−" text character sits on the baseline
  // and carries its font's ascender and descender, so it renders low inside a
  // fixed box however the box is centred — that was the misaligned plus on
  // Today's "Add a block" and "Log food" triggers.
  plus: ["M5 12h14", "M12 5v14"],
  minus: ["M5 12h14"],
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
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  // The Plan screen's section marks (pass 38). Each section gets one so the
  // three subheads read as landmarks rather than three more lines of text.
  target:
    '<circle cx="12" cy="12" r="10"></circle>' +
    '<circle cx="12" cy="12" r="6"></circle>' +
    '<circle cx="12" cy="12" r="2"></circle>',
  utensils: [
    "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2",
    "M7 2v20",
    "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",
  ],
  table:
    '<path d="M12 3v18"></path>' +
    '<rect width="18" height="18" x="3" y="3" rx="2"></rect>' +
    '<path d="M3 9h18"></path><path d="M3 15h18"></path>',
  // Section marks for the .group__label eyebrows across every screen, and the
  // Plan screen's grocery aisles (pass 39). Same rule as the three above: one
  // glyph per landmark, decorative, never the only carrier of meaning.
  palette:
    '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>' +
    '<circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>' +
    '<circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>' +
    '<circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>' +
    '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 ' +
    "0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 " +
    '1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>',
  "layout-dashboard":
    '<rect width="7" height="9" x="3" y="3" rx="1"></rect>' +
    '<rect width="7" height="5" x="14" y="3" rx="1"></rect>' +
    '<rect width="7" height="9" x="14" y="12" rx="1"></rect>' +
    '<rect width="7" height="5" x="3" y="16" rx="1"></rect>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>' +
    '<path d="M3 5V19A9 3 0 0 0 21 19V5"></path>' +
    '<path d="M3 12A9 3 0 0 0 21 12"></path>',
  "calendar-days":
    '<path d="M8 2v4"></path><path d="M16 2v4"></path>' +
    '<rect width="18" height="18" x="3" y="4" rx="2"></rect>' +
    '<path d="M3 10h18"></path>' +
    '<path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path>' +
    '<path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path>',
  "shopping-cart":
    '<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle>' +
    '<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>',
  gauge: ["m12 14 4-4", "M3.34 19a10 10 0 1 1 17.32 0"],
  egg: [
    "M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z",
  ],
  archive:
    '<rect width="20" height="5" x="2" y="3" rx="1"></rect>' +
    '<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path>' +
    '<path d="M10 12h4"></path>',
  drumstick: [
    "M15.45 15.4c-2.13.65-4.3.32-5.7-1.1-2.29-2.27-1.76-6.5 1.17-9.42 2.93-2.93 7.15-3.46 9.43-1.18 1.41 1.41 1.74 3.57 1.1 5.71-1.4-.51-3.26-.02-4.64 1.36-1.38 1.38-1.87 3.23-1.36 4.63z",
    "m11.25 15.6-2.16 2.16a2.5 2.5 0 1 1-4.56 1.73 2.49 2.49 0 0 1-1.41-4.24 2.5 2.5 0 0 1 3.14-.32l2.16-2.16",
  ],
  leaf: [
    "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
    "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
  ],
  "clipboard-list":
    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>' +
    '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
    '<path d="M12 11h4"></path><path d="M12 16h4"></path>' +
    '<path d="M8 11h.01"></path><path d="M8 16h.01"></path>',
};

/** The raw `<svg …>` markup for a glyph — for places that build HTML strings. */
export function iconSvg(name, { size = 20, stroke = 1.75 } = {}) {
  const shape = PATHS[name] ?? [];
  const inner = Array.isArray(shape)
    ? shape.map((d) => `<path d="${d}"></path>`).join("")
    : shape;
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
  );
}

/** A glyph as a detached `<svg>` node, ready to drop into `el(...)`. */
export function icon(name, opts) {
  const holder = document.createElement("span");
  holder.innerHTML = iconSvg(name, opts);
  return holder.firstElementChild;
}
