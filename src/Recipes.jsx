/**
 * Recipes.jsx — the recipe book as its own screen (pass 51), and since pass 48
 * the plan's reading matter too: every meal option and the food table, moved
 * here from Plan. All three answer "what could I eat or log", which is not
 * what Plan's weekly groceries answer.
 *
 * The desktop side nav has room for it as a fifth destination. The phone tab
 * bar stays four icons, so on a phone this screen is reached from the row at
 * the foot of Plan (and the book alone still from Today → Log food); App.jsx
 * lights Plan's tab while it's open, since that's where it was reached from.
 *
 * There is no new UI here: it mounts LogFood.jsx's `ExtrasRecipeForm` — the same
 * list, editor, rename and delete — with a local copy of the slice of Today
 * state that component reads (`recipeEditor` and friends) and a `day` of
 * today, so a tap on a recipe row still logs it as an extra, here always onto
 * the current day.
 */

import { useEffect, useRef, useState } from "react";
import { todayISO } from "./js/core/dates.js";
import { loadProfile } from "./js/core/profile.js";
import { newDay } from "./js/core/day.js";
import { getDay, putDay } from "./js/core/days.js";
import { FOOD_DB, normaliseAddOns } from "./js/core/plan.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { ExtrasRecipeForm, announceDayTotal } from "./LogFood.jsx";
import { MealsBlock, FoodsBlock } from "./PlanReference.jsx";
import { Group } from "./components/shared.jsx";

export default function Recipes() {
  const paneRef = useRef(null);

  const [recipeEditor, setRecipeEditor] = useState(null);
  const [recipeEditorError, setRecipeEditorError] = useState(null);
  const [recipeDeleteConfirming, setRecipeDeleteConfirming] = useState(false);
  const [extrasFoodId, setExtrasFoodId] = useState(() => FOOD_DB[0]?.id ?? null);
  // The block whose meal options are open, or null. One at a time: the point
  // of the disclosure is that the list stays an index you can scan.
  const [openMeal, setOpenMeal] = useState(null);

  useEffect(() => {
    const node = paneRef.current;
    node.classList.remove("tab-switching");
    void node.offsetWidth;
    node.classList.add("tab-switching");
  }, []);

  useEffect(() => {
    publish("recipes");
  });

  const [, bump] = useState(0);
  useEffect(() => subscribe((fresh) => {
    if (!fresh.has("recipes")) bump((n) => n + 1);
  }), []);

  const profile = loadProfile();
  const iso = todayISO();
  const day = getDay(iso) ?? newDay(iso, profile.currentPhaseId, profile.addOns);
  const phaseId = profile.currentPhaseId || 2;
  // The add-ons this user actually runs (the engine may have changed them),
  // so the meals listed match what Today shows — not the bare phase.
  const addOns = normaliseAddOns(profile.addOns ?? []);

  function commit(nextDay) {
    putDay(nextDay);
    announceDayTotal(nextDay);
    bump((n) => n + 1);
  }

  const extrasState = {
    recipeEditor,
    setRecipeEditor,
    recipeEditorError,
    setRecipeEditorError,
    recipeDeleteConfirming,
    setRecipeDeleteConfirming,
    extrasFoodId,
    setExtrasFoodId,
  };

  return (
    <div className="pane" data-screen="recipes" ref={paneRef}>
      <section className="screen planscreen">
        <div className="screen-head">
          <h1 className="screen__title screen__title--lg">Recipes</h1>
          <p className="phase-banner">Recipe book · meals · food table</p>
        </div>
        <Group label="Recipe book" icon="book-open">
          <p className="screen__intro">
            Tap a recipe to log it on today, or Edit to change what it&rsquo;s built from. New recipes also
            appear under Today &rarr; Log food.
          </p>
          <ExtrasRecipeForm day={day} extrasState={extrasState} setExtrasOpen={() => {}} commit={commit} />
        </Group>
        <Group label="Meals" icon="utensils">
          <div className="card planref">
            <MealsBlock addOns={addOns} phaseId={phaseId} openMeal={openMeal} setOpenMeal={setOpenMeal} />
          </div>
        </Group>
        <Group label="Food table" icon="table">
          <div className="card planref">
            <FoodsBlock />
          </div>
        </Group>
      </section>
    </div>
  );
}
