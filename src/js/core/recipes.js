/**
 * recipes.js — the recipe book: named, reusable off-plan items.
 *
 * A recipe is an extra you kept to reuse — `{ id, name, kcal, proteinG,
 * createdAt, lastUsedAt, useCount }`. It is NOT day data (a recipe outlives any
 * one day and never counts toward adherence) and it is not profile data either,
 * so it lives in its own record, mirroring weights.js:
 *
 *   wgt:recipes  ->  { recipes: [ <recipe>, ... ], schemaVersion: N }
 *
 * Two operations connect the book to the rest of the app (see today.js): saving
 * a logged extra into it, and inserting a recipe back onto a day as an extra.
 * touchRecipe() records that second one so allRecipes() can float the meals you
 * actually repeat to the top — the "history" the roadmap asks for, without
 * keeping a full insertion log.
 *
 * The book is new in v2 and simply starts existing at the current
 * SCHEMA_VERSION: it is a new record, not a shape change to an existing one, so
 * it needs no migration step (storage.js MIGRATIONS, as pass 23 anticipated).
 *
 * Names dedupe case-insensitively (recipeKey): saving "Chai" when a "chai" is
 * already in the book updates that entry's numbers instead of adding a twin.
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

/**
 * Save `{ name, kcal, proteinG }` to the book and return the stored recipe. A
 * blank name is rejected (returns null, no write) — same guard as extras.js. If
 * a recipe with the same name key already exists its kcal / protein are updated
 * in place (id, createdAt and usage history kept); otherwise a fresh entry is
 * appended with its own id, `createdAt`, and zeroed usage.
 */
export function saveRecipe({ name, kcal, proteinG } = {}) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return null;

  const list = readList();
  const key = recipeKey(cleanName);
  const existing = list.find((r) => recipeKey(r.name) === key);

  if (existing) {
    const updated = {
      ...existing,
      name: cleanName,
      kcal: sanitiseNumber(kcal),
      proteinG: sanitiseNumber(proteinG),
    };
    writeList(list.map((r) => (r.id === existing.id ? updated : r)));
    return updated;
  }

  const entry = {
    id: newRecipeId(),
    name: cleanName,
    kcal: sanitiseNumber(kcal),
    proteinG: sanitiseNumber(proteinG),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    useCount: 0,
  };
  writeList([...list, entry]);
  return entry;
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
