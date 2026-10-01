/**
 * Weight.jsx — the weekly weigh-in and the trend it makes, built on the v3.0
 * tracking components (pass 68). From the top: the latest weight with its
 * pace, the chart (weigh-ins as dots, the four-week average once there are
 * four, the on-pace band, the sun on the latest average), the engine's
 * suggestion when it has one, the stat row, the next weigh-in with its
 * button, and the history. On desktop the screen splits into `.r-columns`:
 * the figure, chart and stats in the main column; the next weigh-in, the
 * suggestion and the history in the 340px support column.
 *
 * The suggestion only ever offers: Apply is the one path that changes the
 * plan, and nothing here calls applySuggestion() without that tap. Nothing on
 * Weight is red; off pace is gold, and no trend yet is a quiet grey.
 *
 * The date and weight fields are the vanilla `dateCalendar()` and
 * `weightInput()` widgets (they handle st/lb and the calendar popover),
 * built once per sheet or row edit and mounted with `Imperative`.
 */

import { useEffect, useRef, useState } from "react";
import { dateCalendar } from "./js/ui/date-calendar.js";
import { weightInput } from "./js/ui/weight-input.js";
import {
  formatWeight,
  weightRangeText,
  weightUnitLabel,
  kgToLb,
  KG_MIN,
  KG_MAX,
} from "./js/core/units.js";
import { loadProfile, saveProfile } from "./js/core/profile.js";
import { TARGET_RATE_KG_PER_WEEK } from "./js/core/plan.js";
import { todayISO, addDays, planWeek, daysBetween } from "./js/core/dates.js";
import { allWeights, getWeight, logWeight } from "./js/core/weights.js";
import { allDays, getDay, putDay } from "./js/core/days.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import {
  weeklyWeights,
  weeklyGains,
  rollingGain,
  weeklyAdherence,
  weeklyKcal,
} from "./js/core/trend.js";
import { evaluate, applySuggestion } from "./js/core/adjust.js";
import { NUM, Imperative } from "./components/shared.jsx";
import { Button, Icon } from "./components/core.jsx";
import { Sheet, Toast, EmptyState } from "./components/surfaces.jsx";
import { WeightChart, SuggestionCard, StatRow } from "./components/tracking.jsx";
import { useWide } from "./components/useWide.js";
import { shortDate } from "./LogFood.jsx";

// How long a toast stays before it goes on its own (as on Today).
const TOAST_MS = 4000;

// The stat row reads the last four plan weeks, the same window as the trend.
const STAT_WEEKS = 4;

export default function Weight() {
  const paneRef = useRef(null);
  const wide = useWide();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null); // the date of the history row being edited
  const [toast, setToast] = useState(null); // { message, undo }

  useEffect(() => {
    const node = paneRef.current;
    node.classList.remove("tab-switching");
    void node.offsetWidth;
    node.classList.add("tab-switching");
  }, []);

  useEffect(() => {
    publish("weight");
  });

  const [, bump] = useState(0);
  useEffect(
    () =>
      subscribe((fresh) => {
        if (!fresh.has("weight")) bump((n) => n + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const profile = loadProfile();
  const unit = profile.weightUnit || "kg";
  const start = profile.startDate || todayISO();
  const today = todayISO();

  const series = weeklyWeights(allWeights(), start);
  const rolling = rollingGain(weeklyGains(series));
  const latest = series.at(-1) ?? null;
  const pace = rolling.at(-1)?.avgKgPerWeek ?? null;
  const suggestion = liveSuggestion(profile);

  /** Save a reading and offer Undo, which puts back whatever the date held. */
  function save(date, kg) {
    const before = getWeight(date);
    // A write that didn't land gets no toast; the storage banner says why.
    if (!logWeight(date, kg)) return false;
    setToast({
      message: `Saved · ${formatWeight(kg, unit)}`,
      undo: () => {
        logWeight(date, before);
        setToast(null);
        bump((n) => n + 1);
      },
    });
    bump((n) => n + 1);
    return true;
  }

  function applySuggestionAndSave() {
    const next = {
      ...applySuggestion(profile, suggestion),
      dismissedSuggestion: { ruleId: suggestion.ruleId, date: today },
    };
    saveProfile(next);
    const rec = getDay(today); // reflect the block change on today straight away
    if (rec) putDay({ ...rec, addOns: next.addOns });
    bump((n) => n + 1);
  }

  function dismissSuggestion() {
    saveProfile({ ...profile, dismissedSuggestion: { ruleId: suggestion.ruleId, date: today } });
    bump((n) => n + 1);
  }

  const next = latest ? addDays(latest.date, 7) : today;
  const due = next <= today;
  const nextIn = daysBetween(today, next);

  return (
    <div className="pane" data-screen="weight" ref={paneRef}>
      <section className="r-weight">
        <h1 className="sr-only">Weight</h1>
        <div className="r-columns">
          <div className="r-weight__main">
            <p className="r-weight__eyebrow">
              {latest
                ? `Week ${latest.week} · ${shortDate(latest.date)}`
                : `Week ${planWeek(start, today)} · ${shortDate(today)}`}
            </p>
            <Figure latest={latest} unit={unit} />
            <PaceLine count={series.length} pace={pace} unit={unit} />
            <div className="r-weight__chart">
              <WeightChart
                weights={series.map((s) => s.kg)}
                labels={axisLabels(series)}
                bandLow={series.map((s) => series[0].kg + 0.25 * (s.week - series[0].week))}
                bandHigh={series.map((s) => series[0].kg + 0.4 * (s.week - series[0].week))}
                emptyText={
                  series.length
                    ? "The average line appears after 4 weigh-ins"
                    : "Your first weigh-in starts the chart"
                }
              />
              {series.length >= 4 ? (
                <div className="r-weight__legend" aria-hidden="true">
                  <span className="r-weight__key r-weight__key--dot">Weigh-in</span>
                  <span className="r-weight__key r-weight__key--line">4-week average</span>
                  <span className="r-weight__key r-weight__key--band">
                    On pace, {bandText(unit)}
                  </span>
                </div>
              ) : null}
            </div>
            {suggestion ? (
              <div className="r-weight__suggestion r-weight__suggestion--phone">
                <SuggestionView
                  suggestion={suggestion}
                  onApply={applySuggestionAndSave}
                  onDismiss={dismissSuggestion}
                />
              </div>
            ) : null}
            <div className="r-weight__stats">
              <StatRow stats={stats(series, start, unit, wide)} />
            </div>
          </div>
          <aside className="r-weight__support" aria-label="Weigh-ins">
            <div className="r-nextweigh">
              <div className="r-nextweigh__text">
                <div className="r-nextweigh__label">Next weigh-in</div>
                <div className="r-nextweigh__when">
                  <span className="r-nextweigh__date">{due ? "Today" : shortDate(next)}</span>
                  <span className="r-nextweigh__in">
                    {due ? shortDate(today) : `in ${nextIn} day${nextIn === 1 ? "" : "s"}`}
                  </span>
                </div>
              </div>
              <Button variant="hero" onClick={() => setSheetOpen(true)}>
                Weigh in
              </Button>
            </div>
            {suggestion ? (
              <div className="r-weight__suggestion r-weight__suggestion--wide">
                <SuggestionView
                  suggestion={suggestion}
                  onApply={applySuggestionAndSave}
                  onDismiss={dismissSuggestion}
                />
              </div>
            ) : null}
            <History
              series={series}
              unit={unit}
              editing={editing}
              setEditing={setEditing}
              save={save}
            />
          </aside>
        </div>
      </section>
      {toast ? <Toast message={toast.message} onUndo={toast.undo} /> : null}
      {sheetOpen ? (
        <WeighInSheet
          dialog={wide}
          start={start}
          unit={unit}
          latest={latest}
          onClose={() => setSheetOpen(false)}
          save={save}
        />
      ) : null}
    </div>
  );
}

// --- data ----------------------------------------------------------------

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

/**
 * The pace against the plan's band, as a word and a colour. Gaining is the
 * goal, but Weight never goes red: under or over the band is gold, on it is
 * green.
 */
function paceStatus(kgPerWeek) {
  const band = TARGET_RATE_KG_PER_WEEK;
  if (kgPerWeek < band.min) return { key: "off", word: "below pace" };
  if (kgPerWeek > band.max) return { key: "off", word: "above pace" };
  return { key: "on", word: "on pace" };
}

/** A weekly rate in the user's unit: "+0.28 kg/week", "+0.6 lb/week". */
function rateText(kgPerWeek, unit) {
  const lb = unit === "lb" || unit === "st";
  const v = lb ? kgToLb(kgPerWeek) : kgPerWeek;
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(lb ? 1 : 2)} ${lb ? "lb" : "kg"}/week`;
}

/** The band as text in the user's unit: "0.25–0.40 kg/week". */
function bandText(unit) {
  const { min, max } = TARGET_RATE_KG_PER_WEEK;
  if (unit === "lb" || unit === "st") {
    return `${kgToLb(min).toFixed(1)}–${kgToLb(max).toFixed(1)} lb/week`;
  }
  return `${min.toFixed(2)}–${max.toFixed(2)} kg/week`;
}

/** The first, middle and last weigh-in dates under the chart. */
function axisLabels(series) {
  if (!series.length) return [];
  const pick = (i) => shortDate(series[i].date, false);
  const last = series.length - 1;
  if (last === 0) return [pick(0)];
  if (last === 1) return [pick(0), "", pick(1)];
  return [pick(0), pick(Math.round(last / 2)), pick(last)];
}

/**
 * The stat row: blocks eaten and average intake over the last four plan
 * weeks, plus the gain since the first weigh-in on desktop, where the design
 * has room for a third.
 */
function stats(series, start, unit, wide) {
  const thisWeek = planWeek(start, todayISO());
  const recent = (list) => list.filter((w) => w.week > thisWeek - STAT_WEEKS);
  const adh = recent(weeklyAdherence(allDays(), start));
  const kcal = recent(weeklyKcal(allDays(), start));
  const avg = (list, key) =>
    list.length ? Math.round(list.reduce((s, w) => s + w[key], 0) / list.length) : null;
  const pct = avg(adh, "pct");
  const kc = avg(kcal, "avgKcal");
  const out = [
    { value: pct == null ? "—" : `${pct}%`, label: "blocks eaten" },
    { value: kc == null ? "—" : NUM.format(kc), label: "kcal / day avg" },
  ];
  if (wide) {
    const first = series[0];
    const last = series.at(-1);
    out.push({
      value: first && last !== first ? gainText(last.kg - first.kg, unit) : "—",
      label: first ? `since ${shortDate(first.date, false)}` : "since the first weigh-in",
    });
  }
  return out;
}

/** A change for the stat row and history: "+1.6 kg", "−0.1", in the user's unit. */
function gainText(kgDelta, unit, withUnit = true) {
  const lb = unit === "lb" || unit === "st";
  const v = lb ? kgToLb(kgDelta) : kgDelta;
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(1)}${withUnit ? ` ${lb ? "lb" : "kg"}` : ""}`;
}

// --- pieces --------------------------------------------------------------

/** Up or down in ink beside a week's change; none when it rounds to zero. */
function DeltaArrow({ kg, unit }) {
  const shown = gainText(kg, unit, false);
  if (/^.0\.0$/.test(shown)) return null;
  return <Icon name={kg > 0 ? "arrow-up" : "arrow-down"} size={12} strokeWidth={2.5} />;
}

/** The latest weight in the numeric face, or a dash before the first. */
function Figure({ latest, unit }) {
  if (!latest) {
    return (
      <div className="r-weight__figure">
        <span className="r-weight__kg is-empty">—</span>
        <span className="r-weight__unit">{weightUnitLabel(unit === "st" ? "kg" : unit)}</span>
      </div>
    );
  }
  if (unit === "st") {
    return (
      <div className="r-weight__figure">
        <span className="r-weight__kg">{formatWeight(latest.kg, "st")}</span>
      </div>
    );
  }
  return (
    <div className="r-weight__figure">
      <span className="r-weight__kg">{formatWeight(latest.kg, unit, { withUnit: false })}</span>
      <span className="r-weight__unit">{weightUnitLabel(unit)}</span>
    </div>
  );
}

/** The pace line under the figure: a dot and its words, never colour alone. */
function PaceLine({ count, pace, unit }) {
  let key = "none";
  let lead;
  let rest;
  if (count === 0) {
    lead = "No trend yet";
    rest = " · first weigh-in today";
  } else if (count < 4) {
    const left = 4 - count;
    lead = `Trend in ${left} week${left === 1 ? "" : "s"}`;
    rest = ` · ${count} of 4 weigh-ins`;
  } else {
    const status = paceStatus(pace);
    key = status.key;
    lead = rateText(pace, unit);
    rest = ` · ${status.word}`;
  }
  return (
    <p className={`r-weight__pace r-weight__pace--${key}`}>
      <span className="r-weight__pace-dot" aria-hidden="true" />
      <span>
        <b>{lead}</b>
        {rest}
      </span>
    </p>
  );
}

function SuggestionView({ suggestion, onApply, onDismiss }) {
  const checkup = suggestion.kind === "checkup";
  return (
    <SuggestionCard
      title={suggestion.headline}
      body={suggestion.detail}
      onApply={checkup ? undefined : onApply}
      onDismiss={onDismiss}
      dismissLabel={checkup ? "Got it" : "Not now"}
    />
  );
}

/** Newest first: date, change from the week before, the reading, and Edit. */
function History({ series, unit, editing, setEditing, save }) {
  const rows = [...series].reverse();
  return (
    <div className="r-history">
      <h2 className="r-history__title">History</h2>
      {rows.length ? (
        <div className="r-history__rows">
          {rows.map((w, i) => {
            const prev = rows[i + 1];
            return editing === w.date ? (
              <HistoryEdit
                key={w.date}
                entry={w}
                unit={unit}
                onCancel={() => setEditing(null)}
                onSave={(kg) => save(w.date, kg) && setEditing(null)}
              />
            ) : (
              <div key={w.date} className="r-history__row">
                <span className="r-history__date">{shortDate(w.date)}</span>
                <span className="r-history__delta">
                  {prev ? <DeltaArrow kg={w.kg - prev.kg} unit={unit} /> : null}
                  {prev ? gainText(w.kg - prev.kg, unit, false) : "start"}
                </span>
                <span className="r-history__kg">
                  {formatWeight(w.kg, unit, { withUnit: unit === "st" })}
                </span>
                <button
                  type="button"
                  className="r-history__edit"
                  aria-label={`Edit the ${shortDate(w.date)} weigh-in`}
                  onClick={() => setEditing(w.date)}
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="r-history__empty">
          <EmptyState icon="weight">No weigh-ins yet. Each one you save lands here.</EmptyState>
        </div>
      )}
    </div>
  );
}

function useWeightField(unit, kg) {
  const ref = useRef(null);
  if (!ref.current) ref.current = weightInput({ unit, kg });
  return ref.current;
}

function validKg(kg) {
  return kg != null && !Number.isNaN(kg) && kg >= KG_MIN && kg <= KG_MAX;
}

/** A history row open for editing: the reading, Cancel and Save. */
function HistoryEdit({ entry, unit, onCancel, onSave }) {
  const field = useWeightField(unit, entry.kg);
  const commit = () => {
    const kg = field.getKg();
    if (!validKg(kg)) {
      field.setInvalid(true);
      field.focusEl.focus();
      return;
    }
    onSave(kg);
  };
  useEffect(() => field.focusEl.focus(), [field]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") onCancel();
    };
    for (const i of field.inputs) i.addEventListener("keydown", onKey);
    return () => {
      for (const i of field.inputs) i.removeEventListener("keydown", onKey);
    };
  });
  return (
    <div className="r-history__editing">
      <div className="r-history__edit-line">
        <span className="r-history__date">{shortDate(entry.date)}</span>
        <span className="r-history__field">
          <Imperative node={field.node} />
          {unit === "st" ? null : <span className="r-history__unit">{weightUnitLabel(unit)}</span>}
        </span>
      </div>
      <div className="r-history__edit-actions">
        <Button variant="text" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </div>
  );
}

/**
 * The weigh-in: a date (today unless moved back; never ahead) and the reading,
 * with the change since the latest one as it is typed. Save closes it with a
 * toast; Cancel or the scrim change nothing.
 */
function WeighInSheet({ dialog, start, unit, latest, onClose, save }) {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState(null); // kg typed so far, for the change line
  const [error, setError] = useState(null);
  const field = useWeightField(unit, getWeight(today));

  const calRef = useRef(null);
  if (!calRef.current) calRef.current = dateCalendar({ value: today, max: today });
  useEffect(() => {
    calRef.current.onChange((iso) => {
      setDate(iso);
      setError(null);
    });
  }, []);

  useEffect(() => {
    const onInput = () => {
      setDraft(field.getKg());
      setError(null);
      field.setInvalid(false);
    };
    for (const i of field.inputs) i.addEventListener("input", onInput);
    field.focusEl.focus();
    return () => {
      for (const i of field.inputs) i.removeEventListener("input", onInput);
    };
  }, [field]);

  const prev = allWeights()
    .filter((w) => w.date < date)
    .at(-1);
  const change =
    validKg(draft) && prev
      ? `${gainText(draft - prev.kg, unit)} since ${shortDate(prev.date)}`
      : latest
        ? `Latest ${formatWeight(latest.kg, unit)} · ${shortDate(latest.date)}`
        : "The first reading starts the chart.";

  function submit() {
    const kg = field.getKg();
    if (!validKg(kg)) {
      setError(`Enter a weight, ${weightRangeText(unit)}.`);
      field.setInvalid(true);
      field.focusEl.focus();
      return;
    }
    if (save(date, kg)) onClose();
  }

  return (
    <Sheet
      title="Weigh-in"
      meta={`Week ${planWeek(start, date)}`}
      onClose={onClose}
      {...(dialog ? { variant: "dialog", navInset: 256 } : {})}
    >
      <p className="r-sheet__note">Morning, after the bathroom, before food or water.</p>
      <div className="r-weighin">
        <div className="r-weighin__field r-weighin__field--date">
          <span className="r-weighin__label">Date</span>
          <Imperative node={calRef.current.node} />
        </div>
        <div className={`r-weighin__field r-weighin__field--kg${error ? " is-error" : ""}`}>
          <span className="r-weighin__label">Weight</span>
          <span className="r-weighin__box">
            <Imperative node={field.node} />
            {unit === "st" ? null : (
              <span className="r-weighin__unit">{weightUnitLabel(unit)}</span>
            )}
          </span>
        </div>
      </div>
      <p
        className={`r-weighin__note${error ? " is-error" : ""}`}
        role={error ? "alert" : undefined}
      >
        {error ?? change}
      </p>
      {getWeight(date) != null && !error ? (
        <p className="r-sheet__note">
          {shortDate(date)} already has {formatWeight(getWeight(date), unit)}; Save replaces it.
        </p>
      ) : null}
      <div className="r-sheet__actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Save</Button>
      </div>
    </Sheet>
  );
}
