/**
 * dates.js — local-time date helpers.
 *
 * Every date in this app is a local calendar day formatted "YYYY-MM-DD".
 * `Date.prototype.toISOString()` formats in UTC, which rolls the day over at the
 * wrong hour for anyone east or west of it — an evening entry would be filed
 * under tomorrow. Nothing here formats through UTC; `Date.UTC` is used only for
 * day-count arithmetic, where both operands share the frame and it cancels out.
 */

/** Format a Date as a local "YYYY-MM-DD" string. */
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today, as a local "YYYY-MM-DD" string. */
export function todayISO() {
  return toISO(new Date());
}

/** An ISO date shifted by whole days. Negative `delta` goes back. */
export function addDays(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(y, m - 1, d + delta));
}

/** Whole days from `startISO` to `endISO`; negative if `endISO` is earlier. */
export function daysBetween(startISO, endISO) {
  const [ay, am, ad] = startISO.split("-").map(Number);
  const [by, bm, bd] = endISO.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

/**
 * The 1-indexed plan week a date falls in: the start date is week 1, seven days
 * on is week 2, and so on. Never returns less than 1, and treats a missing start
 * date as "week 1" so callers don't each have to guard it.
 */
export function planWeek(startISO, onISO) {
  if (!startISO) return 1;
  return Math.max(1, Math.floor(daysBetween(startISO, onISO) / 7) + 1);
}

/** Month names, index 0 = January. Used by the date controls and headers. */
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "14 March 2009" from a local ISO date. */
export function humanDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** Days in a given month. `month1` is 1..12. */
export function daysInMonth(year, month1) {
  return new Date(year, month1, 0).getDate();
}
