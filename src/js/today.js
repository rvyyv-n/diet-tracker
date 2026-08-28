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
import { loadProfile } from "./core/profile.js";
import { activeBlocks, phaseById, phaseTarget, rotationOptions } from "./core/plan.js";
import {
  newDay,
  toggleBlock,
  chooseRotation,
  blockValue,
  dayTotals,
  intakeStatus,
  isDayEditable,
} from "./core/day.js";
import { getDay, putDay } from "./core/days.js";
import { todayISO, addDays, planWeek } from "./core/dates.js";

const NUM = new Intl.NumberFormat("en-US"); // 1,890

const STATUS_CLASS = {
  "on-track": "is-on-track",
  partial: "is-partial",
  low: "is-low",
};

// --- module state ----------------------------------------------------------
// `viewDate` is the day on screen — today, unless the user tapped through to
// backfill yesterday. `openPicker` is the block id whose rotation picker is
// expanded, or null. Both reset on each renderToday() entry.
let mount;
let viewDate;
let openPicker = null;

export function renderToday(mountEl) {
  mount = mountEl;
  viewDate = todayISO();
  openPicker = null;
  render();
}

// --- data ----------------------------------------------------------------

/** The viewed day's record, or a fresh one at the profile's current phase. */
function loadViewDay(profile) {
  return getDay(viewDate) ?? newDay(viewDate, profile.currentPhaseId);
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

  mount.replaceChildren(
    el(
      "section",
      { class: "screen today" },
      phaseBanner(profile, day),
      dateHeader(day, editable),
      totalCard(day),
      backfillPrompt(),
      checklist(day, editable),
      footer(),
    ),
  );
}

function phaseBanner(profile, day) {
  const phase = phaseById(day.phaseId);
  const week = planWeek(profile.startDate || todayISO(), todayISO());
  const weekText = day.phaseId === 1 ? `week ${week} of 2` : `week ${week}`;
  return el(
    "p",
    { class: "phase-banner" },
    `${phase.label} · ${weekText} · ${NUM.format(phase.kcal)} kcal target`,
  );
}

function dateHeader(day, editable) {
  const isToday = day.date === todayISO();
  return el(
    "div",
    { class: "today__daterow" },
    el("h1", { class: "screen__title" }, isToday ? "Today" : longDate(day.date)),
    isToday
      ? null
      : el(
          "button",
          {
            class: "btn btn--text",
            type: "button",
            onclick: () => {
              viewDate = todayISO();
              openPicker = null;
              render();
            },
          },
          "Back to today",
        ),
    editable ? null : el("span", { class: "today__closed" }, "This day is closed."),
  );
}

function totalCard(day) {
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId);
  const status = intakeStatus(day);

  const toGo = Math.max(0, target.kcal - totals.kcal);
  const blocksLeft = totals.total - totals.done;
  const blockWord = blocksLeft === 1 ? "block" : "blocks";

  let remaining;
  if (blocksLeft === 0 && toGo === 0) remaining = "All blocks done.";
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
  if (totals.done >= totals.total) return null;
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
    `Yesterday — ${totals.done} of ${totals.total} blocks. Tap to finish.`,
  );
}

function checklist(day, editable) {
  return el(
    "ul",
    { class: "checklist" },
    ...activeBlocks(day.phaseId).map((block) => blockRow(day, block, editable)),
  );
}

function blockRow(day, block, editable) {
  const done = Boolean(day.completed[block.id]);
  const kcal = blockValue(day, block.id).kcal;
  const pickerOpen = openPicker === block.id;

  const main = el(
    "button",
    {
      class: "block-row__main",
      type: "button",
      disabled: editable ? null : "",
      "aria-pressed": String(done),
      onclick: editable ? () => commit(toggleBlock(day, block.id)) : null,
    },
    el("span", { class: `block-row__tick ${done ? "is-done" : ""}` }, done ? "✓" : ""),
    el(
      "span",
      { class: "block-row__body" },
      el("span", { class: "block-row__name" }, block.name),
      el("span", { class: "block-row__desc" }, resolveDesc(day, block)),
    ),
    el("span", { class: "block-row__kcal" }, NUM.format(kcal)),
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

  return el(
    "li",
    {
      class:
        "block-row" +
        (done ? " is-done" : "") +
        (block.id === "B2" ? " block-row--shake" : ""),
    },
    el("div", { class: "block-row__lead" }, main, swap),
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
        el("span", { class: "rotation__opt-desc" }, opt.desc),
        el("span", { class: "rotation__opt-kcal" }, NUM.format(opt.kcal)),
      ),
    ),
  );
}

function footer() {
  return el(
    "div",
    { class: "today__footer" },
    el(
      "button",
      {
        class: "btn btn--text",
        type: "button",
        onclick: () =>
          import("./welcome.js").then((m) =>
            m.renderWelcome(mount, { onComplete: () => renderToday(mount) }),
          ),
      },
      "Edit setup",
    ),
  );
}

// --- helpers ---------------------------------------------------------------

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
