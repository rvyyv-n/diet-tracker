/**
 * welcome.js — first-run screen, and the whole app for build pass 1.
 *
 * It collects the handful of figures the adjustment engine needs — height,
 * weight, date of birth, target rate, start date — and stores them locally via
 * profile.js. Nothing here is committed to the repo; it lives only in this
 * browser. The daily checklist, weight log and adjustment engine come next, and
 * read the profile saved here.
 *
 * Copy convention: sentence case throughout (first word + proper nouns only).
 */

import {
  loadProfile,
  saveProfile,
  isComplete,
  validate,
  ageYears,
} from "./core/profile.js";
import { isAvailable } from "./core/storage.js";
import { TARGET_RATE_KG_PER_WEEK } from "./core/plan.js";

const app = document.getElementById("app");
const CM_PER_INCH = 2.54;

/** Tiny DOM helper: el("div", { class: "x", onclick: fn }, child, "text"). */
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids) {
    if (kid == null) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

const today = () => new Date().toISOString().slice(0, 10);

// Fields other than height, split around where the height row sits visually so
// that on-submit focus lands on the first invalid field in reading order.
const FIELDS_BEFORE_HEIGHT = [
  { name: "name", label: "Name (optional)", type: "text", validated: false },
  { name: "birthDate", label: "Date of birth", type: "date", validated: true, required: "" },
];
const FIELDS_AFTER_HEIGHT = [
  { name: "startWeightKg", label: "Current weight (kg)", type: "number", inputmode: "decimal", step: "0.1", min: "25", max: "300", validated: true },
  {
    name: "targetRateKgPerWeek", label: "Target gain (kg / week)", type: "number",
    inputmode: "decimal", step: "0.05", min: "0.05", max: "1", validated: true,
    hint: `Aim for ${TARGET_RATE_KG_PER_WEEK.min}–${TARGET_RATE_KG_PER_WEEK.max} kg/week.`,
  },
  { name: "startDate", label: "Plan start date", type: "date", validated: false },
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
  const preset =
    field.name === "startDate" && profile.startDate == null ? today() : profile[field.name];
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

function renderForm(profile) {
  const beforeRows = FIELDS_BEFORE_HEIGHT.map((f) => buildSimpleRow(f, profile));
  const heightRow = buildHeightRow(profile);
  const afterRows = FIELDS_AFTER_HEIGHT.map((f) => buildSimpleRow(f, profile));

  const errorNote = el("p", { class: "screen__intro field__hint--error" });

  function submit(event) {
    event.preventDefault();
    const next = { ...profile };
    let firstBad = null;

    for (const row of beforeRows) firstBad = firstBad || collectSimple(row, next);
    firstBad = firstBad || heightRow.collect(next);
    for (const row of afterRows) firstBad = firstBad || collectSimple(row, next);

    if (firstBad) {
      firstBad.focus();
      return;
    }
    if (!next.startDate) next.startDate = today();

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
    heightRow.node,
    ...afterRows.map((r) => r.node),
    errorNote,
    el("button", { class: "btn btn--primary btn--full", type: "submit" }, "Start"),
  );

  app.replaceChildren(
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
  app.replaceChildren(
    el(
      "section",
      { class: "screen" },
      el("h1", { class: "screen__title" }, "You’re set up"),
      el(
        "p",
        { class: "screen__intro" },
        "Saved to this browser only. The daily checklist lands in the next build pass and will read the figures below.",
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
      el("button", { class: "btn btn--text", onclick: () => renderForm(profile) }, "Edit details"),
    ),
  );
}

function renderStorageOff() {
  app.replaceChildren(
    el(
      "section",
      { class: "screen" },
      el("h1", { class: "screen__title" }, "Storage is off"),
      el(
        "p",
        { class: "screen__intro" },
        "This app keeps everything in your browser’s local storage, and it looks disabled — a private window, or blocked for this site. Enable it and reload.",
      ),
    ),
  );
}

function boot() {
  if (!isAvailable()) {
    renderStorageOff();
    return;
  }
  const profile = loadProfile();
  if (isComplete(profile)) renderDone(profile);
  else renderForm(profile);
}

boot();
