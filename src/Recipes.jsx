/**
 * Recipes.jsx — the recipe book as its own screen (pass 51).
 *
 * The book has existed since pass 26, but only ever inside Today's "Log food"
 * panel, three disclosures deep. On the desktop side nav there is room for a
 * fifth destination, so it gets one; the phone tab bar stays four icons and
 * still reaches the book the old way (Today → Log food → Recipes), which is
 * why App.jsx marks this screen `desktopOnly` and the tab button is hidden
 * below --bp-desktop.
 *
 * There is no new UI here: it mounts Today's own `ExtrasRecipeForm` — the same
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
import { FOOD_DB } from "./js/core/plan.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { ExtrasRecipeForm } from "./Today.jsx";

export default function Recipes() {
  const paneRef = useRef(null);

  const [recipeEditor, setRecipeEditor] = useState(null);
  const [recipeEditorError, setRecipeEditorError] = useState(null);
  const [recipeDeleteConfirming, setRecipeDeleteConfirming] = useState(false);
  const [extrasFoodId, setExtrasFoodId] = useState(() => FOOD_DB[0]?.id ?? null);

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

  function commit(nextDay) {
    putDay(nextDay);
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
      <section className="screen">
        <div className="screen-head">
          <h1 className="screen__title screen__title--lg">Recipes</h1>
          <p className="phase-banner">Your saved off-plan meals</p>
        </div>
        <p className="screen__intro">
          Tap a recipe to log it on today, or Edit to change what it&rsquo;s built from. New recipes also
          appear under Today &rarr; Log food.
        </p>
        <ExtrasRecipeForm day={day} extrasState={extrasState} setExtrasOpen={() => {}} commit={commit} />
      </section>
    </div>
  );
}
