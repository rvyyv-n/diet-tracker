/**
 * Recipes.jsx — the recipe book as its own screen (pass 51), and since pass 48
 * the plan's reading matter too: every meal option and the food table, moved
 * here from Plan. All three answer "what could I eat or log", which is not
 * what Plan's weekly groceries answer. Rebuilt on the v3.0 components in
 * pass 71.
 *
 * The desktop side nav has room for it as a fifth destination. The phone tab
 * bar stays four icons, so on a phone this screen is reached from the row at
 * the foot of Plan (and the book alone still from Today → Log food); App.jsx
 * lights Plan's tab while it's open, and a Plan link at the top leads back.
 *
 * The book is ordered by how often each recipe has been logged, most logged
 * first, and says so as a fact beside the figures. Log puts a recipe on today
 * as an extra. A recipe opens in the editor sheet (a 520px dialog on
 * desktop); delete asks once more, with no Undo. On desktop the screen is two
 * columns: the book and the food table, then the meals.
 */

import { useEffect, useRef, useState } from "react";
import { todayISO } from "./js/core/dates.js";
import { loadProfile, saveProfile } from "./js/core/profile.js";
import { hideFood, visibleFoods } from "./js/core/foods.js";
import { newDay } from "./js/core/day.js";
import { getDay, putDay } from "./js/core/days.js";
import { FOOD_DB, normaliseAddOns } from "./js/core/plan.js";
import { allRecipes, getRecipe, touchRecipe } from "./js/core/recipes.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { RecipeEditor, announceDayTotal, logExtra, sheetProps } from "./LogFood.jsx";
import { MealsBlock, FoodsBlock } from "./PlanReference.jsx";
import { NUM } from "./components/shared.jsx";
import { Button, Eyebrow, Icon, SectionHeading } from "./components/core.jsx";
import { EmptyState, Sheet, Toast } from "./components/surfaces.jsx";
import { useWide } from "./components/useWide.js";

// How long a toast stays before it goes on its own (as on Today and Weight).
const TOAST_MS = 4000;

export default function Recipes({ onNavigate }) {
  const paneRef = useRef(null);
  const wide = useWide();

  const [recipeEditor, setRecipeEditor] = useState(null);
  const [recipeEditorError, setRecipeEditorError] = useState(null);
  const [recipeDeleteConfirming, setRecipeDeleteConfirming] = useState(false);
  const [extrasFoodId, setExtrasFoodId] = useState(() => FOOD_DB[0]?.id ?? null);
  // The block whose meal options are open, or null. One at a time: the point
  // of the disclosure is that the list stays an index you can scan.
  const [openMeal, setOpenMeal] = useState(null);
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState(null); // a message string

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
  useEffect(
    () =>
      subscribe((fresh) => {
        if (!fresh.has("recipes")) bump((n) => n + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const profile = loadProfile();
  const hideFoodRow = (food) => {
    saveProfile(hideFood(profile, food.id));
    setToast(`${food.name} hidden. Restore hidden foods in Settings.`);
    bump((n) => n + 1);
  };
  const iso = todayISO();
  const day = getDay(iso) ?? newDay(iso, profile.currentPhaseId, profile.addOns);
  const phaseId = profile.currentPhaseId || 2;
  // The add-ons this user actually runs (the engine may have changed them),
  // so the meals listed match what Today shows — not the bare phase.
  const addOns = normaliseAddOns(profile.addOns ?? []);

  // Most logged first; allRecipes() is already most recent first, and the
  // sort is stable, so recipes logged the same number of times keep that order.
  const recipes = [...allRecipes()].sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
  const q = filter.trim().toLowerCase();
  const visible = q === "" ? recipes : recipes.filter((r) => r.name.toLowerCase().includes(q));

  function openEditor(id) {
    setRecipeEditorError(null);
    setRecipeDeleteConfirming(false);
    if (id == null) {
      setRecipeEditor({ id: null, name: "", items: [], addMode: "pick", addFoodId: null });
      return;
    }
    const recipe = getRecipe(id);
    if (!recipe) return;
    setRecipeEditor({
      id: recipe.id,
      name: recipe.name,
      items: (recipe.items ?? []).map((it) => ({ ...it })),
      addMode: "pick",
      addFoodId: null,
    });
  }

  function closeEditor() {
    setRecipeEditor(null);
    setRecipeEditorError(null);
    setRecipeDeleteConfirming(false);
  }

  function logRecipe(recipe) {
    touchRecipe(recipe.id);
    const next = logExtra(day, {
      name: recipe.name,
      kcal: recipe.kcal,
      proteinG: recipe.proteinG,
      from: "recipes",
    });
    putDay(next);
    announceDayTotal(next);
    setToast(`${recipe.name} logged · ${NUM.format(recipe.kcal)} kcal`);
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
      <section className="r-rbook">
        <header className="r-rbook__head">
          <button type="button" className="r-rbook__back" onClick={() => onNavigate("plan")}>
            <Icon name="chevronLeft" size={18} />
            Plan
          </button>
          <Eyebrow>Recipe book · meals · food table</Eyebrow>
          <h1 className="r-rbook__title">Recipes</h1>
        </header>

        <div className="r-rbook__grid">
          <section className="r-rbook__sec r-rbook__sec--book" aria-label="Recipe book">
            <SectionHeading
              meta={
                <Button
                  size="sm"
                  className="r-rbook__new r-rbook__new--wide"
                  onClick={() => openEditor(null)}
                >
                  + New recipe
                </Button>
              }
            >
              Recipe book
            </SectionHeading>
            <p className="r-rbook__intro">
              Log puts a recipe on today. New recipes also show under Today &rarr; Log food.
            </p>
            <Button
              fullWidth
              className="r-rbook__new r-rbook__new--phone"
              onClick={() => openEditor(null)}
            >
              + New recipe
            </Button>
            {recipes.length ? (
              <>
                <label className="r-search">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    placeholder="Filter recipes"
                    aria-label="Filter recipes"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
                <ul className="r-rbook__list">
                  {visible.map((r) => (
                    <li key={r.id} className="r-rbook__row">
                      <span className="r-rbook__text">
                        <span className="r-rbook__name">{r.name}</span>
                        <span className="r-rbook__meta">{recipeMeta(r)}</span>
                      </span>
                      <button
                        type="button"
                        className="r-rbook__edit"
                        aria-label={`Edit ${r.name}`}
                        onClick={() => openEditor(r.id)}
                      >
                        Edit
                      </button>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Log ${r.name}`}
                        onClick={() => logRecipe(r)}
                      >
                        Log
                      </Button>
                    </li>
                  ))}
                </ul>
                {visible.length ? null : <p className="r-sheet__note">No recipe matches.</p>}
              </>
            ) : (
              <EmptyState icon="recipes">
                No recipes yet. A recipe is built from the food table and logs as one entry.
              </EmptyState>
            )}
          </section>

          <section className="r-rbook__sec r-rbook__sec--meals" aria-label="Meals">
            <SectionHeading>Meals</SectionHeading>
            <div className="r-rbook__card">
              <MealsBlock
                addOns={addOns}
                phaseId={phaseId}
                openMeal={openMeal}
                setOpenMeal={setOpenMeal}
              />
            </div>
          </section>

          <section className="r-rbook__sec r-rbook__sec--foods" aria-label="Food table">
            <SectionHeading>Food table</SectionHeading>
            <div className="r-rbook__card">
              <FoodsBlock foods={visibleFoods(profile)} onHide={hideFoodRow} />
            </div>
          </section>
        </div>
      </section>

      {toast ? <Toast message={toast} /> : null}
      {recipeEditor ? (
        <Sheet
          label={recipeEditor.id == null ? "New recipe" : "Edit recipe"}
          {...sheetProps(wide, closeEditor)}
        >
          <RecipeEditor extrasState={extrasState} />
        </Sheet>
      ) : null}
    </div>
  );
}

/** "620 kcal · 23 g · 5 items · logged 3×": the figures, then the fact. */
function recipeMeta(r) {
  const n = r.items?.length ?? 0;
  const parts = [`${NUM.format(r.kcal)} kcal`, `${Math.round(r.proteinG)} g`];
  if (n) parts.push(`${n} item${n === 1 ? "" : "s"}`);
  if (r.useCount) parts.push(`logged ${r.useCount}×`);
  return parts.join(" · ");
}
