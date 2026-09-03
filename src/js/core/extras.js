/**
 * extras.js — off-plan food logged against a day.
 *
 * An extra is a one-off item the plan didn't call for: quick-typed (name /
 * kcal / protein) or picked from plan.js's FOOD_DB (see the entry surface in
 * today.js). Pure functions here mirror day.js's style — day in, new day out.
 * day.js owns where `extras` lives on the day record; this module only
 * transforms the list.
 *
 * Extras take `bonus` semantics exactly (day.js, pass 8): they move the day's
 * kcal / protein but never `total`, the adherence denominator. Eating
 * off-plan genuinely raises intake, so intakeStatus() should reflect it — and
 * does, for free, once dayTotals() sums extras alongside completed blocks.
 */

/** The extras logged for a day. Never undefined — pass 23 backfilled every
 *  stored day with `extras: []`, so this reads the field directly rather than
 *  falling back at every call site the way dayBonus() has to for `bonus`. */
export function dayExtras(day) {
  return day.extras;
}

/**
 * Add a logged extra: `{ name, kcal, proteinG }`. `name` is trimmed; a blank
 * name is rejected and the day is returned unchanged, so a stray "log" tap
 * with nothing typed can't add an empty row. kcal / proteinG are coerced to a
 * non-negative number — bad or missing input becomes 0, never NaN poisoning
 * the day total. The entry gets its own id so it can be removed later without
 * relying on its position in the list.
 */
export function addExtra(day, { name, kcal, proteinG } = {}) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return day;
  const entry = {
    id: newExtraId(),
    name: cleanName,
    kcal: sanitiseNumber(kcal),
    proteinG: sanitiseNumber(proteinG),
  };
  return { ...day, extras: [...dayExtras(day), entry] };
}

/** Remove a logged extra by id. No-op if the id isn't present. */
export function removeExtra(day, id) {
  return { ...day, extras: dayExtras(day).filter((e) => e.id !== id) };
}

/** Totals across a day's extras — folded into dayTotals() in day.js. */
export function extrasTotals(day) {
  return dayExtras(day).reduce(
    (acc, e) => ({ kcal: acc.kcal + e.kcal, proteinG: acc.proteinG + e.proteinG }),
    { kcal: 0, proteinG: 0 },
  );
}

function sanitiseNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** crypto.randomUUID() is available in every context this app ships to (https
 *  GitHub Pages, the Tauri custom scheme, Android's WebViewAssetLoader https
 *  origin, and a local http.server for dev) — all secure contexts. The
 *  fallback only guards a browser old enough not to have it. */
function newExtraId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `extra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
