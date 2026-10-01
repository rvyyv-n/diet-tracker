/**
 * LogFood.jsx — Today's sheets and the recipe book (pass 62, moved out of
 * Today.jsx; sheets from pass 67). Today opens four of them: Log food (the
 * recipe book, the food list and quick-type), Swap, Add a block and the
 * Calendar. Each is a bottom sheet on a phone and a 520px dialog on desktop
 * (`dialog`). The Recipes screen mounts `ExtrasRecipeForm`, the book on its
 * own. Both hand in the same `extrasState` shape (the open editor and the
 * picked food live in the host screen, so they survive the sheet closing) and
 * a `commit(day, toast)` that persists a changed day; `toast` is the line the
 * host may show with an Undo.
 */

import { useEffect, useRef, useState } from "react";
import { announce } from "./js/ui/dom.js";
import { FOOD_DB, ADDON_IDS, blockById, phaseTarget, rotationOptions } from "./js/core/plan.js";
import {
  dayTotals,
  dayAddOns,
  dayBonus,
  blockValue,
  addBlock,
  removeBlock,
  chooseRotation,
  intakeStatus,
} from "./js/core/day.js";
import { addExtra } from "./js/core/extras.js";
import { getDay } from "./js/core/days.js";
import { todayISO, MONTH_NAMES, daysInMonth } from "./js/core/dates.js";
import {
  allRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  touchRecipe,
  recipeTotals,
  saveRecipe,
} from "./js/core/recipes.js";
import { listbox } from "./js/ui/listbox.js";
import { NUM, Imperative } from "./components/shared.jsx";
import { Button, Segmented, TextField, Toggle, Icon } from "./components/core.jsx";
import {
  Sheet,
  OptionRow,
  CalendarGrid,
  ConfirmPanel,
  EmptyState,
} from "./components/surfaces.jsx";

/** The desktop nav's width, which a dialog centres beside. Matches --panel-nav-width. */
const NAV_INSET = 256;

/** Local clock as "HH:MM": block times compare against it, and logged food keeps it. */
export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Log an extra, stamped with the time when it goes on today. */
export function logExtra(day, item) {
  return addExtra(day, { ...item, at: day.date === todayISO() ? nowHHMM() : undefined });
}

/** "Today only" on today, the short date on yesterday. */
export function sheetMeta(day) {
  return day.date === todayISO() ? "Today only" : shortDate(day.date);
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Wed 30 Sep" from a local ISO date; "30 Sep" with `weekday` false. */
export function shortDate(iso, weekday = true) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = `${d} ${MONTH_NAMES[m - 1].slice(0, 3)}`;
  return weekday ? `${WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()]} ${date}` : date;
}

export function sheetProps(dialog, onClose) {
  return dialog ? { variant: "dialog", navInset: NAV_INSET, onClose } : { onClose };
}

// --- Log food ----------------------------------------------------------

const LOG_MODES = [
  { value: "recipe", label: "Recipes" },
  { value: "pick", label: "Foods" },
  { value: "type", label: "Custom" },
];

/** Log food: the recipe book, the food list and quick-type, behind a segmented control. */
export function LogFoodSheet({ day, dialog, extrasState, onClose, commit }) {
  const { extrasMode, setExtrasMode, extrasModeTouched, setExtrasModeTouched } = extrasState;
  // First open this visit defaults to the book when it has anything: a repeat
  // meal is the common case and should be one tap. Otherwise the food list.
  const mode =
    !extrasModeTouched && allRecipes().length
      ? "recipe"
      : LOG_MODES.some((m) => m.value === extrasMode)
        ? extrasMode
        : "pick";

  function pickMode(next) {
    if (next === mode) return;
    setExtrasMode(next);
    setExtrasModeTouched(true);
    // Leaving the Recipes tab drops any half-finished editor.
    extrasState.setRecipeEditor(null);
    extrasState.setRecipeEditorError(null);
  }

  const done = () => onClose();
  return (
    <Sheet title="Log food" meta={shortDate(day.date)} {...sheetProps(dialog, onClose)}>
      <Segmented label="Log from" options={LOG_MODES} value={mode} onChange={pickMode} />
      {mode === "recipe" ? (
        <ExtrasRecipeForm
          day={day}
          extrasState={extrasState}
          setExtrasOpen={done}
          commit={commit}
        />
      ) : mode === "pick" ? (
        <ExtrasPickForm day={day} extrasState={extrasState} onDone={done} commit={commit} />
      ) : (
        <ExtrasTypeForm day={day} onDone={done} commit={commit} />
      )}
    </Sheet>
  );
}

// --- Swap ----------------------------------------------------------------

/**
 * Swap: the block's rotation options, the current one noted. The pick lands
 * on Done; closing the sheet any other way changes nothing. A phase add-on
 * can also be dropped for the day from here, the one place that offers it.
 */
export function SwapSheet({ day, blockId, dialog, onClose, commit }) {
  const block = blockById(blockId);
  const current = block?.rotation ? day.rotations[block.rotation] : null;
  const [picked, setPicked] = useState(current);
  if (!block?.rotation) return null;
  const options = rotationOptions(block.rotation);
  const droppable = ADDON_IDS.includes(block.id) && !dayBonus(day).includes(block.id);

  return (
    <Sheet title={`Swap ${block.name}`} meta={sheetMeta(day)} {...sheetProps(dialog, onClose)}>
      <div role="radiogroup" aria-label={`${block.name} options`}>
        {options.map((opt, i) => (
          <OptionRow
            key={opt.id}
            name={opt.desc}
            note={opt.id === current ? "Current" : undefined}
            kcal={NUM.format(opt.kcal)}
            protein={Math.round(opt.proteinG)}
            selected={opt.id === picked}
            last={i === options.length - 1}
            onClick={() => setPicked(opt.id)}
          />
        ))}
      </div>
      <Button
        fullWidth
        onClick={() => {
          if (picked && picked !== current) commit(chooseRotation(day, block.rotation, picked));
          onClose();
        }}
      >
        Done
      </Button>
      {droppable ? (
        <Button
          variant="text"
          className="r-sheet__aside"
          onClick={() => {
            commit(removeBlock(day, block.id), `${block.name} removed for today`);
            onClose();
          }}
        >
          Remove {block.name} for {day.date === todayISO() ? "today" : "that day"}
        </Button>
      ) : null}
    </Sheet>
  );
}

// --- Add a block -------------------------------------------------------

/**
 * Add a block: the add-ons not already on the day. Adding a phase default the
 * user dropped restores it to the plan; anything else is a bonus block (kcal
 * only), which is what the note says.
 */
export function AddBlockSheet({ day, dialog, onClose, commit }) {
  const onDay = new Set([...dayAddOns(day), ...dayBonus(day)]);
  const available = ADDON_IDS.filter((id) => !onDay.has(id))
    .map(blockById)
    .filter(Boolean);
  const [picked, setPicked] = useState(available[0]?.id ?? null);
  const block = available.find((b) => b.id === picked) ?? null;

  return (
    <Sheet title="Add a block" meta={sheetMeta(day)} {...sheetProps(dialog, onClose)}>
      <p className="r-sheet__note">
        A bonus block counts toward the day&rsquo;s kcal but never against adherence.
      </p>
      {available.length ? (
        <div className="r-sheet__options" role="radiogroup" aria-label="Blocks">
          {available.map((b, i) => {
            const v = blockValue(day, b.id);
            return (
              <OptionRow
                key={b.id}
                name={b.name}
                note={resolveDesc(day, b)}
                kcal={NUM.format(v.kcal)}
                protein={Math.round(v.proteinG)}
                selected={b.id === picked}
                last={i === available.length - 1}
                onClick={() => setPicked(b.id)}
              />
            );
          })}
        </div>
      ) : (
        <p className="r-sheet__note">Every add-on is already on the day.</p>
      )}
      <div className="r-sheet__actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!block}
          onClick={() => {
            commit(addBlock(day, block.id), `${block.name} added for today`);
            onClose();
          }}
        >
          {block ? `Add ${block.name}` : "Add"}
        </Button>
      </div>
    </Sheet>
  );
}

// --- Calendar ------------------------------------------------------------

/**
 * The calendar: any day from the plan's start to today, each with its intake
 * dot. Picking one views it (read-only once closed, as always). Weeks start
 * on Monday.
 */
export function CalendarSheet({ value, min, max, dialog, onPick, onClose }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const count = daysInMonth(y, m);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const today = todayISO();

  const days = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const iso = `${month}-${String(n).padStart(2, "0")}`;
    const rec = iso === today ? null : getDay(iso);
    const status =
      iso === today ? "today" : rec && dayTotals(rec).done > 0 ? intakeStatus(rec) : undefined;
    return {
      n,
      iso,
      status,
      selected: iso === value,
      disabled: iso < min || iso > max,
      label: `${longDate(iso)}${status && status !== "today" ? `, ${STATUS_WORD[status]}` : ""}`,
    };
  });

  const step = (delta) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <Sheet title="" label="Calendar" {...sheetProps(dialog, onClose)}>
      <CalendarGrid
        month={y === Number(today.slice(0, 4)) ? MONTH_NAMES[m - 1] : `${MONTH_NAMES[m - 1]} ${y}`}
        leadingBlanks={lead}
        days={days}
        prevDisabled={month <= min.slice(0, 7)}
        nextDisabled={month >= max.slice(0, 7)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        note={`Days before ${shortDate(min, false)} have no plan.`}
        onPick={(n) => {
          onPick(days[n - 1].iso);
          onClose();
        }}
      />
    </Sheet>
  );
}

const STATUS_WORD = { "on-track": "on track", partial: "partial", low: "low" };

/** "Monday 28 September" from a local ISO date. */
export function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** The description to show for a block: the chosen rotation option's, if any. */
export function resolveDesc(day, block) {
  if (block.rotation) {
    const opt = rotationOptions(block.rotation).find((o) => o.id === day.rotations[block.rotation]);
    if (opt) return opt.desc;
  }
  return block.desc;
}

// --- the recipe book (Recipes tab) --------------------------------------

/** The Recipes tab: the editor when one is open (pass 28), else the book.
 *  Exported so the standalone Recipes screen (Recipes.jsx, pass 51) can mount
 *  the same book; it hands in its own extrasState-shaped state and a `day` of
 *  today, so Log still puts the recipe on today. */
export function ExtrasRecipeForm({ day, extrasState, setExtrasOpen, commit }) {
  return extrasState.recipeEditor ? (
    <RecipeEditor extrasState={extrasState} inline />
  ) : (
    <RecipeList day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
  );
}

/**
 * The book as a list: Log puts that recipe on the day as an extra and bumps
 * its recency (touchRecipe), so the book stays ordered by what's actually
 * eaten. The name opens the editor, where delete also lives.
 */
function RecipeList({ day, extrasState, setExtrasOpen, commit }) {
  const { setRecipeEditor, setRecipeEditorError, setRecipeDeleteConfirming } = extrasState;
  const recipes = allRecipes();
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
    <div className="r-recipes">
      {recipes.length ? (
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
      ) : null}
      {recipes.length ? (
        <div className="r-recipes__list">
          {visible.map((recipe) => (
            <div key={recipe.id} className="r-logrow">
              <button
                type="button"
                className="r-logrow__name"
                aria-label={`Edit ${recipe.name}`}
                onClick={() => openEditor(recipe.id)}
              >
                {recipe.name}
              </button>
              <span className="r-logrow__figures">
                {NUM.format(recipe.kcal)}
                <span className="r-logrow__protein">{Math.round(recipe.proteinG)} g</span>
              </span>
              <Button
                size="sm"
                aria-label={`Log ${recipe.name}`}
                onClick={() => {
                  setExtrasOpen(false);
                  touchRecipe(recipe.id);
                  commit(
                    logExtra(day, {
                      name: recipe.name,
                      kcal: recipe.kcal,
                      proteinG: recipe.proteinG,
                      from: "recipes",
                    }),
                    `${recipe.name} logged · ${NUM.format(recipe.kcal)} kcal`,
                  );
                }}
              >
                Log
              </Button>
            </div>
          ))}
          {visible.length ? null : <p className="r-sheet__note">No recipe matches.</p>}
        </div>
      ) : (
        <EmptyState icon="recipes">
          No saved recipes yet. Build one below, or save a food as you log it.
        </EmptyState>
      )}
      <Button variant="secondary" fullWidth onClick={() => openEditor(null)}>
        + New recipe
      </Button>
    </div>
  );
}

/**
 * The recipe editor (pass 28, restyled pass 71): a name field, the ingredients
 * it is built from, an add-ingredient area (pick from FOOD_DB or quick-type,
 * mirroring the extras entry), and the running total beside Save. Save routes
 * to createRecipe (new) or updateRecipe (existing, which also renames). Delete
 * only shows when editing an existing recipe, and asks once more, with no
 * Undo: a recipe is real effort to rebuild, and days it was logged on keep
 * their kcal. `inline` is the copy inside the Log food sheet, which has no
 * sheet of its own to close, so it gets a Cancel; the Recipes screen wraps the
 * editor in its own Sheet.
 */
export function RecipeEditor({ extrasState, inline = false }) {
  const {
    recipeEditor: ed,
    setRecipeEditor,
    recipeEditorError,
    setRecipeEditorError,
    recipeDeleteConfirming,
    setRecipeDeleteConfirming,
  } = extrasState;
  const [adding, setAdding] = useState(ed.items.length === 0);
  const totals = recipeTotals(ed.items);
  const canSave = Boolean(ed.name.trim()) && ed.items.length > 0;

  function addItem(item) {
    setRecipeEditor((prev) => ({ ...prev, items: [...prev.items, item] }));
    setRecipeEditorError(null);
    setAdding(false);
  }

  function removeItem(index) {
    setRecipeEditor((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setRecipeEditorError(null);
  }

  function save() {
    const result =
      ed.id == null
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
    <div className="r-recipe-editor">
      <div className="r-recipe-editor__top">
        <h3 className="r-recipe-editor__title">{ed.id == null ? "New recipe" : "Edit recipe"}</h3>
        {ed.id != null && !recipeDeleteConfirming ? (
          <button
            type="button"
            className="r-recipe-editor__delete"
            onClick={() => setRecipeDeleteConfirming(true)}
          >
            Delete
          </button>
        ) : null}
      </div>
      <TextField
        label="Name"
        placeholder="e.g. Morning shake"
        maxLength={60}
        value={ed.name}
        onChange={(v) => setRecipeEditor((prev) => ({ ...prev, name: v }))}
      />
      <div className="r-recipe-editor__built">
        <div className="r-recipe-editor__label">Built from</div>
        {ed.items.length ? (
          <ul className="r-recipe-editor__items">
            {ed.items.map((item, i) => (
              <li key={i} className="r-recipe-editor__item">
                <span className="r-recipe-editor__name">{item.name}</span>
                <span className="r-recipe-editor__kcal">
                  {NUM.format(Math.round(Number(item.kcal) || 0))}
                </span>
                <button
                  type="button"
                  className="r-recipe-editor__remove"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(i)}
                >
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="r-sheet__note">Add an ingredient below.</p>
        )}
        {adding ? (
          <div className="r-recipe-editor__add">
            <Segmented
              label="Add from"
              value={ed.addMode}
              onChange={(mode) => setRecipeEditor((prev) => ({ ...prev, addMode: mode }))}
              options={[
                { value: "pick", label: "Foods" },
                { value: "type", label: "Custom" },
              ]}
            />
            {ed.addMode === "pick" ? (
              <RecipeAddPickForm extrasState={extrasState} onAdd={addItem} />
            ) : (
              <RecipeAddTypeForm onAdd={addItem} />
            )}
          </div>
        ) : (
          <button type="button" className="r-recipe-editor__more" onClick={() => setAdding(true)}>
            + Add from the food table
          </button>
        )}
      </div>
      {recipeEditorError ? (
        <p className="r-recipe-editor__error" role="alert">
          {recipeEditorError}
        </p>
      ) : null}
      {ed.id != null && recipeDeleteConfirming ? (
        <ConfirmPanel
          title={`Delete “${ed.name.trim() || "this recipe"}”?`}
          body="This cannot be undone. Days it was logged on keep their kcal."
          confirmLabel="Delete"
          onConfirm={() => {
            deleteRecipe(ed.id);
            close();
          }}
          onCancel={() => setRecipeDeleteConfirming(false)}
        />
      ) : null}
      <div className="r-recipe-editor__foot">
        <span className="r-recipe-editor__total">
          <b>{NUM.format(Math.round(totals.kcal))} kcal</b> · {Math.round(totals.proteinG)} g
          protein
        </span>
        {inline ? (
          <Button variant="text" onClick={close}>
            Cancel
          </Button>
        ) : null}
        <Button disabled={!canSave} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

/**
 * A shared food/ingredient picker: the `listbox()` vanilla widget over
 * FOOD_DB, a kcal/protein hint, and an Add button. Used both by the Log food
 * "Foods" tab and the recipe editor's "Foods" add-mode — they differ only in
 * where the picked id lives and what a tap on the button does.
 */
function PickForm({ label, foodId, onFoodChange, variant, buttonLabel, onAdd }) {
  const effectiveId =
    foodId != null && FOOD_DB.some((f) => f.id === foodId) ? foodId : (FOOD_DB[0]?.id ?? null);
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
      // Re-render so the kcal/protein hint and the button's captured food
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
      <div className="r-field">
        <span className="r-field__label">{label}</span>
        <Imperative node={lb.node} />
        {food ? (
          <span className="r-field__note">
            {NUM.format(food.kcal)} kcal · {Math.round(food.proteinG)} g protein
          </span>
        ) : null}
      </div>
      <Button variant={variant} fullWidth disabled={!food} onClick={() => food && onAdd(food)}>
        {buttonLabel}
      </Button>
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
      variant="secondary"
      buttonLabel="Add ingredient"
      onAdd={(food) => onAdd({ name: food.name, kcal: food.kcal, proteinG: food.proteinG })}
    />
  );
}

/** Pick a FOOD_DB entry through the listbox; its kcal / protein come along
 *  unedited, so this path is one tap once a food is chosen. */
function ExtrasPickForm({ day, extrasState, onDone, commit }) {
  const { extrasFoodId, setExtrasFoodId } = extrasState;
  return (
    <PickForm
      label="Food"
      foodId={extrasFoodId}
      onFoodChange={setExtrasFoodId}
      variant="primary"
      buttonLabel="Log"
      onAdd={(food) => {
        onDone();
        commit(
          logExtra(day, {
            name: food.name,
            kcal: food.kcal,
            proteinG: food.proteinG,
            from: "foods",
          }),
          `${food.name} logged · ${NUM.format(food.kcal)} kcal`,
        );
      }}
    />
  );
}

/**
 * A shared quick-type form: name, kcal, protein by hand. The button stays
 * disabled until a name is typed — kcal/protein of "" sanitise to 0 at the
 * call site, a fine default for something like a black coffee. `extra` is
 * anything else the caller puts under the fields (the save-to-book toggle).
 */
function TypeForm({ label, placeholder, variant, buttonLabel, onAdd, extra }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");

  return (
    <div className="extras__form">
      <TextField
        label={label}
        placeholder={placeholder}
        maxLength={60}
        value={name}
        onChange={setName}
      />
      <div className="extras__row-fields">
        <TextField
          label="Kcal"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="0"
          value={kcal}
          onChange={setKcal}
        />
        <TextField
          label="Protein"
          unit="g"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          placeholder="0"
          value={protein}
          onChange={setProtein}
        />
      </div>
      {extra}
      <Button
        variant={variant}
        fullWidth
        disabled={!name.trim()}
        onClick={() => onAdd({ name, kcal, proteinG: protein })}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function RecipeAddTypeForm({ onAdd }) {
  return (
    <TypeForm
      label="Ingredient"
      placeholder="e.g. Honey"
      variant="secondary"
      buttonLabel="Add ingredient"
      onAdd={onAdd}
    />
  );
}

/**
 * Quick-type a one-off item by hand. "Save to the recipe book" keeps it for
 * next time; it replaces the Save button a logged row used to carry.
 */
function ExtrasTypeForm({ day, onDone, commit }) {
  const [keep, setKeep] = useState(false);
  return (
    <TypeForm
      label="Food"
      placeholder="e.g. Chocolate bar"
      variant="primary"
      buttonLabel="Log"
      extra={
        <div className="r-toggle-row">
          <span>Save to the recipe book</span>
          <Toggle label="Save to the recipe book" checked={keep} onChange={setKeep} />
        </div>
      }
      onAdd={(item) => {
        onDone();
        const next = logExtra(day, { ...item, from: "custom" });
        const logged = next.extras.at(-1);
        if (keep && logged) {
          saveRecipe({ name: logged.name, kcal: logged.kcal, proteinG: logged.proteinG });
        }
        commit(next, logged ? `${logged.name} logged · ${NUM.format(logged.kcal)} kcal` : null);
      }}
    />
  );
}

/** Tell a screen reader the one fact that changed — the new total — rather
 * than the whole re-render. Shares the day total's own wording. */
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
