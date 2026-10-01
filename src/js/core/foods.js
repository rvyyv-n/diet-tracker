/**
 * foods.js — which rows of the food table the user has hidden (pass 79).
 *
 * FOOD_DB stays whole; the profile keeps a list of hidden ids, so nothing is
 * lost and "Restore hidden foods" in Settings brings every row back. A hidden
 * food leaves the table and the pickers. Recipes and logged food that already
 * used it keep their own copy of the name and figures.
 */

import { FOOD_DB } from "./plan.js";

const known = (id) => FOOD_DB.some((f) => f.id === id);

/** The ids hidden now, ignoring any that are no longer in the table. */
export function hiddenFoodIds(profile) {
  return (profile.hiddenFoods ?? []).filter(known);
}

/** The table without the hidden rows, in table order. */
export function visibleFoods(profile) {
  const hidden = new Set(hiddenFoodIds(profile));
  return FOOD_DB.filter((f) => !hidden.has(f.id));
}

/** A copy of the profile with one more food hidden. */
export function hideFood(profile, id) {
  if (!known(id)) return profile;
  return { ...profile, hiddenFoods: [...new Set([...hiddenFoodIds(profile), id])] };
}

/** A copy of the profile with every food shown again. */
export function restoreFoods(profile) {
  return { ...profile, hiddenFoods: [] };
}
