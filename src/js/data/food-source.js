/**
 * food-source.js — the single seam between the app and food data.
 *
 * Nothing else in the app may reach for food data directly. Today every lookup
 * is answered from a local table bundled with the app, which is what keeps it
 * working with no connection. A later version is intended to query a remote
 * nutrition API for accuracy; when that happens, only this file changes.
 *
 * The functions are async even though the local implementation is instant, so
 * that swapping in a network call later does not force every caller to change.
 */

/** Populated once the plan's data model is settled. */
const LOCAL_FOODS = [
  // { id, name, per: "100g" | "serving", kcal, proteinG }
];

/** Look one food up by id. Resolves to null when unknown. */
export async function getFood(id) {
  return LOCAL_FOODS.find((food) => food.id === id) ?? null;
}

/** Substring search over food names, for the off-plan entry screen. */
export async function searchFoods(query, { limit = 20 } = {}) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return LOCAL_FOODS
    .filter((food) => food.name.toLowerCase().includes(needle))
    .slice(0, limit);
}

/** True when lookups are answered locally — the UI can hide network states. */
export function isOffline() {
  return true;
}
