/**
 * Weight.jsx — the Weight tab, converted from weight.js (pass 45's second
 * screen). The weekly weigh-in, the trend it produces, and a short history.
 *
 * The entry card and the history rows lean on two self-contained vanilla
 * widgets — `dateCalendar()` and `weightInput()` — that build their own DOM,
 * hold their own popover/focus state, and hand back an imperative API
 * (`.node`, `.onChange`, `.getKg()`, `.setInvalid()`). Rewriting those in JSX
 * wasn't worth it for this pass: they're small, correct, and used nowhere
 * else that would benefit from a React version. Instead they're rebuilt
 * fresh on every render — the same full-rebuild model the vanilla screen
 * always used — and dropped into the tree with `Imperative`, a one-line
 * adapter that mounts a plain DOM node inside a `display: contents` host.
 * Everything else here (stats, review, chart, group labels) is plain JSX.
 */

import { useEffect, useRef, useState } from "react";
import { el, emptyState } from "./js/ui/dom.js";
import { icon, iconSvg } from "./js/ui/icons.js";
import { dateCalendar } from "./js/ui/date-calendar.js";
import { weightInput } from "./js/ui/weight-input.js";
import { formatWeight, formatWeightDelta, weightRangeText } from "./js/core/units.js";
import { loadProfile } from "./js/core/profile.js";
import { TARGET_RATE_KG_PER_WEEK, blockById } from "./js/core/plan.js";
import { todayISO, humanDate, planWeek } from "./js/core/dates.js";
import { allWeights, getWeight, logWeight } from "./js/core/weights.js";
import { allDays } from "./js/core/days.js";
import { topLoggedRecipes } from "./js/core/recipes.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import {
  weeklyWeights,
  weeklyGains,
  rollingGain,
  weeklyAdherence,
  weeklyKcal,
  mostSkippedBlock,
} from "./js/core/trend.js";

const NUM = new Intl.NumberFormat("en-US"); // 2,565

/** Same dual-mode design as App.jsx's / Settings.jsx's `Icon` — see either. */
function Icon({ name, size, stroke, className }) {
  const html = { __html: iconSvg(name, { size, stroke }) };
  if (className) return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={html} />;
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={html} />;
}

function GroupLabel({ icon: glyph, children }) {
  return (
    <span className="group__label">
      {glyph ? <Icon name={glyph} size={14} className="group__label-icon" /> : null}
      {children}
    </span>
  );
}

function Group({ label, icon: glyph, children }) {
  return (
    <div className="group">
      <GroupLabel icon={glyph}>{label}</GroupLabel>
      {children}
    </div>
  );
}

/** Mounts a plain DOM node (rebuilt fresh every render) into the React tree. */
function Imperative({ node }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.replaceChildren(node);
  });
  return <span style={{ display: "contents" }} ref={ref} />;
}

export default function Weight() {
  const paneRef = useRef(null);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [editing, setEditing] = useState(null); // ISO date of the history row being edited, or null
  const [justSaved, setJustSaved] = useState(false); // shows the transient "Saved" badge for ~2s

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
  useEffect(() => subscribe((fresh) => {
    if (!fresh.has("weight")) bump((n) => n + 1);
  }), []);

  const profile = loadProfile();
  const unit = profile.weightUnit || "kg";
  const start = profile.startDate || todayISO();

  const series = weeklyWeights(allWeights(), start);
  const rolling = rollingGain(weeklyGains(series));
  const adherence = weeklyAdherence(allDays(), start);

  const latest = series.at(-1) ?? null;
  const latestGain = rolling.at(-1)?.avgKgPerWeek ?? null;
  const thisWeek = planWeek(start, todayISO());
  const thisWeekAdherence = adherence.find((a) => a.week === thisWeek)?.pct ?? null;

  const count = series.length;
  const subtitle =
    `Week ${thisWeek}` + (count ? ` · ${count} weigh-in${count === 1 ? "" : "s"}` : "");

  const entryNode = entryCard({ entryDate, setEntryDate, justSaved, setJustSaved, unit });
  const historyNode = historyCard({ series, editing, setEditing, unit });

  return (
    <div className="pane" data-screen="weight" ref={paneRef}>
      <section className="screen weight weight--v2">
        <div className="screen-head">
          <h1 className="screen__title screen__title--lg">Weight</h1>
          <p className="phase-banner">{subtitle}</p>
        </div>
        <Imperative node={entryNode} />
        <StatsCard latest={latest} latestGain={latestGain} adherencePct={thisWeekAdherence} unit={unit} />
        <Group label="Weekly review" icon="square-check-big">
          <ReviewCard series={series} rolling={rolling} start={start} unit={unit} />
        </Group>
        <Group label="Trend" icon="trending-up">
          <ChartCard series={series} />
        </Group>
        <Group label="History" icon="calendar-days">
          <Imperative node={historyNode} />
        </Group>
      </section>
    </div>
  );
}

/**
 * The intake-status class for a weekly gain, against the plan's target rate.
 * Gaining is the goal here, so the inversion in tokens.css applies: *under*
 * the band is the failure state and the one that reads red. Over the band is
 * not a failure, only off-pace, so it takes the partial amber.
 */
function paceClass(kgPerWeek) {
  if (kgPerWeek == null) return "";
  const band = TARGET_RATE_KG_PER_WEEK;
  if (kgPerWeek < band.min) return "is-low";
  if (kgPerWeek > band.max) return "is-partial";
  return "is-on-track";
}

/**
 * Adherence as a status. The thresholds are the same ones the day strip reads
 * by: a week where most of the plan was eaten is on track, a thin week is low.
 */
function adherenceClass(pct) {
  if (pct == null) return "";
  if (pct >= 80) return "is-on-track";
  if (pct >= 55) return "is-partial";
  return "is-low";
}

function StatsCard({ latest, latestGain, adherencePct, unit }) {
  const gainClass = paceClass(latestGain);
  return (
    <div className="card summary">
      <StatRow k="Latest" v={latest ? formatWeight(latest.kg, unit) : "—"} />
      <StatRow
        k="4-week gain"
        v={latestGain == null ? "—" : <span className={gainClass}>{latestGain.toFixed(2)} kg/wk</span>}
      />
      <StatRow
        k="This week's adherence"
        v={adherencePct == null ? "—" : <span className={adherenceClass(adherencePct)}>{adherencePct}%</span>}
      />
    </div>
  );
}

function StatRow({ k, v }) {
  return (
    <div className="summary__row">
      <span className="summary__key">{k}</span>
      <span className="summary__val">{v}</span>
    </div>
  );
}

/**
 * A read of the last *completed* plan week: average intake, adherence, that
 * week's weigh-in and its change from the week before, and whether the
 * 4-week rolling pace sat in the 0.25–0.4 kg/wk band. All of it is already
 * computed in trend.js and shown nowhere else. Reporting only — the
 * adjustment engine keeps its own suggestion card on Today, and the two must
 * not argue.
 *
 * Two muted lines beneath add the most-skipped block across all recorded
 * days and, once there's a repeat, the most-logged recipe from the book. All
 * are descriptive per insight_copy_states_facts: no exhortation, no red.
 */
function ReviewCard({ series, rolling, start, unit }) {
  const thisWeek = planWeek(start, todayISO());
  const kcalSeries = weeklyKcal(allDays(), start);
  const adhSeries = weeklyAdherence(allDays(), start);
  const wk = kcalSeries.filter((k) => k.week < thisWeek).at(-1)?.week ?? null;

  if (wk == null) {
    return (
      <div className="card">
        <p className="screen__intro">Your first full plan week will show its review here.</p>
      </div>
    );
  }

  const avgKcal = kcalSeries.find((k) => k.week === wk)?.avgKcal ?? null;
  const pct = adhSeries.find((a) => a.week === wk)?.pct ?? null;
  const wkWeight = series.find((s) => s.week === wk) ?? null;
  const prevWeight = series.filter((s) => s.week < wk).at(-1) ?? null;
  const kgDelta = wkWeight && prevWeight ? wkWeight.kg - prevWeight.kg : null;
  const roll = rolling.find((r) => r.week === wk)?.avgKgPerWeek ?? null;

  return (
    <div className="card summary">
      <StatRow k="Week" v={`${wk}`} />
      <StatRow k="Average intake" v={avgKcal == null ? "—" : `${NUM.format(avgKcal)} kcal/day`} />
      <StatRow k="Adherence" v={pct == null ? "—" : <span className={adherenceClass(pct)}>{pct}%</span>} />
      <StatRow
        k="Weigh-in"
        v={
          wkWeight == null ? (
            "—"
          ) : (
            <span>
              {formatWeight(wkWeight.kg, unit)}
              {kgDelta == null ? null : <WeighInDelta kgDelta={kgDelta} unit={unit} />}
            </span>
          )
        }
      />
      <StatRow
        k="4-week pace"
        v={roll == null ? "—" : <span className={paceClass(roll)}>{roll.toFixed(2)} kg/wk</span>}
      />
      <SkipNote />
      <LoggedNote />
    </div>
  );
}

/**
 * The week-over-week change, coloured by the same inversion the rest of the
 * screen uses: gaining is the goal, so a loss is the low state.
 *
 * The class is decided from the *formatted* figure, not the raw kg. A delta
 * of -0.001 kg formats as "+0.00 kg" at the display precision, and colouring
 * that red reads as a rendering fault rather than a flat week. Anything that
 * rounds away to zero stays muted, which is the honest answer: nothing moved.
 */
function WeighInDelta({ kgDelta, unit }) {
  const text = formatWeightDelta(kgDelta, unit);
  const moved = /[1-9]/.test(text);
  const cls = !moved ? "" : kgDelta > 0 ? "is-on-track" : "is-low";
  return <span className={`review__delta${cls ? " " + cls : ""}`}> ({text})</span>;
}

/** The block skipped most across every recorded day — a fact, not a nag. */
function SkipNote() {
  const worst = mostSkippedBlock(allDays());
  if (!worst) return null;
  const name = blockById(worst.blockId)?.name ?? worst.blockId;
  return (
    <p className="review__note">
      <Icon name="square-check-big" size={14} className="review__note-icon" />
      {`Most often skipped: ${name} — ${worst.missed} of ${worst.of} days it was on the plan.`}
    </p>
  );
}

/**
 * The recipe logged most from the book (pass 29). All-time, not week-scoped
 * — the book keeps only a running `useCount`. Nothing until a recipe has
 * been used at least twice, so it stays quiet for a brand-new book. A tie at
 * the top names both. A fact, like SkipNote — never "you always reach for X".
 */
function LoggedNote() {
  const ranked = topLoggedRecipes(2);
  if (!ranked.length) return null;
  const top = ranked[0].useCount;
  const names = ranked.filter((r) => r.useCount === top).map((r) => r.name);
  const list =
    names.length <= 2
      ? names.join(" and ")
      : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
  return (
    <p className="review__note">
      <Icon name="utensils" size={14} className="review__note-icon" />
      {`Most logged: ${list} — ${top} time${top === 1 ? "" : "s"}.`}
    </p>
  );
}

/**
 * A weekly-weight line against the target band. The band is a *rate*
 * (0.25–0.4 kg/week), so from the first reading it opens into a cone — being
 * inside it means the gain is on pace. Plain inline SVG, no library.
 */
function ChartCard({ series }) {
  if (series.length < 2) {
    return (
      <div className="card weight__chart">
        <p className="screen__intro">Two weigh-ins will draw the trend.</p>
      </div>
    );
  }

  const W = 320;
  const H = 168;
  const padL = 12;
  const padR = 12;
  const padT = 12;
  const padB = 22;

  const first = series[0];
  const n = series.length;
  const xs = series.map((_, i) => padL + (i * (W - padL - padR)) / (n - 1));
  const weekDelta = (s) => s.week - first.week;

  const kgs = series.map((s) => s.kg);
  const dLast = weekDelta(series[n - 1]);
  const lo = Math.min(...kgs, first.kg, first.kg + 0.25 * dLast);
  const hi = Math.max(...kgs, first.kg + 0.4 * dLast);
  const margin = (hi - lo) * 0.12 || 0.5;
  const yMin = lo - margin;
  const yMax = hi + margin;
  const y = (kg) => padT + ((yMax - kg) * (H - padT - padB)) / (yMax - yMin);

  const at = (i, y_) => `${xs[i].toFixed(1)},${y_.toFixed(1)}`;
  const lower = series.map((s, i) => at(i, y(first.kg + 0.25 * weekDelta(s))));
  const upper = series.map((s, i) => at(i, y(first.kg + 0.4 * weekDelta(s)))).reverse();
  const cone = [...lower, ...upper].join(" ");
  const line = series.map((s, i) => at(i, y(s.kg))).join(" ");
  const dots = series
    .map((s, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${y(s.kg).toFixed(1)}" r="3" class="wc-dot"/>`)
    .join("");
  const labels = series
    .map((s, i) => `<text x="${xs[i].toFixed(1)}" y="${H - 6}" class="wc-label">${s.week}</text>`)
    .join("");

  const svg =
    `<svg viewBox="0 0 ${W} ${H}" class="wc" role="img" ` +
    `aria-label="Weekly weight against the 0.25 to 0.4 kg per week target band">` +
    `<polygon points="${cone}" class="wc-cone"/>` +
    `<polyline points="${line}" class="wc-line"/>${dots}` +
    `<line x1="${padL}" y1="${(H - padB).toFixed(1)}" x2="${W - padR}" y2="${(H - padB).toFixed(1)}" class="wc-axis"/>` +
    `${labels}</svg>`;

  return (
    <div className="card weight__chart">
      <div className="weight__chart-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="weight__chart-key">
        Line: your weekly weight. Shaded: on-pace for 0.25–0.4 kg/week.
      </p>
    </div>
  );
}

/** Vanilla-built (see the file header) — the calendar and weight-input widgets. */
function entryCard({ entryDate, setEntryDate, justSaved, setJustSaved, unit }) {
  const today = todayISO();
  const date = entryDate > today ? today : entryDate;
  const existing = getWeight(date);
  const isToday = date === today;

  const cal = dateCalendar({ value: date, max: today });
  cal.onChange((iso) => setEntryDate(iso));

  const field = weightInput({ unit, kg: existing });

  let restingHint;
  if (existing != null) restingHint = `Logged for ${humanDate(date)}.`;
  else if (isToday)
    restingHint = "Same day each week — morning, after the bathroom, before food or water.";
  else restingHint = `Backdating to ${humanDate(date)}.`;
  const hint = el("span", { class: "field__hint" }, restingHint);

  const ack = justSaved ? el("span", { class: "ack" }, "Saved") : null;
  const save = el("button", { class: "btn btn--primary", type: "button" }, "Save");
  save.addEventListener("click", () => {
    const kg = field.getKg();
    if (kg == null || Number.isNaN(kg) || kg < 25 || kg > 300) {
      hint.textContent = `Enter a weight, ${weightRangeText(unit)}.`;
      hint.classList.add("field__hint--error");
      field.setInvalid(true);
      return;
    }
    logWeight(date, kg);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  });

  return el(
    "div",
    { class: "card weight__entry" },
    el(
      "div",
      { class: "field weight__daterow" },
      el("span", { class: "field__label" }, "Weigh-in date"),
      cal.node,
    ),
    el("div", { class: "field" }, field.node, hint),
    el("div", { class: "weight__save" }, save, ack),
  );
}

function historyCard({ series, editing, setEditing, unit }) {
  if (!series.length) {
    return emptyState("scale", "No weigh-ins yet. Log your first above and the trend starts there.");
  }
  const reversed = [...series].reverse();
  return el(
    "div",
    { class: "card weight__history" },
    ...reversed.map((w, i) => {
      const prev = reversed[i + 1];
      const kgDelta = prev ? w.kg - prev.kg : null;
      return editing === w.date
        ? historyRowEditor(w, setEditing, unit)
        : historyRow(w, kgDelta, setEditing, unit);
    }),
  );
}

function historyRow(w, kgDelta, setEditing, unit) {
  const pen = el(
    "button",
    {
      class: "weight__row-edit",
      type: "button",
      "aria-label": `Edit the ${humanDate(w.date)} weigh-in`,
      onclick: () => setEditing(w.date),
    },
    icon("pencil", { size: 16 }),
  );

  return el(
    "div",
    { class: "weight__row" },
    el("span", { class: "weight__row-wk" }, `Week ${w.week}`),
    el(
      "span",
      { class: "weight__row-main" },
      el("span", { class: "weight__row-date" }, humanDate(w.date)),
      kgDelta == null
        ? null
        : el(
            "span",
            { class: `weight__row-delta is-${deltaDir(kgDelta)}` },
            formatWeightDelta(kgDelta, unit),
          ),
    ),
    el("span", { class: "weight__row-kg" }, formatWeight(w.kg, unit)),
    pen,
  );
}

/**
 * Direction of a week-over-week change, for colour only. Gain is the goal
 * here (the plan builds weight), so a rise reads green and a drop red; a
 * flat week stays neutral. A hair of tolerance keeps rounding noise off
 * "flat".
 */
function deltaDir(kgDelta) {
  if (kgDelta > 0.005) return "gain";
  if (kgDelta < -0.005) return "loss";
  return "flat";
}

function historyRowEditor(w, setEditing, unit) {
  const field = weightInput({ unit, kg: w.kg });

  const commit = () => {
    const kg = field.getKg();
    if (kg == null || Number.isNaN(kg) || kg < 25 || kg > 300) {
      field.setInvalid(true);
      return;
    }
    logWeight(w.date, kg);
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  for (const i of field.inputs) {
    i.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") cancel();
    });
  }

  return el(
    "div",
    { class: "weight__row weight__row--edit" },
    el("span", { class: "weight__row-wk" }, `Week ${w.week}`),
    el("span", { class: "weight__row-input" }, field.node),
    el("button", { class: "btn btn--primary btn--sm", type: "button", onclick: commit }, "Save"),
    el("button", { class: "btn btn--text btn--sm", type: "button", onclick: cancel }, "Cancel"),
  );
}
