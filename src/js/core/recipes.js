/**
 * recipes.js — the recipe book: named, reusable off-plan items.
 *
 * A recipe is `{ id, name, items, kcal, proteinG, createdAt, lastUsedAt,
 * useCount }`. `items` is the list of ingredients it's built from — each a
 * `{ name, kcal, proteinG }` snapshot, picked from plan.js's FOOD_DB or
 * quick-typed — and `kcal` / `proteinG` on the recipe are the sum of them,
 * kept denormalised so callers (and a backup file) don't have to re-add every
 * time. A recipe saved straight from a logged extra has a single item
 * mirroring itself.
 *
 * It is NOT day data (a recipe outlives any one day and never counts toward
 * adherence) and it is not profile data either, so it lives in its own record,
 * mirroring weights.js:
 *
 *   wgt:recipes  ->  { recipes: [ <recipe>, ... ], schemaVersion: N }
 *
 * Operations that connect the book to the rest of the app (see today.js):
 * saving a logged extra into it (saveRecipe), building or editing one in the
 * recipe editor (createRecipe / updateRecipe / deleteRecipe), and inserting a
 * recipe back onto a day as a single extra. touchRecipe() records that last
 * one so allRecipes() floats the meals you actually repeat to the top — and so
 * the Weight tab can name your most-logged one (topLoggedRecipes).
 *
 * Names dedupe case-insensitively (recipeKey): saving "Chai" when a "chai" is
 * already in the book updates that entry instead of adding a twin, and the
 * editor will not let you rename one recipe onto another's name.
 */

import { load, save } from "./storage.js";

const RECORD = "recipes";

function readList() {
  const list = load(RECORD, { recipes: [] }).recipes;
  return Array.isArray(list) ? list : [];
}

function writeList(recipes) {
  return save(RECORD, { recipes });
}

/**
 * The name key used to dedupe and to test membership: trimmed and lowercased,
 * so "Chai", " chai " and "CHAI" are one recipe. Exported so callers (today.js
 * decides whether to offer "Save" on a logged extra) don't re-implement the
 * rule.
 */
export function recipeKey(name) {
  return String(name ?? "").trim().toLowerCase();
}

/** Sum a list of `{ kcal, proteinG }` — a recipe's totals from its items. */
export function recipeTotals(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (acc, it) => ({ kcal: acc.kcal + sanitiseNumber(it.kcal), proteinG: acc.proteinG + sanitiseNumber(it.proteinG) }),
    { kcal: 0, proteinG: 0 },
  );
}

/**
 * Every saved recipe, most-recently-used first (never-used entries fall back to
 * their creation time), name as the tiebreak. This ordering is the whole point
 * of the book: a repeat meal should be the first row you see.
 */
export function allRecipes() {
  return [...readList()].sort((a, b) => {
    const ta = a.lastUsedAt ?? a.createdAt ?? "";
    const tb = b.lastUsedAt ?? b.createdAt ?? "";
    if (ta !== tb) return ta < tb ? 1 : -1;
    return String(a.name).localeCompare(String(b.name));
  });
}

/** One recipe by id, or null. */
export function getRecipe(id) {
  return readList().find((r) => r.id === id) ?? null;
}

/**
 * The recipes logged at least `minCount` times, most-logged first (name as the
 * tiebreak). Drives the Weight tab's "most logged" line; returns [] when
 * nothing clears the bar, so the readout can simply not render.
 */
export function topLoggedRecipes(minCount = 2) {
  return readList()
    .filter((r) => (r.useCount ?? 0) >= minCount)
    .sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0) || String(a.name).localeCompare(String(b.name)));
}

/**
 * Create a recipe from `{ name, items }` and return it. A blank name or an
 * empty item list is rejected (returns null, no write). Items are sanitised
 * (names trimmed, blanks dropped, numbers coerced) and the recipe's totals are
 * their sum. If a recipe with the same name key already exists it is updated in
 * place — id, createdAt and usage history kept.
 */
export function createRecipe({ name, items } = {}) {
  const cleanName = String(name ?? "").trim();
  const cleanItems = sanitiseItems(items);
  if (!cleanName || !cleanItems.length) return null;

  const list = readList();
  const key = recipeKey(cleanName);
  const totals = recipeTotals(cleanItems);
  const existing = list.find((r) => recipeKey(r.name) === key);

  if (existing) {
    const updated = { ...existing, name: cleanName, items: cleanItems, kcal: totals.kcal, proteinG: totals.proteinG };
    writeList(list.map((r) => (r.id === existing.id ? updated : r)));
    return updated;
  }

  const entry = {
    id: newRecipeId(),
    name: cleanName,
    items: cleanItems,
    kcal: totals.kcal,
    proteinG: totals.proteinG,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    useCount: 0,
  };
  writeList([...list, entry]);
  return entry;
}

/**
 * Save `{ name, kcal, proteinG }` straight from a logged extra: a one-item
 * recipe. Thin wrapper over createRecipe so the dedupe and sanitising rules
 * live in one place.
 */
export function saveRecipe({ name, kcal, proteinG } = {}) {
  return createRecipe({ name, items: [{ name, kcal, proteinG }] });
}

/**
 * Rename and/or re-build an existing recipe from `{ name, items }`. Returns the
 * updated recipe, or null if the id is unknown, the name/items are empty, or
 * the new name would collide with a *different* recipe (the editor blocks this
 * up front, this is the backstop). Totals are re-summed from the new items.
 */
export function updateRecipe(id, { name, items } = {}) {
  const list = readList();
  const target = list.find((r) => r.id === id);
  if (!target) return null;

  const cleanName = String(name ?? "").trim();
  const cleanItems = sanitiseItems(items);
  if (!cleanName || !cleanItems.length) return null;

  const key = recipeKey(cleanName);
  if (list.some((r) => r.id !== id && recipeKey(r.name) === key)) return null;

  const totals = recipeTotals(cleanItems);
  const updated = { ...target, name: cleanName, items: cleanItems, kcal: totals.kcal, proteinG: totals.proteinG };
  writeList(list.map((r) => (r.id === id ? updated : r)));
  return updated;
}

/** Drop a recipe from the book by id. Returns false if the id wasn't present. */
export function deleteRecipe(id) {
  const list = readList();
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return false;
  return writeList(next);
}

/**
 * Record that a recipe was just inserted onto a day: bump `useCount` and stamp
 * `lastUsedAt` so allRecipes() reorders. No-op (returns false) for an unknown
 * id.
 */
export function touchRecipe(id) {
  const list = readList();
  let found = false;
  const next = list.map((r) => {
    if (r.id !== id) return r;
    found = true;
    return { ...r, lastUsedAt: new Date().toISOString(), useCount: (r.useCount ?? 0) + 1 };
  });
  return found ? writeList(next) : false;
}

/** Clean an incoming item list: trim names, drop blanks, coerce numbers. */
function sanitiseItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((it) => ({
      name: String(it?.name ?? "").trim(),
      kcal: sanitiseNumber(it?.kcal),
      proteinG: sanitiseNumber(it?.proteinG),
    }))
    .filter((it) => it.name);
}

/** Coerce to a non-negative number; bad or missing input becomes 0, never NaN.
 *  Mirrors extras.js — a recipe carries the same kind of figures. */
function sanitiseNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** crypto.randomUUID() everywhere this app ships (all secure contexts); the
 *  fallback only guards a browser old enough not to have it. Mirrors
 *  extras.js newExtraId(). */
function newRecipeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `recipe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
