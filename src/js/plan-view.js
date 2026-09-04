/**
 * plan-view.js — the Plan tab: the weekly grocery checklist, and a read-only
 * reference sheet for the plan itself.
 *
 * The checklist is the only interactive part — ticking a row commits through
 * core/grocery.js and re-renders (the list is ~20 rows, same "just re-render"
 * call as today.js). Quantities are scaled from the Phase 2 baseline to the
 * user's current phase by core/plan.js scaleGroceryQty. Everything below the
 * checklist is static reference content read straight out of plan.js.
 *
 * Copy convention: sentence case, matching the rest of the app.
 */

import { el } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { loadProfile } from "./core/profile.js";
import {
  GROCERY_LIST,
  scaleGroceryQty,
  PHASES,
  phaseById,
  activeBlocks,
  normaliseAddOns,
  rotationOptions,
  FOOD_DB,
} from "./core/plan.js";
import { planWeek, todayISO } from "./core/dates.js";
import {
  groceryKey,
  weekChecks,
  toggleGrocery,
  clearGroceryChecks,
} from "./core/grocery.js";
import { publish } from "./core/broadcast.js";

const NUM = new Intl.NumberFormat("en-US"); // 3,110

let mount;

export function renderPlan(mountEl) {
  mount = mountEl;
  render();
}

/**
 * Repaint in place. Plan holds no view state of its own, so this differs from
 * renderPlan() only in not rebinding the mount; the router calls it when a
 * sibling pane moved the data underneath it (see core/broadcast.js) — a phase
 * advance or a grocery tick both change what this screen shows.
 */
export function repaintPlan() {
  if (mount) render();
}

function render() {
  const profile = loadProfile();
  const phaseId = profile.currentPhaseId || 2;
  const phase = phaseById(phaseId);
  const week = planWeek(profile.startDate || todayISO(), todayISO());
  // The add-ons this user actually runs (the engine may have changed them), so
  // the reference "Meals" list matches what Today shows — not the bare phase.
  const addOns = normaliseAddOns(profile.addOns ?? []);

  mount.replaceChildren(
    el(
      "section",
      { class: "screen planscreen" },
      el(
        "div",
        { class: "screen-head" },
        el("h1", { class: "screen__title screen__title--lg" }, "Plan"),
        el("p", { class: "phase-banner" }, `${phase.name} · Week ${week}`),
      ),
      group("Groceries", groceryCard(phaseId)),
      group("The plan", referenceCard(phaseId, addOns)),
    ),
  );
  publish("plan");
}

/** An uppercase tracked label above a card — the shared Settings/Weight shape. */
function group(label, card) {
  return el(
    "div",
    { class: "group" },
    el("span", { class: "group__label" }, label),
    card,
  );
}

// --- groceries ----------------------------------------------------------

/**
 * The list as tickable rows, grouped by aisle, with quantities scaled to the
 * current phase. The count line and the "Clear ticks" action state facts only
 * (insight_copy_states_facts) — no "well done", no colour. The count is over
 * items the plan still names, so a renamed entry can't inflate it.
 */
function groceryCard(phaseId) {
  const checks = weekChecks();
  let total = 0;
  let done = 0;
  for (const sec of GROCERY_LIST) {
    for (const item of sec.items) {
      total += 1;
      if (checks[groceryKey(sec.section, item.name)]) done += 1;
    }
  }

  const card = el(
    "div",
    { class: "card grocery" },
    el("p", { class: "grocery__status" }, `New list each Monday · ${done} of ${total} ticked`),
    ...GROCERY_LIST.map((sec) => grocerySection(sec, phaseId, checks)),
  );

  if (done > 0) {
    card.append(
      el(
        "div",
        { class: "grocery__reset" },
        el(
          "button",
          {
            class: "btn btn--text btn--sm",
            type: "button",
            onclick: () => {
              clearGroceryChecks();
              render();
            },
          },
          "Clear ticks",
        ),
      ),
    );
  }
  return card;
}

function grocerySection(sec, phaseId, checks) {
  return el(
    "div",
    { class: "grocery__section" },
    el("p", { class: "planscreen__subhead" }, sec.section),
    el(
      "ul",
      { class: "grocery__list" },
      ...sec.items.map((item) => groceryRow(sec.section, item, phaseId, checks)),
    ),
  );
}

function groceryRow(section, item, phaseId, checks) {
  const key = groceryKey(section, item.name);
  const on = Boolean(checks[key]);
  return el(
    "li",
    {},
    el(
      "button",
      {
        class: `grocery__row${on ? " is-checked" : ""}`,
        type: "button",
        "aria-pressed": String(on),
        onclick: () => {
          toggleGrocery(key);
          render();
        },
      },
      el(
        "span",
        { class: `block-row__tick${on ? " is-done" : ""}` },
        on ? icon("check", { size: 14, stroke: 2.5 }) : null,
      ),
      el("span", { class: "grocery__label" }, groceryLine(item, phaseId)),
    ),
  );
}

/** "7.5 L Full-fat milk", "24 Eggs", "Wholemeal flour" (unmeasured staple).
 *  scaleGroceryQty already rounds to <=2dp, so String() is enough. */
function groceryLine(item, phaseId) {
  const qty = scaleGroceryQty(item, phaseId);
  if (qty == null) return item.name;
  return item.unit ? `${qty} ${item.unit} ${item.name}` : `${qty} ${item.name}`;
}

// --- the reference sheet ---------------------------------------------------

function referenceCard(phaseId, addOns) {
  return el(
    "div",
    { class: "card planref" },
    targetsBlock(phaseId),
    mealsBlock(addOns),
    foodsBlock(),
  );
}

/** The three-rung target ladder, the active phase picked out. */
function targetsBlock(phaseId) {
  return el(
    "div",
    { class: "planref__block" },
    el("p", { class: "planscreen__subhead" }, "Targets"),
    el(
      "ul",
      { class: "planref__targets" },
      ...PHASES.map((p) =>
        el(
          "li",
          { class: `planref__target${p.id === phaseId ? " is-now" : ""}` },
          el("span", { class: "planref__target-name" }, p.name),
          el(
            "span",
            { class: "planref__target-fig" },
            `${NUM.format(p.kcal)} kcal · ${p.proteinG} g`,
          ),
        ),
      ),
    ),
  );
}

/** The day's blocks in time order, with each rotation's options. */
function mealsBlock(addOns) {
  return el(
    "div",
    { class: "planref__block" },
    el("p", { class: "planscreen__subhead" }, "Meals"),
    ...activeBlocks(addOns).map((b) =>
      el(
        "div",
        { class: "planref__meal" },
        el(
          "div",
          { class: "planref__meal-head" },
          el(
            "span",
            { class: "planref__meal-name" },
            b.name,
            b.time ? el("span", { class: "planref__meal-time" }, fmtTime(b.time)) : null,
          ),
          b.rotation
            ? null
            : el(
                "span",
                { class: "planref__meal-fig" },
                `${NUM.format(b.kcal)} kcal · ${b.proteinG} g`,
              ),
        ),
        b.rotation
          ? el(
              "ul",
              { class: "planref__opts" },
              ...rotationOptions(b.rotation).map((o) =>
                el(
                  "li",
                  { class: "planref__opt" },
                  el("span", { class: "planref__opt-desc" }, o.desc),
                  el("span", { class: "planref__opt-kcal" }, NUM.format(o.kcal)),
                ),
              ),
            )
          : el("p", { class: "planref__meal-desc" }, b.desc),
      ),
    ),
  );
}

/** The off-plan food table, straight from FOOD_DB. */
function foodsBlock() {
  return el(
    "div",
    { class: "planref__block" },
    el("p", { class: "planscreen__subhead" }, "Food table"),
    el(
      "ul",
      { class: "planref__foods" },
      ...FOOD_DB.map((f) =>
        el(
          "li",
          { class: "planref__food" },
          el("span", { class: "planref__food-name" }, f.name),
          el(
            "span",
            { class: "planref__food-meta" },
            `${f.portion} · ${NUM.format(f.kcal)} kcal · ${Math.round(f.proteinG)} g`,
          ),
        ),
      ),
    ),
  );
}

// --- helpers -------------------------------------------------------------

/** "08:00" -> "8am", "13:30" -> "1:30pm" — mirrors today.js. */
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}
