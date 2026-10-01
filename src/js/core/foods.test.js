import { describe, expect, it } from "vitest";
import { FOOD_DB } from "./plan.js";
import { hiddenFoodIds, hideFood, restoreFoods, visibleFoods } from "./foods.js";

const first = FOOD_DB[0].id;
const second = FOOD_DB[1].id;

describe("hidden foods", () => {
  it("shows the whole table when nothing is hidden", () => {
    expect(visibleFoods({})).toEqual(FOOD_DB);
    expect(hiddenFoodIds({})).toEqual([]);
  });

  it("hides a food and keeps the table order for the rest", () => {
    const p = hideFood({}, second);
    expect(visibleFoods(p).map((f) => f.id)).toEqual(
      FOOD_DB.map((f) => f.id).filter((id) => id !== second),
    );
  });

  it("hides each food once, and adds to what is already hidden", () => {
    const p = hideFood(hideFood(hideFood({}, first), first), second);
    expect(hiddenFoodIds(p)).toEqual([first, second]);
  });

  it("ignores an id that is not in the table", () => {
    const p = { hiddenFoods: ["nope"] };
    expect(hideFood(p, "also_nope")).toBe(p);
    expect(visibleFoods(p)).toEqual(FOOD_DB);
    expect(hiddenFoodIds(p)).toEqual([]);
  });

  it("restores every food, and does not change the profile it was given", () => {
    const p = hideFood({ name: "A" }, first);
    expect(hiddenFoodIds(p)).toEqual([first]);
    expect(restoreFoods(p)).toEqual({ name: "A", hiddenFoods: [] });
    expect(p.hiddenFoods).toEqual([first]);
  });
});
