/**
 * LogFood.jsx — off-plan food and the recipe book (pass 62, moved out of
 * Today.jsx). Today mounts `ExtrasAddPanel`, the "+ Log food" trigger and its
 * Recipes / Foods / Custom tabs; the Recipes screen mounts `ExtrasRecipeForm`,
 * the book on its own. Both hand in the same `extrasState` shape (the open
 * editor and the picked food live in the host screen, so they survive the
 * panel closing) and a `commit` that persists a changed day.
 */

import { useEffect, useRef, useState } from "react";
import { justOpened, announce } from "./js/ui/dom.js";
import { FOOD_DB, phaseTarget } from "./js/core/plan.js";
import { dayTotals } from "./js/core/day.js";
import { addExtra } from "./js/core/extras.js";
import {
  allRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  touchRecipe,
  recipeTotals,
} from "./js/core/recipes.js";
import { listbox } from "./js/ui/listbox.js";
import { NUM, Icon, EmptyState, Imperative } from "./components/shared.jsx";

/** The "+ Log food" trigger and its panel — closed by default, same register
 *  as AddBlockSection's "+ Add a block". Behind the toggle: the recipe book,
 *  the FOOD_DB list, and quick-type. The Recipes tab is always present (pass
 *  28 — it's the way in to the recipe editor, even with an empty book). */
export function ExtrasAddPanel({ day, extrasOpen, setExtrasOpen, extrasState, commit }) {
  const modes = ["recipe", "pick", "type"];
  const { extrasMode, extrasModeTouched } = extrasState;
  // First open this visit defaults to the book when it has anything — a repeat
  // meal is the common case and should be one tap; otherwise the food list.
  const activeMode = !extrasModeTouched && allRecipes().length
    ? "recipe"
    : modes.includes(extrasMode)
      ? extrasMode
      : "pick";

  return (
    <div className="addblock">
      <button className="addblock__trigger" type="button" onClick={() => setExtrasOpen(!extrasOpen)}>
        <span className="addblock__icon" aria-hidden="true">
          <Icon name={extrasOpen ? "minus" : "plus"} size={12} stroke={2} />
        </span>
        {extrasOpen ? "Close" : "Log food"}
      </button>
      {extrasOpen ? (
        <div className="addblock__panel extras__panel">
          <ExtrasModeToggle modes={modes} activeMode={activeMode} extrasState={extrasState} />
          {activeMode === "recipe" ? (
            <ExtrasRecipeForm day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
          ) : activeMode === "pick" ? (
            <ExtrasPickForm day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
          ) : (
            <ExtrasTypeForm day={day} setExtrasOpen={setExtrasOpen} commit={commit} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ExtrasModeToggle({ modes, activeMode, extrasState }) {
  const label = { recipe: "Recipes", pick: "Foods", type: "Custom" };
  const { setExtrasMode, setExtrasModeTouched, setRecipeEditor, setRecipeEditorError } = extrasState;
  return (
    <div className="seg extras__modeseg">
      {modes.map((mode) => (
        <button
          key={mode}
          className={`seg__btn${activeMode === mode ? " is-on" : ""}`}
          type="button"
          onClick={() => {
            if (activeMode === mode) return;
            setExtrasMode(mode);
            setExtrasModeTouched(true);
            // Leaving the Recipes tab drops any half-finished editor.
            setRecipeEditor(null);
            setRecipeEditorError(null);
          }}
        >
          {label[mode]}
        </button>
      ))}
    </div>
  );
}

// --- the recipe book (Recipes tab) --------------------------------------

/** The Recipes tab: the editor when one is open (pass 28), else the insert
 *  list with a "New recipe" trigger above it. Exported so the standalone
 *  Recipes screen (Recipes.jsx, pass 51) can mount the same book —
 *  it hands in its own extrasState-shaped state and a `day` of today, so a
 *  tap on a row still logs the recipe as an extra, here onto today. */
export function ExtrasRecipeForm({ day, extrasState, setExtrasOpen, commit }) {
  return extrasState.recipeEditor ? (
    <RecipeEditorPanel extrasState={extrasState} />
  ) : (
    <RecipeList day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
  );
}

// A book past this size is worth filtering; below it, most-used-first already
// carries the whole list.
const RECIPE_FILTER_THRESHOLD = 8;

/**
 * The book as an insert list: one tap on a row logs that recipe as an extra on
 * the day and bumps its recency (touchRecipe) so the book stays ordered by
 * what's actually eaten. "Edit" opens the editor (where delete also lives, so
 * a destructive tap isn't sitting on every row). Rows reuse .extras__row so a
 * saved recipe and a logged extra read the same.
 */
function RecipeList({ day, extrasState, setExtrasOpen, commit }) {
  const { setRecipeEditor, setRecipeEditorError, setRecipeDeleteConfirming } = extrasState;
  const recipes = allRecipes();
  const showFilter = recipes.length > RECIPE_FILTER_THRESHOLD;
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const visible = q === "" ? recipes : recipes.filter((r) => r.name.toLowerCase().includes(q));

  function openEditor(id) {
    setRecipeEditorError(null);
    setRecipeDeleteConfirming(false);
    if (id == null) {
      setRecipeEditor({ id: null, name: "", items: [], addMode: "pick", addFoodId: null });
    } else {
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
  }

  return (
    <div className="extras__recipes">
      <button className="addblock__trigger" type="button" onClick={() => openEditor(null)}>
        <span className="addblock__icon" aria-hidden="true">+</span>
        New recipe
      </button>
      {showFilter ? (
        <div className="field extras__recipe-filter">
          <div className="field__control">
            <input
              className="field__input"
              type="text"
              placeholder="Filter recipes"
              aria-label="Filter recipes"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      {recipes.length ? (
        visible.map((recipe) => (
          <RecipePickRow key={recipe.id} day={day} recipe={recipe} setExtrasOpen={setExtrasOpen} commit={commit} openEditor={openEditor} />
        ))
      ) : (
        <EmptyState glyph="book-open" line="No saved recipes yet. Build one above, or save a food you've logged." />
      )}
    </div>
  );
}

function RecipePickRow({ day, recipe, setExtrasOpen, commit, openEditor }) {
  return (
    <div className="extras__row extras__pick-row">
      <button
        className="extras__pick"
        type="button"
        onClick={() => {
          setExtrasOpen(false);
          touchRecipe(recipe.id);
          commit(addExtra(day, { name: recipe.name, kcal: recipe.kcal, proteinG: recipe.proteinG }));
        }}
      >
        <span className="extras__name">{recipe.name}</span>
        <span className="block-row__kcal">
          {NUM.format(recipe.kcal)}
          <span className="block-row__unit">kcal</span>
        </span>
      </button>
      <button className="block-row__swap extras__edit" type="button" aria-label={`Edit ${recipe.name}`} onClick={() => openEditor(recipe.id)}>
        Edit
      </button>
    </div>
  );
}

/**
 * The recipe editor (pass 28): a name field, the working ingredient list, an
 * add-ingredient sub-form (pick from FOOD_DB or quick-type, mirroring the
 * extras entry), and the running total. Save routes to createRecipe (new) or
 * updateRecipe (existing, which also renames). Delete only shows when editing
 * an existing recipe.
 */
function RecipeEditorPanel({ extrasState }) {
  const {
    recipeEditor: ed,
    setRecipeEditor,
    recipeEditorError,
    setRecipeEditorError,
    recipeDeleteConfirming,
    setRecipeDeleteConfirming,
  } = extrasState;
  const totals = recipeTotals(ed.items);
  const deleteConfirmJustOpened = justOpened("today.recipeDelete", recipeDeleteConfirming);
  const canSave = Boolean(ed.name.trim()) && ed.items.length > 0;

  function addItem(item) {
    setRecipeEditor((prev) => ({ ...prev, items: [...prev.items, item] }));
    setRecipeEditorError(null);
  }

  function removeItem(index) {
    setRecipeEditor((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setRecipeEditorError(null);
  }

  function save() {
    const result = ed.id == null
      ? createRecipe({ name: ed.name, items: ed.items })
      : updateRecipe(ed.id, { name: ed.name, items: ed.items });
    if (!result) {
      setRecipeEditorError(
        ed.id != null
          ? `Couldn't save — another recipe may already be called "${ed.name.trim()}".`
          : "Couldn't save — give it a name and at least one ingredient.",
      );
      return;
    }
    setRecipeEditor(null);
    setRecipeEditorError(null);
  }

  function close() {
    setRecipeEditor(null);
    setRecipeEditorError(null);
    setRecipeDeleteConfirming(false);
  }

  return (
    <div className="recipe-editor">
      <div className="field">
        <span className="field__label">Name</span>
        <div className="field__control">
          <input
            className="field__input"
            type="text"
            value={ed.name}
            placeholder="e.g. Morning shake"
            maxLength={60}
            onChange={(e) => setRecipeEditor((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
      </div>
      <div className="recipe-editor__items">
        {ed.items.length ? (
          ed.items.map((item, i) => <RecipeItemRow key={i} item={item} onRemove={() => removeItem(i)} />)
        ) : (
          <p className="field__hint">Add an ingredient below.</p>
        )}
      </div>
      <p className="recipe-editor__total">
        Total {NUM.format(Math.round(totals.kcal))} kcal · {Math.round(totals.proteinG)} g protein
      </p>
      <div className="recipe-editor__add">
        <RecipeAddModeToggle extrasState={extrasState} />
        {ed.addMode === "pick" ? (
          <RecipeAddPickForm extrasState={extrasState} onAdd={addItem} />
        ) : (
          <RecipeAddTypeForm onAdd={addItem} />
        )}
      </div>
      {recipeEditorError ? <p className="recipe-editor__error">{recipeEditorError}</p> : null}
      <div className="recipe-editor__actions">
        <button className="btn btn--primary btn--full" type="button" disabled={!canSave} onClick={save}>
          {ed.id == null ? "Save recipe" : "Save changes"}
        </button>
        <button className="btn btn--text" type="button" onClick={close}>
          Cancel
        </button>
        {ed.id != null && !recipeDeleteConfirming ? (
          <button
            className="btn btn--text recipe-editor__delete"
            type="button"
            onClick={() => setRecipeDeleteConfirming(true)}
          >
            Delete recipe
          </button>
        ) : null}
      </div>
      {ed.id != null && recipeDeleteConfirming ? (
        <RecipeDeleteConfirm ed={ed} justOpenedNow={deleteConfirmJustOpened} onCancel={() => setRecipeDeleteConfirming(false)} onClose={close} />
      ) : null}
    </div>
  );
}

/**
 * Delete's own two-step, reusing Settings' .set-confirm rather than the
 * rejected undo-toast pattern — a recipe is real effort to rebuild and this is
 * the app's only unconfirmed destructive tap outside Settings.
 */
function RecipeDeleteConfirm({ ed, justOpenedNow, onCancel, onClose }) {
  return (
    <div className={`set-confirm${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-confirm__title">Delete "{ed.name.trim() || "this recipe"}"?</p>
      <p className="set-confirm__body">This cannot be undone.</p>
      <div className="set-confirm__actions">
        <button
          className="btn btn--danger"
          type="button"
          onClick={() => {
            deleteRecipe(ed.id);
            onClose();
          }}
        >
          Delete recipe
        </button>
        <button className="btn btn--text" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RecipeItemRow({ item, onRemove }) {
  return (
    <div className="extras__row recipe-editor__item">
      <span className="extras__name">{item.name}</span>
      <span className="block-row__kcal">
        {NUM.format(Math.round(Number(item.kcal) || 0))}
        <span className="block-row__unit">kcal</span>
      </span>
      <button className="block-row__drop" type="button" aria-label={`Remove ${item.name}`} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

function RecipeAddModeToggle({ extrasState }) {
  const { recipeEditor: ed, setRecipeEditor } = extrasState;
  return (
    <div className="seg extras__modeseg">
      {[
        ["pick", "Foods"],
        ["type", "Custom"],
      ].map(([mode, label]) => (
        <button
          key={mode}
          className={`seg__btn${ed.addMode === mode ? " is-on" : ""}`}
          type="button"
          onClick={() => {
            if (ed.addMode === mode) return;
            setRecipeEditor((prev) => ({ ...prev, addMode: mode }));
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * A shared food/ingredient picker: the `listbox()` vanilla widget over
 * FOOD_DB, a kcal/protein hint, and an Add button. Used both by the extras
 * "Foods" tab and the recipe editor's "Foods" add-mode — they differ only in
 * where the picked id lives and what a tap on Add actually does.
 */
function PickForm({ label, foodId, onFoodChange, buttonClass, buttonLabel, onAdd }) {
  const effectiveId = foodId != null && FOOD_DB.some((f) => f.id === foodId) ? foodId : (FOOD_DB[0]?.id ?? null);
  const food = FOOD_DB.find((f) => f.id === effectiveId) ?? null;

  // One listbox for the life of the form (pass 59), not one per render: the
  // re-render that follows every pick used to swap in a new trigger, which
  // took keyboard focus with it, so arrowing moved one option and stopped.
  // The latest onFoodChange is read through a ref, since the widget keeps the
  // callback it was built with.
  const onChangeRef = useRef(onFoodChange);
  onChangeRef.current = onFoodChange;
  const lbRef = useRef(null);
  if (!lbRef.current) {
    lbRef.current = listbox({
      options: FOOD_DB.map((f) => ({ value: f.id, label: `${f.name} — ${f.portion}` })),
      value: effectiveId,
      ariaLabel: label,
      // Re-render so the kcal/protein hint and the Add button's captured food
      // follow the new pick.
      onChange: (id) => onChangeRef.current(id),
    });
  }
  const lb = lbRef.current;
  useEffect(() => {
    if (lb.get() !== effectiveId) lb.set(effectiveId);
  }, [lb, effectiveId]);

  return (
    <div className="extras__form">
      <div className="field">
        <span className="field__label">{label}</span>
        <Imperative node={lb.node} />
      </div>
      {food ? (
        <p className="field__hint">{NUM.format(food.kcal)} kcal · {Math.round(food.proteinG)} g protein</p>
      ) : null}
      <button className={buttonClass} type="button" disabled={!food} onClick={() => food && onAdd(food)}>
        {buttonLabel}
      </button>
    </div>
  );
}

function RecipeAddPickForm({ extrasState, onAdd }) {
  const { recipeEditor: ed, setRecipeEditor } = extrasState;
  return (
    <PickForm
      label="Ingredient"
      foodId={ed.addFoodId}
      onFoodChange={(v) => setRecipeEditor((prev) => ({ ...prev, addFoodId: v }))}
      buttonClass="btn btn--secondary btn--full"
      buttonLabel="Add ingredient"
      onAdd={(food) => onAdd({ name: food.name, kcal: food.kcal, proteinG: food.proteinG })}
    />
  );
}

/** Pick a FOOD_DB entry through the existing listbox control; its kcal /
 *  protein come along unedited, so this path is one tap once a food is
 *  chosen. */
function ExtrasPickForm({ day, extrasState, setExtrasOpen, commit }) {
  const { extrasFoodId, setExtrasFoodId } = extrasState;
  return (
    <PickForm
      label="Food"
      foodId={extrasFoodId}
      onFoodChange={setExtrasFoodId}
      buttonClass="btn btn--primary btn--full"
      buttonLabel="Add"
      onAdd={(food) => {
        setExtrasOpen(false);
        commit(addExtra(day, { name: food.name, kcal: food.kcal, proteinG: food.proteinG }));
      }}
    />
  );
}

/**
 * A shared quick-type form: name, kcal, protein by hand. Add stays disabled
 * until a name is typed — kcal/protein of "" sanitise to 0 at the call site,
 * a fine default for something like a black coffee.
 */
function TypeForm({ label, placeholder, buttonClass, buttonLabel, onAdd }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");

  return (
    <div className="extras__form">
      <div className="field">
        <span className="field__label">{label}</span>
        <div className="field__control">
          <input
            className="field__input"
            type="text"
            placeholder={placeholder}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="extras__row-fields">
        <div className="field">
          <span className="field__label">Kcal</span>
          <div className="field__control">
            <input
              className="field__input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="0"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <span className="field__label">Protein (g)</span>
          <div className="field__control">
            <input
              className="field__input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="0"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
        </div>
      </div>
      <button className={buttonClass} type="button" disabled={!name.trim()} onClick={() => onAdd({ name, kcal, proteinG: protein })}>
        {buttonLabel}
      </button>
    </div>
  );
}

function RecipeAddTypeForm({ onAdd }) {
  return (
    <TypeForm label="Ingredient" placeholder="e.g. Honey" buttonClass="btn btn--secondary btn--full" buttonLabel="Add ingredient" onAdd={onAdd} />
  );
}

/** Quick-type a one-off item by hand. */
function ExtrasTypeForm({ day, setExtrasOpen, commit }) {
  return (
    <TypeForm
      label="Food"
      placeholder="e.g. Chocolate bar"
      buttonClass="btn btn--primary btn--full"
      buttonLabel="Add"
      onAdd={(item) => {
        setExtrasOpen(false);
        commit(addExtra(day, item));
      }}
    />
  );
}

/** Tell a screen reader the one fact that changed — the new total — rather
 * than the whole re-render. Shares TotalCard's own wording. */
export function announceDayTotal(day) {
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId);
  const toGo = Math.max(0, target.kcal - totals.kcal);
  const blocksLeft = Math.max(0, totals.total - totals.planDone);
  const blockWord = blocksLeft === 1 ? "block" : "blocks";
  let remaining;
  if (blocksLeft === 0 && toGo === 0) remaining = "All done.";
  else if (toGo === 0) remaining = `Target met, ${blocksLeft} ${blockWord} left.`;
  else remaining = `${NUM.format(toGo)} kcal to go, ${blocksLeft} ${blockWord} left.`;
  announce(`${NUM.format(totals.kcal)} of ${NUM.format(target.kcal)} kcal. ${remaining}`);
}
