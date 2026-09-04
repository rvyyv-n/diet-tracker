/**
 * today.js — the daily checklist. The screen the app exists for.
 *
 * It shows the blocks active for the viewed day's phase, in time-of-day order,
 * as big tap rows. Ticking a row commits the change to storage and re-renders;
 * the DOM here is small enough (one phone column, up to seven rows) that a full
 * re-render per interaction is simpler than patching nodes and has no cost worth
 * chasing.
 *
 * All plan maths lives in core/day.js and core/plan.js. This file is rendering
 * and event wiring only.
 *
 * Copy convention: sentence case, matching welcome.js.
 */

import { el } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { loadProfile, saveProfile, overviewMetricShown } from "./core/profile.js";
import {
  activeBlocks,
  blockById,
  phaseById,
  phaseTarget,
  rotationOptions,
  defaultPhaseForWeek,
  phaseAddOns,
  PHASES,
  ADDON_IDS,
  FOOD_DB,
} from "./core/plan.js";
import {
  newDay,
  toggleBlock,
  chooseRotation,
  blockValue,
  dayTotals,
  dayAddOns,
  dayBonus,
  addBlock,
  removeBlock,
  setAppetite,
  APPETITE_VALUES,
  intakeStatus,
  isDayEditable,
} from "./core/day.js";
import { dayExtras, addExtra, removeExtra } from "./core/extras.js";
import {
  allRecipes,
  getRecipe,
  saveRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  touchRecipe,
  recipeKey,
  recipeTotals,
} from "./core/recipes.js";
import { getDay, putDay, allDays } from "./core/days.js";
import { dateCalendar } from "./ui/date-calendar.js";
import { listbox } from "./ui/listbox.js";
import { allWeights } from "./core/weights.js";
import { weeklyWeights, weeklyGains, rollingGain, weeklyAdherence } from "./core/trend.js";
import { evaluate, applySuggestion } from "./core/adjust.js";
import { todayISO, addDays, planWeek, daysBetween } from "./core/dates.js";
import { publish } from "./core/broadcast.js";

const NUM = new Intl.NumberFormat("en-US"); // 1,890

// The appetite check labels, in tap order. Keys are APPETITE_VALUES.
const APPETITE_LABEL = { stuffed: "Stuffed", fine: "Fine", hungry: "Hungry" };

const STATUS_CLASS = {
  "on-track": "is-on-track",
  partial: "is-partial",
  low: "is-low",
};

// --- module state ----------------------------------------------------------
// `viewDate` is the day on screen — today, unless the user tapped a dot in the
// six-week strip or the backfill prompt to look at (or finish) an earlier day.
// `openPicker` is the block id whose rotation picker is expanded, or null. All
// reset on each renderToday() entry.
let mount;
let viewDate;
let openPicker = null;
let addOpen = false; // the "add a block" panel under the checklist
let extrasOpen = false; // the "log food" panel under the extras list
let extrasMode = "pick"; // "recipe" (from the book) | "pick" (FOOD_DB) | "type" (quick-type)
let extrasModeTouched = false; // has the user picked an extras tab this screen
//   visit? until they do, the panel opens on "recipe" when the book is
//   non-empty — repeating a saved meal should be one tap, not two.
let extrasFoodId = null; // the FOOD_DB id picked in "pick" mode
// The recipe editor (pass 28), open over the Recipes tab, or null. `id` null is
// a new recipe; `items` is the working ingredient list; `addMode` / `addFoodId`
// drive its own pick/type add-ingredient sub-form.
let recipeEditor = null;
let recipeEditorError = null; // a message shown under the editor after a failed save

// How many days the adherence dot strip shows — the last week at a glance, up
// near the header. Older days are reached through the calendar popover beside
// it, not by growing this strip.
const STRIP_DAYS = 7;

export function renderToday(mountEl) {
  mount = mountEl;
  viewDate = todayISO();
  openPicker = null;
  addOpen = false;
  extrasOpen = false;
  extrasModeTouched = false;
  recipeEditor = null;
  recipeEditorError = null;
  render();
}

/**
 * Repaint in place, keeping the view state renderToday() resets — the viewed
 * day, an open rotation picker, a half-filled extras form. This is what the
 * router calls when a *sibling* pane changed the data underneath this one, so
 * it must never feel like the screen was reopened. A no-op until the screen has
 * been mounted at least once.
 */
export function repaintToday() {
  if (mount) render();
}

// --- data ----------------------------------------------------------------

/**
 * The viewed day's record, or a fresh one. Rotations are seeded from the last
 * recorded day (pass 14 — sticky rotations), not the hardcoded defaults, so
 * most days need no re-picking. For a day that was never recorded, the phase is
 * the default for *that day's* plan week rather than today's — stepping back to
 * an unrecorded week-1 day should show the ramp-up blocks, not this week's.
 */
function loadViewDay(profile) {
  const stored = getDay(viewDate);
  if (stored) return stored;
  const last = allDays().at(-1);
  const today = todayISO();
  if (viewDate === today) {
    return newDay(today, profile.currentPhaseId, profile.addOns, last?.rotations);
  }
  const phaseId = defaultPhaseForWeek(planWeek(profile.startDate || viewDate, viewDate));
  return newDay(viewDate, phaseId, phaseAddOns(phaseId), last?.rotations);
}

/** Persist a changed day, then repaint. */
function commit(nextDay) {
  putDay(nextDay);
  render();
}

// --- render ------------------------------------------------------------

function render() {
  const profile = loadProfile();
  const day = loadViewDay(profile);
  const editable = isDayEditable(day, todayISO());
  const suggestion = viewDate === todayISO() ? liveSuggestion(profile) : null;

  mount.replaceChildren(
    el(
      "section",
      { class: "screen today" },
      dateHeader(profile, day, editable),
      adherenceStrip(profile, day),
      suggestion ? suggestionCard(suggestion, profile) : null,
      totalCard(day, profile),
      backfillPrompt(),
      checklist(day, editable),
      extrasSection(day, editable),
      editable ? addBlockSection(day) : null,
      editable ? appetiteSection(day) : null,
    ),
  );
  publish("today");
}

/** Jump straight back to today from any earlier day. */
function backToToday() {
  viewDate = todayISO();
  openPicker = null;
  addOpen = false;
  extrasOpen = false;
  render();
}

/**
 * The adjustment engine's current call, or null when there's nothing to act on
 * (on track / not enough data) or the same rule was applied or dismissed within
 * the last week — roughly, until the next weigh-in can show whether it helped.
 */
function liveSuggestion(profile) {
  const start = profile.startDate || todayISO();
  const series = weeklyWeights(allWeights(), start);
  const s = evaluate(
    {
      rolling: rollingGain(weeklyGains(series)),
      gains: weeklyGains(series),
      adherence: weeklyAdherence(allDays(), start),
      weeklyCount: series.length,
    },
    profile.addOns ?? [],
  );
  if (!["add-block", "remove-block", "checkup"].includes(s.kind)) return null;
  const hushed = profile.dismissedSuggestion;
  if (hushed && hushed.ruleId === s.ruleId && daysBetween(hushed.date, todayISO()) < 7) {
    return null;
  }
  return s;
}

function suggestionCard(suggestion, profile) {
  const actions = [];
  if (suggestion.kind === "add-block" || suggestion.kind === "remove-block") {
    actions.push(
      el(
        "button",
        { class: "btn btn--primary", type: "button", onclick: () => applySuggestionAndSave(suggestion, profile) },
        "Apply",
      ),
    );
  }
  actions.push(
    el(
      "button",
      { class: "btn btn--text", type: "button", onclick: () => dismissSuggestion(suggestion, profile) },
      suggestion.kind === "checkup" ? "Got it" : "Not now",
    ),
  );

  return el(
    "div",
    { class: "card suggestion" },
    el("p", { class: "suggestion__headline" }, suggestion.headline),
    el("p", { class: "suggestion__detail" }, suggestion.detail),
    el("div", { class: "suggestion__actions" }, ...actions),
  );
}

function applySuggestionAndSave(suggestion, profile) {
  const next = {
    ...applySuggestion(profile, suggestion),
    dismissedSuggestion: { ruleId: suggestion.ruleId, date: todayISO() },
  };
  saveProfile(next);
  const day = getDay(viewDate); // reflect the block change on today straight away
  if (day) putDay({ ...day, addOns: next.addOns });
  render();
}

function dismissSuggestion(suggestion, profile) {
  saveProfile({
    ...profile,
    dismissedSuggestion: { ruleId: suggestion.ruleId, date: todayISO() },
  });
  render();
}

function phaseBanner(profile, day) {
  const phase = phaseById(day.phaseId);
  // The week of the day being viewed, not always today's — the stepper and the
  // dot strip can put an earlier day on screen.
  const week = planWeek(profile.startDate || day.date, day.date);
  const weekText = day.phaseId === 1 ? `Week ${week} of 2` : `Week ${week}`;
  return el("p", { class: "phase-banner" }, `${phase.name} · ${weekText}`);
}

/**
 * The three-rung target ladder, with the viewed day's phase picked out. Keeps
 * the daily figure in context — ramp-up is meant to feel low, the pushed target
 * is meant to feel like a lot — so a number that would otherwise read as "wrong"
 * reads as "this rung".
 */
function phaseLadder(day) {
  return el(
    "p",
    { class: "phase-ladder" },
    ...PHASES.flatMap((phase, i) => {
      const rung = el(
        "span",
        { class: phase.id === day.phaseId ? "phase-ladder__now" : null },
        `${phase.name} ${NUM.format(phase.kcal)}`,
      );
      return i === 0 ? [rung] : [" · ", rung];
    }),
    " kcal",
  );
}

function dateHeader(profile, day, editable) {
  const isToday = day.date === todayISO();
  return el(
    "div",
    { class: "screen-head" },
    el(
      "div",
      { class: "today__daterow" },
      el(
        "h1",
        { class: `screen__title screen__title--lg${isToday ? "" : " screen__title--date"}` },
        isToday ? "Today" : longDate(day.date),
      ),
      isToday
        ? null
        : el(
            "button",
            { class: "btn btn--text", type: "button", onclick: backToToday },
            "Back to today",
          ),
    ),
    phaseBanner(profile, day),
    phaseLadder(day),
    editable ? null : el("span", { class: "today__closed" }, "This day is closed."),
  );
}

/**
 * A dot per day over the last week, coloured by that day's intake status, with
 * untouched days left blank. It sits just under the header as a quick "how has
 * the week gone" glance. Tapping a dot views that day; the calendar button
 * beside the label reaches any older day (still read-only). Facts only: the
 * dots reuse the intake-status scale the day total already uses, with no
 * separate "alarm" colour.
 */
function adherenceStrip(profile, viewedDay) {
  const today = todayISO();
  const start = profile.startDate || today;
  const dots = [];
  for (let i = STRIP_DAYS - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    if (date < start) continue;
    const rec = getDay(date);
    const touched = rec && dayTotals(rec).done > 0;
    dots.push({ date, status: touched ? intakeStatus(rec) : null });
  }
  if (dots.length < 2) return null;

  // The "older days" route: a compact calendar popover, capped at today, seeded
  // on the day currently in view. Picking a date just moves viewDate — the same
  // thing a dot tap does.
  const cal = dateCalendar({ value: viewedDay.date, max: today });
  cal.onChange((iso) => {
    viewDate = iso;
    openPicker = null;
    addOpen = false;
    extrasOpen = false;
    render();
  });

  return el(
    "div",
    { class: "daystrip" },
    el(
      "div",
      { class: "daystrip__head" },
      el("span", { class: "group__label" }, "7 days"),
      cal.node,
    ),
    el(
      "div",
      { class: "daystrip__row" },
      ...dots.map((d) =>
        el("button", {
          class:
            "daystrip__dot" +
            (d.status ? ` is-${d.status}` : " is-blank") +
            (d.date === viewedDay.date ? " is-viewing" : ""),
          type: "button",
          "aria-label": d.status ? longDate(d.date) : `${longDate(d.date)} — no entry`,
          "aria-current": d.date === viewedDay.date ? "date" : null,
          onclick: () => {
            viewDate = d.date;
            openPicker = null;
            addOpen = false;
            extrasOpen = false;
            render();
          },
        }),
      ),
    ),
  );
}

/**
 * The day-total card. The kcal figure and its target always show; the
 * "remaining" line and the protein line are each behind a Settings toggle
 * (pass 32 — profile.overviewMetrics), gated here so a hidden line leaves no
 * node rather than empty space.
 */
function totalCard(day, profile) {
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId);
  const status = intakeStatus(day);

  const toGo = Math.max(0, target.kcal - totals.kcal);
  const blocksLeft = Math.max(0, totals.total - totals.planDone);
  const blockWord = blocksLeft === 1 ? "block" : "blocks";

  let remaining;
  if (blocksLeft === 0 && toGo === 0) remaining = "All done.";
  else if (toGo === 0) remaining = `Target met · ${blocksLeft} ${blockWord} left`;
  else remaining = `${NUM.format(toGo)} kcal to go · ${blocksLeft} ${blockWord} left`;

  return el(
    "div",
    { class: "card daytotal" },
    el(
      "div",
      { class: "daytotal__figure" },
      el("span", { class: `daytotal__kcal ${STATUS_CLASS[status]}` }, NUM.format(totals.kcal)),
      el("span", { class: "daytotal__target" }, `/ ${NUM.format(target.kcal)} kcal`),
    ),
    overviewMetricShown(profile, "remaining")
      ? el("p", { class: "daytotal__remaining" }, remaining)
      : null,
    overviewMetricShown(profile, "protein")
      ? el(
          "p",
          { class: "daytotal__protein" },
          `Protein ${Math.round(totals.proteinG)} / ${target.proteinG} g`,
        )
      : null,
  );
}

/**
 * A quiet nudge, shown only from today's view, only when yesterday was opened
 * and left part-done. A day never touched yesterday is left alone — this catches
 * a forgotten evening block, it doesn't ask you to reconstruct a blank day.
 */
function backfillPrompt() {
  if (viewDate !== todayISO()) return null;
  const yesterday = addDays(todayISO(), -1);
  const record = getDay(yesterday);
  if (!record) return null;
  const totals = dayTotals(record);
  if (totals.planDone >= totals.total) return null;
  return el(
    "button",
    {
      class: "backfill",
      type: "button",
      onclick: () => {
        viewDate = yesterday;
        openPicker = null;
        render();
      },
    },
    `Yesterday — ${totals.planDone} of ${totals.total} blocks. Tap to finish.`,
  );
}

function checklist(day, editable) {
  const rows = [
    ...activeBlocks(dayAddOns(day)).map((block) => ({ block, bonus: false })),
    ...dayBonus(day)
      .map(blockById)
      .filter(Boolean)
      .map((block) => ({ block, bonus: true })),
  ].sort((a, b) => a.block.order - b.block.order);

  // Time-of-day cue — today only. The "now" row is the last one whose nominal
  // time has arrived; rows above it recede, rows below are still to come. Before
  // the first block's time, nothing is "now" and every row is upcoming.
  // Typography and weight only — never a red "overdue" (insight_copy_states_facts).
  const live = day.date === todayISO();
  const now = live ? nowHHMM() : null;
  let nowIdx = -1;
  if (live) {
    rows.forEach(({ block }, i) => {
      if (block.time && block.time <= now) nowIdx = i;
    });
  }

  return el(
    "ul",
    { class: "checklist" },
    ...rows.map(({ block, bonus }, i) => {
      const timeState = !live
        ? "plain"
        : i < nowIdx
          ? "past"
          : i === nowIdx
            ? "now"
            : "upcoming";
      return blockRow(day, block, editable, bonus, timeState);
    }),
  );
}

/**
 * The "add a block" affordance under the checklist: the add-ons not already on
 * the day, each with its kcal, in a recessed panel in the rotation-picker
 * register. Adding a phase default the user dropped restores it to the plan;
 * adding anything else makes it a bonus block (kcal only). See day.addBlock.
 */
function addBlockSection(day) {
  const onDay = new Set([...dayAddOns(day), ...dayBonus(day)]);
  const available = ADDON_IDS.filter((id) => !onDay.has(id))
    .map(blockById)
    .filter(Boolean);
  if (!available.length) return null;
  return el(
    "div",
    { class: "addblock" },
    el(
      "button",
      {
        class: "addblock__trigger",
        type: "button",
        onclick: () => {
          addOpen = !addOpen;
          render();
        },
      },
      el("span", { class: "addblock__icon", "aria-hidden": "true" }, addOpen ? "−" : "+"),
      addOpen ? "Close" : "Add a block",
    ),
    addOpen
      ? el(
          "div",
          { class: "rotation addblock__panel" },
          ...available.map((block) =>
            el(
              "button",
              {
                class: "rotation__opt",
                type: "button",
                onclick: () => {
                  addOpen = false;
                  commit(addBlock(day, block.id));
                },
              },
              el("span", { class: "rotation__radio", "aria-hidden": "true" }, "+"),
              el("span", { class: "rotation__opt-desc" }, block.name),
              el("span", { class: "rotation__opt-kcal" }, NUM.format(blockValue(day, block.id).kcal)),
            ),
          ),
        )
      : null,
  );
}

/**
 * Off-plan food logged against the viewed day (pass 25). Renders under the
 * checklist: a list of what's already logged, each removable, then the entry
 * affordance itself when the day is editable — same "closed panel with a +
 * trigger" register as addBlockSection, so the screen doesn't gain a second
 * visual language for "add something". Two entry paths sit behind a segmented
 * toggle: pick a FOOD_DB entry (kcal/protein come along with it) or quick-type
 * one off (name / kcal / protein by hand). Both call core/extras.js addExtra,
 * which takes the bonus semantics exactly — kcal/protein move, the adherence
 * denominator doesn't.
 */
function extrasSection(day, editable) {
  const extras = dayExtras(day);
  if (!extras.length && !editable) return null;
  // The set of name keys already in the recipe book — so an extra that's
  // already saved doesn't offer "Save" again (saveRecipe would just update it,
  // but the affordance would be noise). Built once, not per row.
  const savedKeys = editable
    ? new Set(allRecipes().map((r) => recipeKey(r.name)))
    : null;
  return el(
    "div",
    { class: "extras" },
    extras.length
      ? el(
          "ul",
          { class: "extras__list" },
          ...extras.map((extra) => extraRow(day, extra, editable, savedKeys)),
        )
      : null,
    editable ? extrasAddPanel(day) : null,
  );
}

function extraRow(day, extra, editable, savedKeys) {
  const canSave = editable && savedKeys && !savedKeys.has(recipeKey(extra.name));
  return el(
    "li",
    { class: "extras__row" },
    el("span", { class: "extras__name" }, extra.name),
    el(
      "span",
      { class: "block-row__kcal" },
      NUM.format(extra.kcal),
      el("span", { class: "block-row__unit" }, "kcal"),
    ),
    canSave
      ? el(
          "button",
          {
            // The recessed strip from the rotation Swap control — same register
            // as the other secondary row action, so the row doesn't grow a
            // third visual language.
            class: "block-row__swap extras__save",
            type: "button",
            "aria-label": `Save ${extra.name} to the recipe book`,
            onclick: (event) => {
              saveRecipe({ name: extra.name, kcal: extra.kcal, proteinG: extra.proteinG });
              // No re-render: the day didn't change. Acknowledge in place, the
              // way Settings' export button does. The next render drops the
              // button anyway (savedKeys will contain it now).
              const btn = event.currentTarget;
              btn.textContent = "Saved";
              btn.disabled = true;
            },
          },
          "Save",
        )
      : null,
    editable
      ? el(
          "button",
          {
            class: "block-row__drop",
            type: "button",
            "aria-label": `Remove ${extra.name}`,
            onclick: () => commit(removeExtra(day, extra.id)),
          },
          "×",
        )
      : null,
  );
}

/** The "+ Log food" trigger and its panel — closed by default, same register
 *  as addBlockSection's "+ Add a block". Behind the toggle: the recipe book,
 *  the FOOD_DB list, and quick-type. The Recipes tab is always present (pass
 *  28 — it's the way in to the recipe editor, even with an empty book). */
function extrasAddPanel(day) {
  const modes = ["recipe", "pick", "type"];
  // First open this visit defaults to the book when it has anything — a repeat
  // meal is the common case and should be one tap; otherwise the food list.
  if (!extrasModeTouched && allRecipes().length) extrasMode = "recipe";
  if (!modes.includes(extrasMode)) extrasMode = "pick";

  return el(
    "div",
    { class: "addblock" },
    el(
      "button",
      {
        class: "addblock__trigger",
        type: "button",
        onclick: () => {
          extrasOpen = !extrasOpen;
          render();
        },
      },
      el("span", { class: "addblock__icon", "aria-hidden": "true" }, extrasOpen ? "−" : "+"),
      extrasOpen ? "Close" : "Log food",
    ),
    extrasOpen
      ? el(
          "div",
          { class: "addblock__panel extras__panel" },
          extrasModeToggle(modes),
          extrasMode === "recipe"
            ? extrasRecipeForm(day)
            : extrasMode === "pick"
              ? extrasPickForm(day)
              : extrasTypeForm(day),
        )
      : null,
  );
}

function extrasModeToggle(modes) {
  const label = { recipe: "Recipes", pick: "From the list", type: "Type it in" };
  return el(
    "div",
    { class: "seg extras__modeseg" },
    ...modes.map((mode) =>
      el(
        "button",
        {
          class: `seg__btn${extrasMode === mode ? " is-on" : ""}`,
          type: "button",
          onclick: () => {
            if (extrasMode === mode) return;
            extrasMode = mode;
            extrasModeTouched = true;
            // Leaving the Recipes tab drops any half-finished editor.
            recipeEditor = null;
            recipeEditorError = null;
            render();
          },
        },
        label[mode],
      ),
    ),
  );
}

// --- the recipe book (Recipes tab) --------------------------------------

/** The Recipes tab: the editor when one is open (pass 28), else the insert
 *  list with a "New recipe" trigger above it. */
function extrasRecipeForm(day) {
  return recipeEditor ? recipeEditorPanel() : recipeList(day);
}

/**
 * The book as an insert list: one tap on a row logs that recipe as an extra on
 * the day and bumps its recency (touchRecipe) so the book stays ordered by
 * what's actually eaten. "Edit" opens the editor (where delete also lives, so
 * a destructive tap isn't sitting on every row). Rows reuse .extras__row so a
 * saved recipe and a logged extra read the same.
 */
function recipeList(day) {
  const recipes = allRecipes();
  return el(
    "div",
    { class: "extras__recipes" },
    el(
      "button",
      {
        class: "addblock__trigger",
        type: "button",
        onclick: () => openRecipeEditor(null),
      },
      el("span", { class: "addblock__icon", "aria-hidden": "true" }, "+"),
      "New recipe",
    ),
    ...(recipes.length
      ? recipes.map((recipe) => recipePickRow(day, recipe))
      : [el("p", { class: "extras__empty" }, "No saved recipes yet.")]),
  );
}

function recipePickRow(day, recipe) {
  return el(
    "div",
    { class: "extras__row extras__pick-row" },
    el(
      "button",
      {
        class: "extras__pick",
        type: "button",
        onclick: () => {
          extrasOpen = false;
          touchRecipe(recipe.id);
          commit(
            addExtra(day, { name: recipe.name, kcal: recipe.kcal, proteinG: recipe.proteinG }),
          );
        },
      },
      el("span", { class: "extras__name" }, recipe.name),
      el(
        "span",
        { class: "block-row__kcal" },
        NUM.format(recipe.kcal),
        el("span", { class: "block-row__unit" }, "kcal"),
      ),
    ),
    el(
      "button",
      {
        class: "block-row__swap extras__edit",
        type: "button",
        "aria-label": `Edit ${recipe.name}`,
        onclick: () => openRecipeEditor(recipe.id),
      },
      "Edit",
    ),
  );
}

function openRecipeEditor(id) {
  recipeEditorError = null;
  if (id == null) {
    recipeEditor = { id: null, name: "", items: [], addMode: "pick", addFoodId: null };
  } else {
    const recipe = getRecipe(id);
    if (!recipe) return;
    recipeEditor = {
      id: recipe.id,
      name: recipe.name,
      items: (recipe.items ?? []).map((it) => ({ ...it })),
      addMode: "pick",
      addFoodId: null,
    };
  }
  render();
}

function closeRecipeEditor() {
  recipeEditor = null;
  recipeEditorError = null;
  render();
}

function saveRecipeEditor() {
  const ed = recipeEditor;
  const result =
    ed.id == null
      ? createRecipe({ name: ed.name, items: ed.items })
      : updateRecipe(ed.id, { name: ed.name, items: ed.items });
  if (!result) {
    recipeEditorError =
      ed.id != null
        ? `Couldn't save — another recipe may already be called "${ed.name.trim()}".`
        : "Couldn't save — give it a name and at least one ingredient.";
    render();
    return;
  }
  recipeEditor = null;
  recipeEditorError = null;
  render();
}

/**
 * The recipe editor (pass 28): a name field, the working ingredient list, an
 * add-ingredient sub-form (pick from FOOD_DB or quick-type, mirroring the
 * extras entry), and the running total. Save routes to createRecipe (new) or
 * updateRecipe (existing, which also renames). Delete only shows when editing
 * an existing recipe.
 */
function recipeEditorPanel() {
  const ed = recipeEditor;
  const totals = recipeTotals(ed.items);
  const canSave = () => Boolean(ed.name.trim()) && ed.items.length > 0;

  const nameInput = el("input", {
    class: "field__input",
    type: "text",
    value: ed.name,
    placeholder: "e.g. Morning shake",
    maxlength: "60",
    oninput: () => {
      ed.name = nameInput.value;
      saveBtn.disabled = !canSave();
    },
  });

  const saveBtn = el(
    "button",
    {
      class: "btn btn--primary btn--full",
      type: "button",
      disabled: canSave() ? null : "",
      onclick: saveRecipeEditor,
    },
    ed.id == null ? "Save recipe" : "Save changes",
  );

  return el(
    "div",
    { class: "recipe-editor" },
    el(
      "div",
      { class: "field" },
      el("span", { class: "field__label" }, "Name"),
      el("div", { class: "field__control" }, nameInput),
    ),
    el(
      "div",
      { class: "recipe-editor__items" },
      ...(ed.items.length
        ? ed.items.map((item, i) => recipeItemRow(item, i))
        : [el("p", { class: "field__hint" }, "Add an ingredient below.")]),
    ),
    el(
      "p",
      { class: "recipe-editor__total" },
      `Total ${NUM.format(Math.round(totals.kcal))} kcal · ${Math.round(totals.proteinG)} g protein`,
    ),
    el(
      "div",
      { class: "recipe-editor__add" },
      recipeAddModeToggle(),
      ed.addMode === "pick" ? recipeAddPickForm() : recipeAddTypeForm(),
    ),
    recipeEditorError ? el("p", { class: "recipe-editor__error" }, recipeEditorError) : null,
    el(
      "div",
      { class: "recipe-editor__actions" },
      saveBtn,
      el("button", { class: "btn btn--text", type: "button", onclick: closeRecipeEditor }, "Cancel"),
      ed.id != null
        ? el(
            "button",
            {
              class: "btn btn--text recipe-editor__delete",
              type: "button",
              onclick: () => {
                deleteRecipe(ed.id);
                closeRecipeEditor();
              },
            },
            "Delete recipe",
          )
        : null,
    ),
  );
}

function recipeItemRow(item, index) {
  return el(
    "div",
    { class: "extras__row recipe-editor__item" },
    el("span", { class: "extras__name" }, item.name),
    el(
      "span",
      { class: "block-row__kcal" },
      NUM.format(Math.round(Number(item.kcal) || 0)),
      el("span", { class: "block-row__unit" }, "kcal"),
    ),
    el(
      "button",
      {
        class: "block-row__drop",
        type: "button",
        "aria-label": `Remove ${item.name}`,
        onclick: () => {
          recipeEditor.items = recipeEditor.items.filter((_, i) => i !== index);
          recipeEditorError = null;
          render();
        },
      },
      "×",
    ),
  );
}

function recipeAddModeToggle() {
  return el(
    "div",
    { class: "seg extras__modeseg" },
    ...[
      ["pick", "From the list"],
      ["type", "Type it in"],
    ].map(([mode, label]) =>
      el(
        "button",
        {
          class: `seg__btn${recipeEditor.addMode === mode ? " is-on" : ""}`,
          type: "button",
          onclick: () => {
            if (recipeEditor.addMode === mode) return;
            recipeEditor.addMode = mode;
            render();
          },
        },
        label,
      ),
    ),
  );
}

function addRecipeItem(item) {
  recipeEditor.items = [...recipeEditor.items, item];
  recipeEditorError = null;
  render();
}

function recipeAddPickForm() {
  const ed = recipeEditor;
  if (ed.addFoodId == null || !FOOD_DB.some((f) => f.id === ed.addFoodId)) {
    ed.addFoodId = FOOD_DB[0]?.id ?? null;
  }
  const food = FOOD_DB.find((f) => f.id === ed.addFoodId) ?? null;
  const lb = listbox({
    options: FOOD_DB.map((f) => ({ value: f.id, label: `${f.name} — ${f.portion}` })),
    value: ed.addFoodId,
    ariaLabel: "Ingredient",
    onChange: (v) => {
      ed.addFoodId = v;
      // Re-render so the kcal/protein hint and the Add button's captured food
      // follow the new pick — same as the calendar popover's onChange.
      render();
    },
  });

  return el(
    "div",
    { class: "extras__form" },
    el("div", { class: "field" }, el("span", { class: "field__label" }, "Ingredient"), lb.node),
    food
      ? el(
          "p",
          { class: "field__hint" },
          `${NUM.format(food.kcal)} kcal · ${Math.round(food.proteinG)} g protein`,
        )
      : null,
    el(
      "button",
      {
        class: "btn btn--secondary btn--full",
        type: "button",
        disabled: food ? null : "",
        onclick: () => {
          if (!food) return;
          addRecipeItem({ name: food.name, kcal: food.kcal, proteinG: food.proteinG });
        },
      },
      "Add ingredient",
    ),
  );
}

function recipeAddTypeForm() {
  const nameIn = el("input", {
    class: "field__input",
    type: "text",
    placeholder: "e.g. Honey",
    maxlength: "60",
    oninput: () => {
      addBtn.disabled = !nameIn.value.trim();
    },
  });
  const kcalIn = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "numeric",
    min: "0",
    step: "1",
    placeholder: "0",
  });
  const proteinIn = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "decimal",
    min: "0",
    step: "0.1",
    placeholder: "0",
  });
  const addBtn = el(
    "button",
    {
      class: "btn btn--secondary btn--full",
      type: "button",
      disabled: "",
      onclick: () =>
        addRecipeItem({ name: nameIn.value, kcal: kcalIn.value, proteinG: proteinIn.value }),
    },
    "Add ingredient",
  );

  return el(
    "div",
    { class: "extras__form" },
    el(
      "div",
      { class: "field" },
      el("span", { class: "field__label" }, "Ingredient"),
      el("div", { class: "field__control" }, nameIn),
    ),
    el(
      "div",
      { class: "extras__row-fields" },
      el(
        "div",
        { class: "field" },
        el("span", { class: "field__label" }, "Kcal"),
        el("div", { class: "field__control" }, kcalIn),
      ),
      el(
        "div",
        { class: "field" },
        el("span", { class: "field__label" }, "Protein (g)"),
        el("div", { class: "field__control" }, proteinIn),
      ),
    ),
    addBtn,
  );
}

/** Pick a FOOD_DB entry through the existing listbox control; its kcal /
 *  protein come along unedited, so this path is one tap once a food is
 *  chosen. */
function extrasPickForm(day) {
  if (extrasFoodId == null || !FOOD_DB.some((f) => f.id === extrasFoodId)) {
    extrasFoodId = FOOD_DB[0]?.id ?? null;
  }
  const food = FOOD_DB.find((f) => f.id === extrasFoodId) ?? null;
  const lb = listbox({
    options: FOOD_DB.map((f) => ({ value: f.id, label: `${f.name} — ${f.portion}` })),
    value: extrasFoodId,
    ariaLabel: "Food",
    onChange: (v) => {
      extrasFoodId = v;
      // Re-render so the kcal/protein hint and the Add button's captured food
      // follow the new pick — same as the calendar popover's onChange.
      render();
    },
  });

  return el(
    "div",
    { class: "extras__form" },
    el("div", { class: "field" }, el("span", { class: "field__label" }, "Food"), lb.node),
    food
      ? el(
          "p",
          { class: "field__hint" },
          `${NUM.format(food.kcal)} kcal · ${Math.round(food.proteinG)} g protein`,
        )
      : null,
    el(
      "button",
      {
        class: "btn btn--primary btn--full",
        type: "button",
        disabled: food ? null : "",
        onclick: () => {
          if (!food) return;
          extrasOpen = false;
          commit(addExtra(day, { name: food.name, kcal: food.kcal, proteinG: food.proteinG }));
        },
      },
      "Add",
    ),
  );
}

/** Quick-type a one-off item by hand: name, kcal, protein. Add stays disabled
 *  until a name is typed — kcal/protein of "" sanitise to 0 in addExtra, which
 *  is a fine default for something like a black coffee. */
function extrasTypeForm(day) {
  const nameIn = el("input", {
    class: "field__input",
    type: "text",
    placeholder: "e.g. Chocolate bar",
    maxlength: "60",
    oninput: () => {
      addBtn.disabled = !nameIn.value.trim();
    },
  });
  const kcalIn = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "numeric",
    min: "0",
    step: "1",
    placeholder: "0",
  });
  const proteinIn = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "decimal",
    min: "0",
    step: "0.1",
    placeholder: "0",
  });
  const addBtn = el(
    "button",
    {
      class: "btn btn--primary btn--full",
      type: "button",
      disabled: "",
      onclick: () => {
        extrasOpen = false;
        commit(addExtra(day, { name: nameIn.value, kcal: kcalIn.value, proteinG: proteinIn.value }));
      },
    },
    "Add",
  );

  return el(
    "div",
    { class: "extras__form" },
    el(
      "div",
      { class: "field" },
      el("span", { class: "field__label" }, "Food"),
      el("div", { class: "field__control" }, nameIn),
    ),
    el(
      "div",
      { class: "extras__row-fields" },
      el(
        "div",
        { class: "field" },
        el("span", { class: "field__label" }, "Kcal"),
        el("div", { class: "field__control" }, kcalIn),
      ),
      el(
        "div",
        { class: "field" },
        el("span", { class: "field__label" }, "Protein (g)"),
        el("div", { class: "field__control" }, proteinIn),
      ),
    ),
    addBtn,
  );
}

/**
 * The per-day appetite check: three chips under a quiet label, low on the
 * screen. Optional and never nagged — no prompt, and no red state for a day
 * left blank. Tapping the picked chip again clears it (see day.setAppetite).
 */
function appetiteSection(day) {
  const current = day.appetite;
  return el(
    "div",
    { class: "appetite" },
    el("p", { class: "group__label" }, "Appetite"),
    el(
      "div",
      { class: "appetite__chips" },
      ...APPETITE_VALUES.map((value) =>
        el(
          "button",
          {
            class: `appetite__chip${value === current ? " is-picked" : ""}`,
            type: "button",
            "aria-pressed": String(value === current),
            onclick: () => commit(setAppetite(day, value)),
          },
          APPETITE_LABEL[value],
        ),
      ),
    ),
  );
}

function blockRow(day, block, editable, bonus = false, timeState = "plain") {
  const done = Boolean(day.completed[block.id]);
  const kcal = blockValue(day, block.id).kcal;
  const pickerOpen = openPicker === block.id;
  // The cue is a today-only affordance: the nominal time sits after the block
  // name as a quiet chip. The current block used to read "now" here, but that
  // word crowded the name off a phone row — it's marked by a coral edge on the
  // row instead (block-row--now). Nothing on a past day being reviewed
  // (timeState "plain"), and nothing for a hand-added bonus block with no time.
  const timeText =
    timeState === "plain" || !block.time ? null : fmtTime(block.time);

  const main = el(
    "button",
    {
      class: "block-row__main",
      type: "button",
      disabled: editable ? null : "",
      "aria-pressed": String(done),
      onclick: editable ? () => commit(toggleBlock(day, block.id)) : null,
    },
    el(
      "span",
      { class: `block-row__tick ${done ? "is-done" : ""}` },
      done ? icon("check", { size: 14, stroke: 2.5 }) : null,
    ),
    el(
      "span",
      { class: "block-row__body" },
      el(
        "span",
        { class: "block-row__name" },
        el("span", { class: "block-row__label" }, block.name),
        timeText ? el("span", { class: "block-row__time" }, timeText) : null,
        bonus ? el("span", { class: "block-row__tag" }, "bonus") : null,
      ),
      el("span", { class: "block-row__desc" }, resolveDesc(day, block)),
    ),
    el(
      "span",
      { class: "block-row__kcal" },
      NUM.format(kcal),
      el("span", { class: "block-row__unit" }, "kcal"),
    ),
  );

  const swap =
    block.rotation && editable
      ? el(
          "button",
          {
            class: "block-row__swap",
            type: "button",
            onclick: () => {
              openPicker = pickerOpen ? null : block.id;
              render();
            },
          },
          pickerOpen ? "Close" : "Swap",
        )
      : null;

  // Add-on rows carry a drop control: for a bonus block it removes the extra,
  // for a plan add-on it's "not having this today" (shrinks the denominator —
  // the one hand-driven adherence move; the kcal target is unaffected).
  const drop =
    editable && ADDON_IDS.includes(block.id)
      ? el(
          "button",
          {
            class: "block-row__drop",
            type: "button",
            "aria-label": `Remove ${block.name}`,
            onclick: () => {
              openPicker = null;
              addOpen = false;
              commit(removeBlock(day, block.id));
            },
          },
          "×",
        )
      : null;

  return el(
    "li",
    {
      class:
        "block-row" +
        (done ? " is-done" : "") +
        (bonus ? " block-row--bonus" : "") +
        (timeState === "past" ? " block-row--past" : "") +
        (timeState === "now" ? " block-row--now" : ""),
    },
    el("div", { class: "block-row__lead" }, main, swap, drop),
    block.rotation && pickerOpen && editable ? rotationPicker(day, block) : null,
  );
}

function rotationPicker(day, block) {
  const current = day.rotations[block.rotation];
  return el(
    "div",
    { class: "rotation" },
    ...rotationOptions(block.rotation).map((opt) =>
      el(
        "button",
        {
          class: `rotation__opt${opt.id === current ? " is-picked" : ""}`,
          type: "button",
          onclick: () => {
            openPicker = null;
            commit(chooseRotation(day, block.rotation, opt.id));
          },
        },
        el("span", { class: "rotation__radio", "aria-hidden": "true" }, opt.id === current ? "●" : "○"),
        el("span", { class: "rotation__opt-desc" }, opt.desc),
        el("span", { class: "rotation__opt-kcal" }, NUM.format(opt.kcal)),
      ),
    ),
  );
}

// --- helpers ---------------------------------------------------------------

/** Local clock as "HH:MM", to compare against a block's nominal `time`. */
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "08:00" -> "8am", "13:30" -> "1:30pm" — a compact time-of-day label. */
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}

/** The description to show for a block — the chosen rotation option's, if any. */
function resolveDesc(day, block) {
  if (block.rotation) {
    const opt = rotationOptions(block.rotation).find(
      (o) => o.id === day.rotations[block.rotation],
    );
    if (opt) return opt.desc;
  }
  return block.desc;
}

/** "Thursday 28 August" for a header, from a local ISO date. */
function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
