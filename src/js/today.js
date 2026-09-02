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
import { loadProfile, saveProfile } from "./core/profile.js";
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
import { getDay, putDay, allDays } from "./core/days.js";
import { dateCalendar } from "./ui/date-calendar.js";
import { allWeights } from "./core/weights.js";
import { weeklyWeights, weeklyGains, rollingGain, weeklyAdherence } from "./core/trend.js";
import { evaluate, applySuggestion } from "./core/adjust.js";
import { todayISO, addDays, planWeek, daysBetween } from "./core/dates.js";

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

// How many days the adherence dot strip shows — the last week at a glance, up
// near the header. Older days are reached through the calendar popover beside
// it, not by growing this strip.
const STRIP_DAYS = 7;

export function renderToday(mountEl) {
  mount = mountEl;
  viewDate = todayISO();
  openPicker = null;
  addOpen = false;
  render();
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
      totalCard(day),
      backfillPrompt(),
      checklist(day, editable),
      editable ? addBlockSection(day) : null,
      editable ? appetiteSection(day) : null,
    ),
  );
}

/** Jump straight back to today from any earlier day. */
function backToToday() {
  viewDate = todayISO();
  openPicker = null;
  addOpen = false;
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
            render();
          },
        }),
      ),
    ),
  );
}

function totalCard(day) {
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
    el("p", { class: "daytotal__remaining" }, remaining),
    el(
      "p",
      { class: "daytotal__protein" },
      `Protein ${Math.round(totals.proteinG)} / ${target.proteinG} g`,
    ),
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
