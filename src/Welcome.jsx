/**
 * Welcome.jsx — first run and the profile form, rebuilt on the v3.0 controls
 * from the first-run design frames.
 *
 * First run is three steps: the figures (Step 1), an optional Look (Step 2)
 * and a summary (Step 3). Editing the profile later from Settings is Step 1's
 * form alone, with no step header. The figures are the handful the adjustment
 * engine needs — date of birth, height, weight, target rate, start date —
 * stored locally via profile.js. Nothing here leaves this browser.
 *
 * The form is controlled React state. Height and weight each have a unit
 * toggle that carries the figure across (cm and ft/in; kg, lb and st), and
 * everything downstream still sees one heightCm and one startWeightKg. Continue
 * is never disabled: pressing it validates and puts a plain-words error under
 * each field that needs one, then moves focus to the first.
 */

import { useEffect, useState } from "react";
import { loadProfile, saveProfile, isComplete, validate, ageYears } from "./js/core/profile.js";
import { TARGET_RATE_KG_PER_WEEK, defaultPhaseForWeek, phaseById } from "./js/core/plan.js";
import {
  WEIGHT_UNITS,
  kgToLb,
  lbToKg,
  kgToStLb,
  stLbToKg,
  weightRangeText,
} from "./js/core/units.js";
import { MONTH_NAMES, daysInMonth, planWeek, todayISO } from "./js/core/dates.js";
import { setLookPref, resolveLook, LOOKS } from "./js/core/theme.js";
import {
  Button,
  Card,
  DateField,
  Eyebrow,
  FieldGroup,
  Radio,
  Segmented,
  Select,
  StepHeader,
  TextField,
  Wordmark,
} from "./components/core.jsx";
import { CalendarGrid, Sheet } from "./components/surfaces.jsx";
import { NUM } from "./components/shared.jsx";
import { useWide } from "./components/useWide.js";

const CM_PER_INCH = 2.54;

const HEIGHT_UNITS = [
  { value: "cm", label: "cm" },
  { value: "ftin", label: "ft/in" },
];
const WEIGHT_OPTIONS = WEIGHT_UNITS.map((u) => ({ value: u, label: u }));

/** Whole feet and inches for a height in cm; inches carry the rounding. */
function cmToFtIn(cm) {
  const total = Math.round(cm / CM_PER_INCH);
  return { ft: Math.floor(total / 12), inch: total % 12 };
}

/** A decimal as typed ("58.5", ".5", "58,5"), or NaN for anything else ("58..5"). */
function parseNumber(raw) {
  const text = String(raw).trim().replace(",", ".");
  return /^(\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN;
}

const trim1 = (n) => String(Math.round(n * 10) / 10);

/** "Thu 1 Oct 2026" from a local ISO date. */
function startLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short" });
  return `${weekday} ${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

/** The form's starting values from a stored profile; blank for a new one. */
function initialForm(profile) {
  const [by, bm, bd] = (profile.birthDate ?? "").split("-");
  const hasHeight = profile.heightCm != null;
  const ftin = hasHeight ? cmToFtIn(profile.heightCm) : { ft: "", inch: "" };
  const weightUnit = WEIGHT_UNITS.includes(profile.weightUnit) ? profile.weightUnit : "kg";
  const kg = profile.startWeightKg;
  const stlb = kg != null ? kgToStLb(kg) : null;
  return {
    name: profile.name ?? "",
    day: bd ? String(Number(bd)) : "",
    month: bm ? String(Number(bm)) : "",
    year: by ?? "",
    heightUnit: profile.heightUnit === "ftin" ? "ftin" : "cm",
    cm: hasHeight ? trim1(profile.heightCm) : "",
    ft: hasHeight ? String(ftin.ft) : "",
    inch: hasHeight ? String(ftin.inch) : "",
    weightUnit,
    weight: kg == null ? "" : trim1(weightUnit === "lb" ? kgToLb(kg) : kg),
    st: stlb ? String(stlb.st) : "",
    stLb: stlb ? trim1(stlb.lb) : "",
    target: isComplete(profile) ? String(profile.targetRateKgPerWeek ?? "") : "",
    startDate: profile.startDate || todayISO(),
  };
}

/**
 * The Welcome flow. First run opens on the form, then the Look, then a
 * summary; once a complete profile exists it opens on the summary. Pass `edit`
 * (the "Edit profile" path) to show the form alone, retitled, and return
 * through `onComplete` on save. Pass `undoReset` (a function) to show a
 * one-line "restore data from before the reset" affordance above the form. The
 * storage-availability check lives in App.jsx, ahead of this component.
 */
export default function Welcome({ onComplete, edit = false, undoReset = null }) {
  const [data, setData] = useState(() => loadProfile());
  const [phase, setPhase] = useState(() => (isComplete(data) && !edit ? "done" : "form"));

  let screen;
  if (phase === "done") {
    screen = <DoneScreen profile={data} onComplete={onComplete} onEdit={() => setPhase("form")} />;
  } else if (phase === "look") {
    screen = <LookScreen onDone={() => setPhase("done")} />;
  } else {
    screen = (
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
          setPhase("look");
        }}
      />
    );
  }
  return (
    <div className="r-firstrun">
      {edit ? null : (
        <div className="r-firstrun__brand">
          <Wordmark variant="nav" size={26} />
        </div>
      )}
      {screen}
    </div>
  );
}

function FormScreen({ profile, editing, undoReset, onSaved }) {
  const [form, setForm] = useState(() => initialForm(profile));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [tries, setTries] = useState(0);
  const [calendar, setCalendar] = useState(false);
  const wide = useWide();

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // After a failed Continue, focus the first field that has an error.
  useEffect(() => {
    if (tries) document.querySelector('.r-firstrun [aria-invalid="true"]')?.focus();
  }, [tries]);

  /** The height in cm from the current fields, or NaN for a bad entry, null for blank. */
  function readHeight(f) {
    if (f.heightUnit === "cm") return f.cm.trim() === "" ? null : parseNumber(f.cm);
    if (f.ft.trim() === "") return null;
    const feet = parseNumber(f.ft);
    const inches = f.inch.trim() === "" ? 0 : parseNumber(f.inch);
    return Number.isNaN(feet) || Number.isNaN(inches)
      ? NaN
      : Math.round((feet * 12 + inches) * CM_PER_INCH);
  }

  /** The weight in kg from the current fields, or NaN for a bad entry, null for blank. */
  function readWeight(f) {
    if (f.weightUnit === "st") {
      if (f.st.trim() === "") return null;
      const st = parseNumber(f.st);
      const lb = f.stLb.trim() === "" ? 0 : parseNumber(f.stLb);
      return Number.isNaN(st) || Number.isNaN(lb) ? NaN : stLbToKg(st, lb);
    }
    if (f.weight.trim() === "") return null;
    const n = parseNumber(f.weight);
    if (Number.isNaN(n)) return NaN;
    return f.weightUnit === "lb" ? lbToKg(n) : n;
  }

  function changeHeightUnit(unit) {
    if (unit === form.heightUnit) return;
    setForm((f) => {
      const cm = readHeight(f);
      if (cm == null || Number.isNaN(cm)) return { ...f, heightUnit: unit };
      if (unit === "ftin") {
        const { ft, inch } = cmToFtIn(cm);
        return { ...f, heightUnit: unit, ft: String(ft), inch: String(inch) };
      }
      return { ...f, heightUnit: unit, cm: String(cm) };
    });
  }

  function changeWeightUnit(unit) {
    if (unit === form.weightUnit) return;
    setForm((f) => {
      const kg = readWeight(f);
      if (kg == null || Number.isNaN(kg)) return { ...f, weightUnit: unit };
      if (unit === "st") {
        const { st, lb } = kgToStLb(kg);
        return { ...f, weightUnit: unit, st: String(st), stLb: trim1(lb) };
      }
      return { ...f, weightUnit: unit, weight: trim1(unit === "lb" ? kgToLb(kg) : kg) };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = { ...profile };
    const found = {};

    next.name = form.name.trim();

    const [y, m, d] = [Number(form.year), Number(form.month), Number(form.day)];
    if (!y || !m || !d) {
      found.dob = validate("birthDate", null);
    } else if (d > daysInMonth(y, m)) {
      found.dob = "That date looks wrong.";
    } else {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      found.dob = validate("birthDate", iso);
      next.birthDate = iso;
    }

    const cm = readHeight(form);
    if (cm == null) found.height = "Enter your height.";
    else if (Number.isNaN(cm)) found.height = "Enter a number, for example 170.";
    else if (validate("heightCm", cm)) {
      found.height =
        form.heightUnit === "cm"
          ? validate("heightCm", cm)
          : "Enter a height, roughly 3 ft 3 in to 8 ft 2 in.";
    }
    next.heightCm = cm == null || Number.isNaN(cm) ? null : cm;
    next.heightUnit = form.heightUnit;

    const kg = readWeight(form);
    if (kg == null) found.weight = "Enter your weight.";
    else if (Number.isNaN(kg)) found.weight = "Enter a number, for example 58.5.";
    else if (validate("startWeightKg", kg)) {
      found.weight = `Enter a weight, ${weightRangeText(form.weightUnit)}.`;
    }
    next.startWeightKg = kg == null || Number.isNaN(kg) ? null : kg;
    next.weightUnit = form.weightUnit;

    const rate = form.target.trim() === "" ? null : parseNumber(form.target);
    if (rate == null) found.target = "Enter a rate, for example 0.30.";
    else if (Number.isNaN(rate)) found.target = "Enter a number, for example 0.30.";
    else if (validate("targetRateKgPerWeek", rate)) {
      found.target = "Enter a rate above 0 and up to 1 kg per week, for example 0.30.";
    }
    next.targetRateKgPerWeek = rate == null || Number.isNaN(rate) ? null : rate;

    next.startDate = form.startDate || todayISO();

    const bad = Object.fromEntries(Object.entries(found).filter(([, v]) => v));
    setErrors(bad);
    setSaveError("");
    if (Object.keys(bad).length) {
      setTries((n) => n + 1);
      return;
    }
    if (!saveProfile(next)) {
      setSaveError("Could not save — storage may be full or blocked. Nothing was stored.");
      return;
    }
    onSaved(next);
  }

  const years = [];
  for (let y = new Date().getFullYear() - 5; y >= new Date().getFullYear() - 120; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  const days = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
  const months = MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }));

  return (
    <section className="r-firstrun__body">
      <StepHeader
        step={editing ? undefined : 1}
        title={editing ? "Edit profile" : "Set up your plan"}
        intro="Everything stays on this device."
      />
      {!editing && typeof undoReset === "function" ? (
        <button className="r-firstrun__restore" type="button" onClick={undoReset}>
          Reset by mistake? Restore the data from before it.
        </button>
      ) : null}
      <form className="r-firstrun__form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Name (optional)"
          value={form.name}
          onChange={set("name")}
          placeholder="Your name"
          autoComplete="given-name"
        />

        <FieldGroup label="Date of birth" labelId="dob-label" error={errors.dob}>
          <div className="r-firstrun__dob">
            <Select
              label="Day"
              placeholder="Day"
              value={form.day}
              onChange={set("day")}
              options={days}
              invalid={Boolean(errors.dob)}
            />
            <Select
              label="Month"
              placeholder="Month"
              value={form.month}
              onChange={set("month")}
              options={months}
              invalid={Boolean(errors.dob)}
            />
            <Select
              label="Year"
              placeholder="Year"
              value={form.year}
              onChange={set("year")}
              options={years}
              invalid={Boolean(errors.dob)}
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Height" labelId="height-label" error={errors.height}>
          <div className="r-firstrun__measure">
            {form.heightUnit === "cm" ? (
              <UnitInput
                label="Height in centimetres"
                unit="cm"
                value={form.cm}
                onChange={set("cm")}
                placeholder="e.g. 170"
                inputMode="decimal"
                invalid={Boolean(errors.height)}
              />
            ) : (
              <div className="r-firstrun__pair">
                <UnitInput
                  label="Height, feet"
                  unit="ft"
                  value={form.ft}
                  onChange={set("ft")}
                  placeholder="5"
                  inputMode="numeric"
                  invalid={Boolean(errors.height)}
                />
                <UnitInput
                  label="Height, inches"
                  unit="in"
                  value={form.inch}
                  onChange={set("inch")}
                  placeholder="7"
                  inputMode="numeric"
                />
              </div>
            )}
            <Segmented
              label="Height unit"
              options={HEIGHT_UNITS}
              value={form.heightUnit}
              onChange={changeHeightUnit}
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Current weight" labelId="weight-label" error={errors.weight}>
          <div className="r-firstrun__measure">
            {form.weightUnit === "st" ? (
              <div className="r-firstrun__pair">
                <UnitInput
                  label="Current weight, stone"
                  unit="st"
                  value={form.st}
                  onChange={set("st")}
                  placeholder="9"
                  inputMode="numeric"
                  invalid={Boolean(errors.weight)}
                />
                <UnitInput
                  label="Current weight, pounds"
                  unit="lb"
                  value={form.stLb}
                  onChange={set("stLb")}
                  placeholder="3"
                  inputMode="decimal"
                />
              </div>
            ) : (
              <UnitInput
                label={
                  form.weightUnit === "lb"
                    ? "Current weight in pounds"
                    : "Current weight in kilograms"
                }
                unit={form.weightUnit}
                value={form.weight}
                onChange={set("weight")}
                placeholder={form.weightUnit === "lb" ? "e.g. 129" : "e.g. 58.5"}
                inputMode="decimal"
                invalid={Boolean(errors.weight)}
              />
            )}
            <Segmented
              label="Weight unit"
              options={WEIGHT_OPTIONS}
              value={form.weightUnit}
              onChange={changeWeightUnit}
            />
          </div>
        </FieldGroup>

        <TextField
          label="Target gain"
          unit="kg/week"
          value={form.target}
          onChange={set("target")}
          placeholder="e.g. 0.30"
          inputMode="decimal"
          hint={`Aim for ${TARGET_RATE_KG_PER_WEEK.min} to ${TARGET_RATE_KG_PER_WEEK.max} kg/week.`}
          error={errors.target}
        />

        <FieldGroup label="Plan start date" labelId="start-label" hint="Defaults to today.">
          <DateField
            labelId="start-label"
            valueId="start-value"
            value={startLabel(form.startDate)}
            onClick={() => setCalendar(true)}
          />
        </FieldGroup>

        {saveError ? (
          <p className="r-firstrun__error" role="alert">
            {saveError}
          </p>
        ) : null}
        <div className="r-firstrun__actions">
          <Button type="submit" fullWidth>
            {editing ? "Save changes" : "Continue"}
          </Button>
        </div>
      </form>
      {calendar ? (
        <StartDateSheet
          value={form.startDate}
          dialog={wide}
          onPick={set("startDate")}
          onClose={() => setCalendar(false)}
        />
      ) : null}
    </section>
  );
}

/**
 * One TextField box without its own label, for Height and Weight: the group
 * label sits above, and a pair (ft and in, st and lb) shares it. `label` names
 * the input for assistive tech.
 */
function UnitInput({ label, unit, value, onChange, invalid, ...rest }) {
  return (
    <span className="r-field__box">
      <input
        className="r-field__input"
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      <span className="r-field__unit" aria-hidden="true">
        {unit}
      </span>
    </span>
  );
}

/** The plan start date's calendar: any day, weeks from Monday. */
function StartDateSheet({ value, dialog, onPick, onClose }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const today = todayISO();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;

  const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => {
    const n = i + 1;
    const iso = `${month}-${String(n).padStart(2, "0")}`;
    return {
      n,
      iso,
      status: iso === today ? "today" : undefined,
      selected: iso === value,
      label: startLabel(iso),
    };
  });

  const step = (delta) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <Sheet
      title=""
      label="Plan start date"
      {...(dialog ? { variant: "dialog", onClose } : { onClose })}
    >
      <CalendarGrid
        month={`${MONTH_NAMES[m - 1]} ${y}`}
        leadingBlanks={lead}
        days={days}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onPick={(n) => {
          onPick(days[n - 1].iso);
          onClose();
        }}
      />
    </Sheet>
  );
}

const LOOK_PICKS = {
  paper: { name: "Paper", note: "Clean sans, warm paper. The default." },
  reel: { name: "Reel", note: "Film grain, serif italics, a bigger sun." },
};

/**
 * Step 2, optional. Picking a Look only changes the preview; the Look applies
 * on Continue. Skip leaves the Look as it is, which is Paper on a fresh start.
 */
function LookScreen({ onDone }) {
  const [pick, setPick] = useState(() => resolveLook(loadProfile().lookPref));
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  return (
    <section className="r-firstrun__body">
      <StepHeader
        step={2}
        optional
        onSkip={onDone}
        title="Pick a Look"
        intro="Changes the type and texture, not what the app does. You can switch any time in Settings."
      />
      <div className="r-lookpick__preview" data-look={pick} data-theme={theme} aria-hidden="true">
        <div className="r-lookpick__eyebrow">
          <span>Phase 1 · Week 1</span>
          <span>Preview</span>
        </div>
        <div className="r-lookpick__total">
          <span className="r-lookpick__figure">705</span>
          <span className="r-lookpick__of">/ 2,565 kcal</span>
        </div>
        <div className="r-lookpick__horizon">
          <span className="r-lookpick__bar" />
          <span className="r-lookpick__sun" />
        </div>
        <div className="r-lookpick__due">
          <div className="r-lookpick__due-top">
            <div>
              <div className="r-lookpick__due-label">Due now · 11:00</div>
              <div className="r-lookpick__due-title">Shake</div>
            </div>
            <div className="r-lookpick__due-fig">
              <div className="r-lookpick__due-kcal">580</div>
              <div className="r-lookpick__due-prot">kcal · 22 g</div>
            </div>
          </div>
        </div>
      </div>
      <div className="r-lookpick__options" role="radiogroup" aria-label="Look">
        {LOOKS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={pick === id}
            className={`r-lookpick__option${pick === id ? " is-selected" : ""}`}
            onClick={() => setPick(id)}
          >
            <Radio selected={pick === id} size={20} />
            <span>
              <span className="r-lookpick__name">{LOOK_PICKS[id].name}</span>
              <span className="r-lookpick__note">{LOOK_PICKS[id].note}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="r-firstrun__actions">
        <Button
          fullWidth
          onClick={() => {
            setLookPref(pick);
            onDone();
          }}
        >
          Continue with {LOOK_PICKS[pick].name}
        </Button>
      </div>
    </section>
  );
}

function heightSummary(profile) {
  if (profile.heightUnit === "ftin" && profile.heightCm != null) {
    const { ft, inch } = cmToFtIn(profile.heightCm);
    return `${ft} ft ${inch} in`;
  }
  return `${profile.heightCm} cm`;
}

/** Enter anywhere on the summary confirms it, matching the form's submit key. */
function DoneScreen({ profile, onComplete, onEdit }) {
  const age = ageYears(profile);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter" && e.target === document.body) onComplete();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  const start = profile.startDate || todayISO();
  // The phase Today opens on: the stored one, or later if the start date is
  // far enough back for the ramp to be over (App.jsx does the same).
  const phase = phaseById(
    Math.max(profile.currentPhaseId ?? 1, defaultPhaseForWeek(planWeek(start, todayISO()))),
  );

  const rows = [
    ["Height", heightSummary(profile)],
    [
      "Start weight",
      profile.weightUnit === "st"
        ? `${kgToStLb(profile.startWeightKg).st} st ${trim1(kgToStLb(profile.startWeightKg).lb)} lb`
        : `${trim1(profile.weightUnit === "lb" ? kgToLb(profile.startWeightKg) : profile.startWeightKg)} ${profile.weightUnit === "lb" ? "lb" : "kg"}`,
    ],
    ...(age != null ? [["Age", `${age} years`]] : []),
    ["Target gain", `${Number(profile.targetRateKgPerWeek).toFixed(2)} kg a week`],
  ];

  return (
    <section className="r-firstrun__body">
      <StepHeader
        step={3}
        title="You’re set up"
        intro={`Your plan starts on ${startLabel(start)}.`}
      />
      <Card className="r-firstrun__target" padding="18px">
        <Eyebrow trailing={<span>{phase.when}</span>}>
          Phase {phase.id} · {phase.name}
        </Eyebrow>
        <p className="r-firstrun__kcal">
          <span className="r-firstrun__figure">{NUM.format(phase.kcal)}</span>
          <span className="r-firstrun__per">kcal a day</span>
        </p>
        <p className="r-firstrun__protein">{phase.proteinG} g protein a day</p>
      </Card>
      <div className="r-firstrun__details">
        <div className="r-firstrun__details-head">
          <h2 className="r-firstrun__details-title">Your details</h2>
          <button type="button" className="r-firstrun__edit" onClick={onEdit}>
            Edit
          </button>
        </div>
        <dl className="r-summary">
          {rows.map(([label, value]) => (
            <div key={label} className="r-summary__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="r-firstrun__actions">
        <Button fullWidth onClick={onComplete}>
          Start tracking
        </Button>
      </div>
    </section>
  );
}
