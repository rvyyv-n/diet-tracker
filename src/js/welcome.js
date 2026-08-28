/**
 * welcome.js — the first-run profile screen.
 *
 * It collects the handful of figures the adjustment engine needs — height,
 * weight, date of birth, target rate, start date — and stores them locally via
 * profile.js. Nothing here is committed to the repo; it lives only in this
 * browser. app.js shows this screen until the profile is complete, then hands
 * over to the daily checklist; it stays reachable afterwards from "Edit setup".
 *
 * Entry point: renderWelcome(mount, { onComplete }).
 * Copy convention: sentence case throughout (first word + proper nouns only).
 */

import {
  loadProfile,
  saveProfile,
  isComplete,
  validate,
  ageYears,
} from "./core/profile.js";
import { TARGET_RATE_KG_PER_WEEK } from "./core/plan.js";
import { todayISO } from "./core/dates.js";
import { el } from "./ui/dom.js";
import { dateDropdowns } from "./ui/date-dropdowns.js";
import { dateCalendar } from "./ui/date-calendar.js";

// Both set by renderWelcome(): the node to render into, and the callback that
// runs when the user confirms from the summary screen.
let mount;
let done = () => {};

const CM_PER_INCH = 2.54;
const today = todayISO;

// Plain-input fields, split around where the height row sits visually so that
// on-submit focus lands on the first invalid field in reading order. Date of
// birth and plan start date have their own row builders (dropdowns and a
// calendar) further down.
const FIELDS_BEFORE_HEIGHT = [
  { name: "name", label: "Name (optional)", type: "text", validated: false },
];
const FIELDS_AFTER_HEIGHT = [
  { name: "startWeightKg", label: "Current weight (kg)", type: "number", inputmode: "decimal", step: "0.1", min: "25", max: "300", validated: true },
  {
    name: "targetRateKgPerWeek", label: "Target gain (kg / week)", type: "number",
    inputmode: "decimal", step: "0.05", min: "0.05", max: "1", validated: true,
    hint: `Aim for ${TARGET_RATE_KG_PER_WEEK.min}–${TARGET_RATE_KG_PER_WEEK.max} kg/week.`,
  },
];

function readValue(field, input) {
  const raw = input.value.trim();
  if (field.type === "number") return raw === "" ? null : Number(raw);
  return raw || (field.name === "name" ? "" : null);
}

/** A plain label + control + hint row, with refs kept for validation feedback. */
function buildSimpleRow(field, profile) {
  const input = el("input", {
    class: "field__input",
    type: field.type,
    inputmode: field.inputmode,
    step: field.step,
    min: field.min,
    max: field.max,
    required: field.required,
  });
  const preset = profile[field.name];
  if (preset != null) input.value = preset;

  const hint = el("span", { class: "field__hint" }, field.hint);
  const node = el(
    "label",
    { class: "field" },
    el("span", { class: "field__label" }, field.label),
    el("span", { class: "field__control" }, input),
    hint,
  );
  return { field, input, hint, node };
}

/** Validate one simple row, write feedback, return the input if it is invalid. */
function collectSimple(row, next) {
  const value = readValue(row.field, row.input);
  next[row.field.name] = value;
  const err = row.field.validated ? validate(row.field.name, value) : null;
  row.hint.textContent = err || row.field.hint || "";
  row.hint.classList.toggle("field__hint--error", Boolean(err));
  row.input.classList.toggle("is-invalid", Boolean(err));
  return err ? row.input : null;
}

/**
 * The height row: a cm field and a ft/in pair, with a segmented unit toggle.
 * Everything downstream still sees a single heightCm; the unit is a display
 * choice, remembered so re-editing shows the value the way it was entered.
 */
function buildHeightRow(profile) {
  let unit = profile.heightUnit === "ftin" ? "ftin" : "cm";

  const cmInput = el("input", { class: "field__input", type: "number", inputmode: "numeric", min: "100", max: "250", step: "1" });
  const ftInput = el("input", { class: "field__input", type: "number", inputmode: "numeric", min: "3", max: "8", step: "1" });
  const inInput = el("input", { class: "field__input", type: "number", inputmode: "numeric", min: "0", max: "11", step: "1" });

  if (profile.heightCm != null) {
    if (unit === "ftin") setFtInFromCm(profile.heightCm);
    else cmInput.value = profile.heightCm;
  }

  function setFtInFromCm(cm) {
    const totalInches = cm / CM_PER_INCH;
    const feet = Math.floor(totalInches / 12);
    ftInput.value = String(feet);
    inInput.value = String(Math.round(totalInches - feet * 12));
  }
  function setCmFromFtIn() {
    if (ftInput.value.trim() === "") return;
    const feet = Number(ftInput.value) || 0;
    const inches = inInput.value.trim() === "" ? 0 : Number(inInput.value) || 0;
    cmInput.value = String(Math.round((feet * 12 + inches) * CM_PER_INCH));
  }

  const cmControl = el("div", { class: "field__control" }, cmInput);
  const ftinControl = el(
    "div",
    { class: "height-ftin" },
    el("div", { class: "field__control" }, ftInput),
    el("span", { class: "height-ftin__unit" }, "ft"),
    el("div", { class: "field__control" }, inInput),
    el("span", { class: "height-ftin__unit" }, "in"),
  );
  const hint = el("span", { class: "field__hint" });

  const segCm = el("button", { class: "seg__btn", type: "button" }, "cm");
  const segFt = el("button", { class: "seg__btn", type: "button" }, "ft / in");

  function applyUnit() {
    const ftin = unit === "ftin";
    cmControl.hidden = ftin;
    ftinControl.hidden = !ftin;
    segCm.classList.toggle("is-on", !ftin);
    segFt.classList.toggle("is-on", ftin);
    segCm.setAttribute("aria-pressed", String(!ftin));
    segFt.setAttribute("aria-pressed", String(ftin));
  }
  segCm.addEventListener("click", () => {
    if (unit === "cm") return;
    setCmFromFtIn();
    unit = "cm";
    applyUnit();
    cmInput.focus();
  });
  segFt.addEventListener("click", () => {
    if (unit === "ftin") return;
    if (cmInput.value.trim() !== "") setFtInFromCm(Number(cmInput.value));
    unit = "ftin";
    applyUnit();
    ftInput.focus();
  });
  applyUnit();

  const node = el(
    "div",
    { class: "field" },
    el(
      "div",
      { class: "field__labelrow" },
      el("span", { class: "field__label" }, "Height"),
      el("div", { class: "seg", role: "group", "aria-label": "Height unit" }, segCm, segFt),
    ),
    cmControl,
    ftinControl,
    hint,
  );

  function collect(next) {
    let cm = null;
    let focusEl = cmInput;
    if (unit === "cm") {
      const raw = cmInput.value.trim();
      cm = raw === "" ? null : Number(raw);
    } else {
      const ftRaw = ftInput.value.trim();
      focusEl = ftRaw === "" ? ftInput : inInput;
      if (ftRaw !== "") {
        const feet = Number(ftRaw) || 0;
        const inches = inInput.value.trim() === "" ? 0 : Number(inInput.value) || 0;
        cm = Math.round((feet * 12 + inches) * CM_PER_INCH);
      }
    }
    next.heightCm = cm;
    next.heightUnit = unit;

    const err = validate("heightCm", cm);
    hint.textContent = err || "";
    hint.classList.toggle("field__hint--error", Boolean(err));
    cmInput.classList.toggle("is-invalid", Boolean(err) && unit === "cm");
    ftInput.classList.toggle("is-invalid", Boolean(err) && unit === "ftin");
    inInput.classList.toggle("is-invalid", Boolean(err) && unit === "ftin");
    return err ? focusEl : null;
  }

  return { node, collect };
}

/**
 * Date of birth — day / month / year dropdowns. Stays empty until all three are
 * chosen, so the required-field check still fires on an untouched form. The year
 * range covers the ages profile.validate accepts (5–120).
 */
function buildBirthDateRow(profile) {
  const thisYear = new Date().getFullYear();
  const picker = dateDropdowns({
    value: profile.birthDate ?? null,
    yearFrom: thisYear - 120,
    yearTo: thisYear - 5,
  });
  const hint = el("span", { class: "field__hint" });
  const node = el(
    "div",
    { class: "field" },
    el("span", { class: "field__label" }, "Date of birth"),
    picker.node,
    hint,
  );

  function collect(next) {
    const iso = picker.get();
    next.birthDate = iso;
    const err = validate("birthDate", iso);
    hint.textContent = err || "";
    hint.classList.toggle("field__hint--error", Boolean(err));
    picker.node.classList.toggle("is-invalid", Boolean(err));
    return err ? picker.node.querySelector("button") : null;
  }

  return { node, collect };
}

/**
 * Plan start date — a calendar popover seeded with today. It always holds a
 * value, so there is nothing to validate.
 */
function buildStartDateRow(profile) {
  const cal = dateCalendar({ value: profile.startDate || today() });
  const node = el(
    "div",
    { class: "field" },
    el("span", { class: "field__label" }, "Plan start date"),
    cal.node,
    el("span", { class: "field__hint" }, "Defaults to today."),
  );

  function collect(next) {
    next.startDate = cal.get() || today();
    return null;
  }

  return { node, collect };
}

function renderForm(profile) {
  const beforeRows = FIELDS_BEFORE_HEIGHT.map((f) => buildSimpleRow(f, profile));
  const birthRow = buildBirthDateRow(profile);
  const heightRow = buildHeightRow(profile);
  const afterRows = FIELDS_AFTER_HEIGHT.map((f) => buildSimpleRow(f, profile));
  const startRow = buildStartDateRow(profile);

  const errorNote = el("p", { class: "screen__intro field__hint--error" });

  function submit(event) {
    event.preventDefault();
    const next = { ...profile };
    let firstBad = null;

    for (const row of beforeRows) firstBad = firstBad || collectSimple(row, next);
    firstBad = firstBad || birthRow.collect(next);
    firstBad = firstBad || heightRow.collect(next);
    for (const row of afterRows) firstBad = firstBad || collectSimple(row, next);
    firstBad = firstBad || startRow.collect(next);

    if (firstBad) {
      firstBad.focus();
      return;
    }

    if (!saveProfile(next)) {
      errorNote.textContent =
        "Could not save — storage may be full or blocked. Nothing was stored.";
      return;
    }
    renderDone(next);
  }

  const form = el(
    "form",
    { class: "form", onsubmit: submit, novalidate: "" },
    ...beforeRows.map((r) => r.node),
    birthRow.node,
    heightRow.node,
    ...afterRows.map((r) => r.node),
    startRow.node,
    errorNote,
    el("button", { class: "btn btn--primary btn--full", type: "submit" }, "Start"),
  );

  mount.replaceChildren(
    el(
      "section",
      { class: "screen" },
      el("h1", { class: "screen__title" }, "Set up your plan"),
      el(
        "p",
        { class: "screen__intro" },
        "The numbers the plan adjusts from. They stay on this device.",
      ),
      form,
    ),
  );
}

function summaryRow(key, value) {
  return el(
    "div",
    { class: "summary__row" },
    el("span", { class: "summary__key" }, key),
    el("span", { class: "summary__val" }, value),
  );
}

function heightSummary(profile) {
  if (profile.heightUnit === "ftin" && profile.heightCm != null) {
    const totalInches = profile.heightCm / CM_PER_INCH;
    const feet = Math.floor(totalInches / 12);
    return `${feet}′ ${Math.round(totalInches - feet * 12)}″`;
  }
  return `${profile.heightCm} cm`;
}

function renderDone(profile) {
  const age = ageYears(profile);
  mount.replaceChildren(
    el(
      "section",
      { class: "screen" },
      el("h1", { class: "screen__title" }, "You’re set up"),
      el(
        "p",
        { class: "screen__intro" },
        "Saved to this browser only. These are the figures the plan adjusts from.",
      ),
      el(
        "div",
        { class: "card summary" },
        summaryRow("Height", heightSummary(profile)),
        summaryRow("Start weight", `${profile.startWeightKg} kg`),
        age != null ? summaryRow("Age", `${age}`) : null,
        summaryRow("Target", `${profile.targetRateKgPerWeek} kg / wk`),
        summaryRow("Start date", profile.startDate || today()),
      ),
      el(
        "div",
        { class: "form" },
        el("button", { class: "btn btn--primary btn--full", onclick: () => done() }, "Start tracking"),
        el("button", { class: "btn btn--text", onclick: () => renderForm(profile) }, "Edit details"),
      ),
    ),
  );
}

/**
 * Render the profile screen into `mountEl`. When a complete profile already
 * exists we open on its summary — this is the "Edit setup" path — otherwise on
 * the empty form. `onComplete` runs when the user confirms from the summary.
 * The storage-availability check lives in app.js, ahead of this call.
 */
export function renderWelcome(mountEl, { onComplete } = {}) {
  mount = mountEl;
  done = typeof onComplete === "function" ? onComplete : () => {};
  const profile = loadProfile();
  if (isComplete(profile)) renderDone(profile);
  else renderForm(profile);
}
