/**
 * Welcome.jsx — the first-run profile screen, converted from welcome.js.
 *
 * It collects the handful of figures the adjustment engine needs — height,
 * weight, date of birth, target rate, start date — and stores them locally
 * via profile.js. Nothing here is committed to the repo; it lives only in
 * this browser. App.jsx shows this screen until the profile is complete,
 * then hands over to the daily checklist; it stays reachable afterwards from
 * "Edit setup".
 *
 * This screen doesn't fit the "rebuild everything from state on every
 * change" model the other converted screens use, because it never needed
 * one — the vanilla version only ever validated on submit, not on every
 * keystroke, and its four compound rows (birth date, height, weight, start
 * date) already manage their own internal state and DOM mutation (a unit
 * toggle swaps a control via `replaceChildren`, not a full-page rebuild).
 * So instead of state-driving the whole form, those four row builders are
 * ported unchanged from welcome.js and mounted once via `MountOnce` — built
 * the first time this component renders, left alone after that — and the
 * two plain fields (name, target rate) are ordinary uncontrolled inputs read
 * by ref at submit time, exactly as they were read via `.value` before.
 *
 * Two view states replace renderForm()/renderDone(): "form" and "done".
 */

import { useEffect, useRef, useState } from "react";
import { loadProfile, saveProfile, isComplete, validate, ageYears } from "./js/core/profile.js";
import { TARGET_RATE_KG_PER_WEEK } from "./js/core/plan.js";
import { WEIGHT_UNITS, formatWeight, weightRangeText } from "./js/core/units.js";
import { todayISO } from "./js/core/dates.js";
import { el } from "./js/ui/dom.js";
import { dateDropdowns } from "./js/ui/date-dropdowns.js";
import { dateCalendar } from "./js/ui/date-calendar.js";
import { weightInput } from "./js/ui/weight-input.js";

const CM_PER_INCH = 2.54;

const NAME_FIELD = { name: "name", label: "Name (optional)", type: "text", validated: false };
const TARGET_FIELD = {
  name: "targetRateKgPerWeek", label: "Target gain (kg / week)", type: "number",
  inputmode: "decimal", step: "0.05", min: "0.05", max: "1", validated: true,
  hint: `Aim for ${TARGET_RATE_KG_PER_WEEK.min}–${TARGET_RATE_KG_PER_WEEK.max} kg/week.`,
};

/** Mounts a plain DOM node, built once by the caller, into the React tree. */
function MountOnce({ node }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.replaceChildren(node);
  }, [node]);
  return <span style={{ display: "contents" }} ref={ref} />;
}

/**
 * Render the profile screen. First run opens on the empty form then a
 * summary card; once a complete profile exists it opens on the summary.
 * Pass `edit` (the "Edit profile" path) to jump straight to the form,
 * retitle it, and return through `onComplete` on save without the summary
 * hop. Pass `undoReset` (a function) to show a one-line "restore data from
 * before the reset" affordance above the form. The storage-availability
 * check lives in App.jsx, ahead of this component.
 */
export default function Welcome({ onComplete, edit = false, undoReset = null }) {
  const [data, setData] = useState(() => loadProfile());
  const [phase, setPhase] = useState(() => (isComplete(data) && !edit ? "done" : "form"));

  if (phase === "done") {
    return <DoneScreen profile={data} onComplete={onComplete} onEdit={() => setPhase("form")} />;
  }
  return (
    <FormScreen
      profile={data}
      editing={edit}
      undoReset={undoReset}
      onSaved={(next) => {
        setData(next);
        if (edit) {
          // Editing is launched from Settings, so return there without the
          // summary hop — the user has seen these numbers before.
          onComplete();
          return;
        }
        setPhase("done");
      }}
    />
  );
}

function collectSimple(field, inputRef, hintRef, next) {
  const raw = inputRef.current.value.trim();
  const value = field.type === "number" ? (raw === "" ? null : Number(raw)) : (raw || (field.name === "name" ? "" : null));
  next[field.name] = value;
  const err = field.validated ? validate(field.name, value) : null;
  hintRef.current.textContent = err || field.hint || "";
  hintRef.current.classList.toggle("field__hint--error", Boolean(err));
  inputRef.current.classList.toggle("is-invalid", Boolean(err));
  return err ? inputRef.current : null;
}

function FormScreen({ profile, editing, undoReset, onSaved }) {
  const nameInputRef = useRef(null);
  const nameHintRef = useRef(null);
  const targetInputRef = useRef(null);
  const targetHintRef = useRef(null);
  const [errorNote, setErrorNote] = useState("");

  // Built once, on this component's first render — not rebuilt on every
  // re-render the way Weight's/Today's imperative widgets are, since nothing
  // here drives repeated re-renders (there's no bump/subscribe loop on this
  // screen; it only ever renders again on its own state changes).
  const [birthRow] = useState(() => buildBirthDateRow(profile));
  const [heightRow] = useState(() => buildHeightRow(profile));
  const [weightRow] = useState(() => buildWeightRow(profile));
  const [startRow] = useState(() => buildStartDateRow(profile));

  function handleSubmit(event) {
    event.preventDefault();
    const next = { ...profile };
    let firstBad = null;

    firstBad = firstBad || collectSimple(NAME_FIELD, nameInputRef, nameHintRef, next);
    firstBad = firstBad || birthRow.collect(next);
    firstBad = firstBad || heightRow.collect(next);
    firstBad = firstBad || weightRow.collect(next);
    firstBad = firstBad || collectSimple(TARGET_FIELD, targetInputRef, targetHintRef, next);
    firstBad = firstBad || startRow.collect(next);

    if (firstBad) {
      firstBad.focus();
      return;
    }
    if (!saveProfile(next)) {
      setErrorNote("Could not save — storage may be full or blocked. Nothing was stored.");
      return;
    }
    onSaved(next);
  }

  return (
    <section className="screen">
      <div className="screen-head screen-head--setup">
        <h1 className="screen__title">{editing ? "Edit profile" : "Set up your plan"}</h1>
        <p className="screen__intro">The numbers the plan adjusts from. They stay on this device.</p>
      </div>
      {!editing && typeof undoReset === "function" ? (
        <button className="backfill" type="button" onClick={undoReset}>
          Reset by mistake? Restore the data from before it.
        </button>
      ) : null}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">{NAME_FIELD.label}</span>
          <span className="field__control">
            <input ref={nameInputRef} className="field__input" type="text" defaultValue={profile.name ?? ""} />
          </span>
          <span ref={nameHintRef} className="field__hint" />
        </label>
        <MountOnce node={birthRow.node} />
        <MountOnce node={heightRow.node} />
        <MountOnce node={weightRow.node} />
        <label className="field">
          <span className="field__label">{TARGET_FIELD.label}</span>
          <span className="field__control">
            <input
              ref={targetInputRef}
              className="field__input"
              type="number"
              inputMode={TARGET_FIELD.inputmode}
              step={TARGET_FIELD.step}
              min={TARGET_FIELD.min}
              max={TARGET_FIELD.max}
              defaultValue={profile.targetRateKgPerWeek ?? ""}
            />
          </span>
          <span ref={targetHintRef} className="field__hint">{TARGET_FIELD.hint}</span>
        </label>
        <MountOnce node={startRow.node} />
        {errorNote ? <p className="screen__intro field__hint--error">{errorNote}</p> : null}
        <button className="btn btn--primary btn--full" type="submit">
          {editing ? "Save changes" : "Start"}
        </button>
      </form>
    </section>
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

function SummaryRow({ label, value }) {
  return (
    <div className="summary__row">
      <span className="summary__key">{label}</span>
      <span className="summary__val">{value}</span>
    </div>
  );
}

/** Enter anywhere on the summary confirms it, matching the form's submit key. */
function DoneScreen({ profile, onComplete, onEdit }) {
  const age = ageYears(profile);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter") onComplete();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  return (
    <section className="screen">
      <h1 className="screen__title">You’re set up</h1>
      <p className="screen__intro">Saved to this browser only. These are the figures the plan adjusts from.</p>
      <div className="card summary">
        <SummaryRow label="Height" value={heightSummary(profile)} />
        <SummaryRow label="Start weight" value={formatWeight(profile.startWeightKg, profile.weightUnit)} />
        {age != null ? <SummaryRow label="Age" value={`${age}`} /> : null}
        <SummaryRow label="Target" value={`${profile.targetRateKgPerWeek} kg / wk`} />
        <SummaryRow label="Start date" value={profile.startDate || todayISO()} />
      </div>
      <div className="form">
        <button className="btn btn--primary btn--full" onClick={onComplete}>Start tracking</button>
        <button className="btn btn--text" onClick={onEdit}>Edit details</button>
      </div>
    </section>
  );
}

// --- the four compound rows, ported unchanged from welcome.js --------------
// Each returns { node, collect(next) }: node is a plain DOM subtree with its
// own internal state (unit toggles etc.), mounted once via MountOnce above;
// collect() reads its current value into `next` at submit time and returns
// the element to focus if invalid, or null.

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
 * Current weight: a kg / lb / st segmented toggle over the shared weightInput
 * control. Like the height row, everything downstream still sees a single
 * startWeightKg; the unit is a display choice, remembered on the profile so
 * re-editing and the Weight tab show the value the way it was entered. Stone
 * switches the control to a stone + pounds pair.
 */
function buildWeightRow(profile) {
  let unit = WEIGHT_UNITS.includes(profile.weightUnit) ? profile.weightUnit : "kg";
  let control = weightInput({ unit, kg: profile.startWeightKg });

  const holder = el("div", {}, control.node);
  const hint = el("span", { class: "field__hint" });

  const segs = WEIGHT_UNITS.map((u) => el("button", { class: "seg__btn", type: "button" }, u));
  function paintSegs() {
    segs.forEach((b, i) => {
      const on = WEIGHT_UNITS[i] === unit;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  segs.forEach((b, i) => {
    b.addEventListener("click", () => {
      const next = WEIGHT_UNITS[i];
      if (next === unit) return;
      const carried = control.getKg(); // carry the figure across the unit change
      unit = next;
      control = weightInput({ unit, kg: Number.isFinite(carried) ? carried : null });
      holder.replaceChildren(control.node);
      paintSegs();
      control.inputs[0].focus();
    });
  });
  paintSegs();

  const node = el(
    "div",
    { class: "field" },
    el(
      "div",
      { class: "field__labelrow" },
      el("span", { class: "field__label" }, "Current weight"),
      el("div", { class: "seg", role: "group", "aria-label": "Weight unit" }, ...segs),
    ),
    holder,
    hint,
  );

  function collect(next) {
    const kg = control.getKg();
    next.startWeightKg = kg == null || Number.isNaN(kg) ? null : kg;
    next.weightUnit = unit;

    const err = validate("startWeightKg", next.startWeightKg);
    hint.textContent = err ? `Enter a weight, ${weightRangeText(unit)}.` : "";
    hint.classList.toggle("field__hint--error", Boolean(err));
    control.setInvalid(Boolean(err));
    return err ? control.focusEl : null;
  }

  return { node, collect };
}

/**
 * Date of birth — day / month / year dropdowns. Stays empty until all three
 * are chosen, so the required-field check still fires on an untouched form.
 * The year range covers the ages profile.validate accepts (5–120).
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
  const cal = dateCalendar({ value: profile.startDate || todayISO() });
  const node = el(
    "div",
    { class: "field" },
    el("span", { class: "field__label" }, "Plan start date"),
    cal.node,
    el("span", { class: "field__hint" }, "Defaults to today."),
  );

  function collect(next) {
    next.startDate = cal.get() || todayISO();
    return null;
  }

  return { node, collect };
}
