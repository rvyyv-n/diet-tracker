/**
 * weight.js — the Weight tab: the weekly weigh-in, the trend it produces, and a
 * short history. The graph lands in the next commit.
 *
 * Everything derived (weekly series, rolling gain, adherence) comes from
 * trend.js; this file is entry + display only. Copy convention: sentence case.
 */

import { el } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { dateCalendar } from "./ui/date-calendar.js";
import { weightInput } from "./ui/weight-input.js";
import { formatWeight, formatWeightDelta, weightRangeText } from "./core/units.js";
import { loadProfile } from "./core/profile.js";
import { TARGET_RATE_KG_PER_WEEK, blockById } from "./core/plan.js";
import { todayISO, humanDate, planWeek } from "./core/dates.js";
import { allWeights, getWeight, logWeight } from "./core/weights.js";
import { allDays } from "./core/days.js";
import {
  weeklyWeights,
  weeklyGains,
  rollingGain,
  weeklyAdherence,
  weeklyKcal,
  mostSkippedBlock,
} from "./core/trend.js";

const NUM = new Intl.NumberFormat("en-US"); // 2,565

let mount;
let editing = null; // ISO date of the history row being edited, or null
let entryDate = todayISO(); // the day the weigh-in form is filing to
let justSaved = false; // shows the transient "Saved" badge for ~2s
let unit = "kg"; // profile.weightUnit — display + entry unit, kg stays stored

export function renderWeight(mountEl) {
  mount = mountEl;
  editing = null;
  entryDate = todayISO();
  justSaved = false;
  render();
}

function render() {
  const profile = loadProfile();
  unit = profile.weightUnit || "kg";
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

  mount.replaceChildren(
    el(
      "section",
      { class: "screen weight weight--v2" },
      el(
        "div",
        { class: "screen-head" },
        el("h1", { class: "screen__title screen__title--lg" }, "Weight"),
        el("p", { class: "phase-banner" }, subtitle),
      ),
      entryCard(),
      statsCard(latest, latestGain, thisWeekAdherence),
      group("Weekly review", reviewCard(series, rolling, start)),
      group("Trend", chartCard(series)),
      group("History", historyCard(series)),
    ),
  );
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

/**
 * A weekly-weight line against the target band. The band is a *rate*
 * (0.25–0.4 kg/week), so from the first reading it opens into a cone — being
 * inside it means the gain is on pace. Plain inline SVG, no library.
 */
function chartCard(series) {
  if (series.length < 2) {
    return el(
      "div",
      { class: "card weight__chart" },
      el("p", { class: "screen__intro" }, "Two weigh-ins will draw the trend."),
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

  const card = el("div", { class: "card weight__chart" });
  const holder = el("div", { class: "weight__chart-svg" });
  holder.innerHTML = svg;
  card.append(
    holder,
    el(
      "p",
      { class: "weight__chart-key" },
      "Line: your weekly weight. Shaded: on-pace for 0.25–0.4 kg/week.",
    ),
  );
  return card;
}

function entryCard() {
  const today = todayISO();
  if (entryDate > today) entryDate = today;
  const existing = getWeight(entryDate);
  const isToday = entryDate === today;

  const cal = dateCalendar({ value: entryDate, max: today });
  cal.onChange((iso) => {
    entryDate = iso;
    render();
  });

  const field = weightInput({ unit, kg: existing });

  let restingHint;
  if (existing != null) restingHint = `Logged for ${humanDate(entryDate)}.`;
  else if (isToday)
    restingHint = "Same day each week — morning, after the bathroom, before food or water.";
  else restingHint = `Backdating to ${humanDate(entryDate)}.`;
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
    logWeight(entryDate, kg);
    justSaved = true;
    setTimeout(() => {
      justSaved = false;
      render();
    }, 2000);
    render();
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

function statsCard(latest, latestGain, adherencePct) {
  const band = TARGET_RATE_KG_PER_WEEK;
  const gainClass =
    latestGain == null
      ? ""
      : latestGain < band.min
        ? "is-low"
        : latestGain > band.max
          ? "is-partial"
          : "is-on-track";

  return el(
    "div",
    { class: "card summary" },
    statRow("Latest", latest ? formatWeight(latest.kg, unit) : "—"),
    statRow(
      "4-week gain",
      latestGain == null
        ? "—"
        : el("span", { class: gainClass }, `${latestGain.toFixed(2)} kg/wk`),
    ),
    statRow("This week's adherence", adherencePct == null ? "—" : `${adherencePct}%`),
  );
}

function statRow(key, value) {
  return el(
    "div",
    { class: "summary__row" },
    el("span", { class: "summary__key" }, key),
    el("span", { class: "summary__val" }, value),
  );
}

/**
 * A read of the last *completed* plan week: average intake, adherence, that
 * week's weigh-in and its change from the week before, and whether the 4-week
 * rolling pace sat in the 0.25–0.4 kg/wk band. All of it is already computed in
 * trend.js and shown nowhere else. Reporting only — the adjustment engine keeps
 * its own suggestion card on Today, and the two must not argue.
 *
 * A muted line beneath adds the most-skipped block across all recorded days.
 * Both are descriptive per insight_copy_states_facts: no exhortation, no red.
 */
function reviewCard(series, rolling, start) {
  const thisWeek = planWeek(start, todayISO());
  const kcalSeries = weeklyKcal(allDays(), start);
  const adhSeries = weeklyAdherence(allDays(), start);
  const wk = kcalSeries.filter((k) => k.week < thisWeek).at(-1)?.week ?? null;

  if (wk == null) {
    return el(
      "div",
      { class: "card" },
      el("p", { class: "screen__intro" }, "Your first full plan week will show its review here."),
    );
  }

  const avgKcal = kcalSeries.find((k) => k.week === wk)?.avgKcal ?? null;
  const pct = adhSeries.find((a) => a.week === wk)?.pct ?? null;
  const wkWeight = series.find((s) => s.week === wk) ?? null;
  const prevWeight = series.filter((s) => s.week < wk).at(-1) ?? null;
  const kgDelta = wkWeight && prevWeight ? wkWeight.kg - prevWeight.kg : null;
  const roll = rolling.find((r) => r.week === wk)?.avgKgPerWeek ?? null;
  const band = TARGET_RATE_KG_PER_WEEK;
  const inBand = roll == null ? null : roll >= band.min && roll <= band.max;

  return el(
    "div",
    { class: "card summary" },
    statRow("Week", `${wk}`),
    statRow("Average intake", avgKcal == null ? "—" : `${NUM.format(avgKcal)} kcal/day`),
    statRow("Adherence", pct == null ? "—" : `${pct}%`),
    statRow(
      "Weigh-in",
      wkWeight == null
        ? "—"
        : el(
            "span",
            {},
            formatWeight(wkWeight.kg, unit),
            kgDelta == null
              ? null
              : el("span", { class: "review__delta" }, ` (${formatWeightDelta(kgDelta, unit)})`),
          ),
    ),
    statRow(
      "4-week pace",
      roll == null
        ? "—"
        : el("span", { class: inBand ? "is-on-track" : "is-partial" }, `${roll.toFixed(2)} kg/wk`),
    ),
    skipNote(),
  );
}

/** The block skipped most across every recorded day — a fact, not a nag. */
function skipNote() {
  const worst = mostSkippedBlock(allDays());
  if (!worst) return null;
  const name = blockById(worst.blockId)?.name ?? worst.blockId;
  return el(
    "p",
    { class: "review__note" },
    `Most often skipped: ${name} — ${worst.missed} of ${worst.of} days it was on the plan.`,
  );
}

function historyCard(series) {
  if (!series.length) {
    return el("p", { class: "screen__intro" }, "No weigh-ins yet — log your first above.");
  }
  const reversed = [...series].reverse();
  return el(
    "div",
    { class: "card weight__history" },
    ...reversed.map((w, i) => {
      const prev = reversed[i + 1];
      const kgDelta = prev ? w.kg - prev.kg : null;
      return editing === w.date ? historyRowEditor(w) : historyRow(w, kgDelta);
    }),
  );
}

function historyRow(w, kgDelta) {
  const pen = el(
    "button",
    {
      class: "weight__row-edit",
      type: "button",
      "aria-label": `Edit the ${humanDate(w.date)} weigh-in`,
      onclick: () => {
        editing = w.date;
        render();
      },
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
 * Direction of a week-over-week change, for colour only. Gain is the goal here
 * (the plan builds weight), so a rise reads green and a drop red; a flat week
 * stays neutral. A hair of tolerance keeps rounding noise off "flat".
 */
function deltaDir(kgDelta) {
  if (kgDelta > 0.005) return "gain";
  if (kgDelta < -0.005) return "loss";
  return "flat";
}

function historyRowEditor(w) {
  const field = weightInput({ unit, kg: w.kg });

  const commit = () => {
    const kg = field.getKg();
    if (kg == null || Number.isNaN(kg) || kg < 25 || kg > 300) {
      field.setInvalid(true);
      return;
    }
    logWeight(w.date, kg);
    editing = null;
    render();
  };
  const cancel = () => {
    editing = null;
    render();
  };

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
