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
import { loadProfile } from "./core/profile.js";
import { TARGET_RATE_KG_PER_WEEK } from "./core/plan.js";
import { todayISO, humanDate, planWeek } from "./core/dates.js";
import { allWeights, getWeight, logWeight } from "./core/weights.js";
import { allDays } from "./core/days.js";
import { weeklyWeights, weeklyGains, rollingGain, weeklyAdherence } from "./core/trend.js";

let mount;
let editing = null; // ISO date of the history row being edited, or null
let entryDate = todayISO(); // the day the weigh-in form is filing to
let justSaved = false; // shows the transient "Saved" badge for ~2s

export function renderWeight(mountEl) {
  mount = mountEl;
  editing = null;
  entryDate = todayISO();
  justSaved = false;
  render();
}

function render() {
  const profile = loadProfile();
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

  const input = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "decimal",
    step: "0.1",
    min: "25",
    max: "300",
    placeholder: "kg",
  });
  if (existing != null) input.value = existing;

  let restingHint;
  if (existing != null) restingHint = `Logged for ${humanDate(entryDate)}.`;
  else if (isToday)
    restingHint = "Same day each week — morning, after the bathroom, before food or water.";
  else restingHint = `Backdating to ${humanDate(entryDate)}.`;
  const hint = el("span", { class: "field__hint" }, restingHint);

  const ack = justSaved ? el("span", { class: "ack" }, "Saved") : null;
  const save = el("button", { class: "btn btn--primary", type: "button" }, "Save");
  save.addEventListener("click", () => {
    const raw = input.value.trim();
    const kg = raw === "" ? NaN : Number(raw);
    if (Number.isNaN(kg) || kg < 25 || kg > 300) {
      hint.textContent = "Enter a weight in kg, roughly 25–300.";
      hint.classList.add("field__hint--error");
      input.classList.add("is-invalid");
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
    el(
      "label",
      { class: "field" },
      el("span", { class: "field__control" }, input),
      hint,
    ),
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
    statRow("Latest", latest ? `${latest.kg} kg` : "—"),
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
      const delta = prev ? round2(w.kg - prev.kg) : null;
      return editing === w.date ? historyRowEditor(w) : historyRow(w, delta);
    }),
  );
}

function historyRow(w, delta) {
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
    el("span", { class: "weight__row-date" }, humanDate(w.date)),
    el("span", { class: "weight__row-kg" }, `${w.kg} kg`),
    el(
      "span",
      { class: "weight__row-delta" },
      delta == null ? "" : `${delta >= 0 ? "+" : ""}${delta}`,
    ),
    pen,
  );
}

function historyRowEditor(w) {
  const input = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "decimal",
    step: "0.1",
    min: "25",
    max: "300",
  });
  input.value = w.kg;

  const commit = () => {
    const kg = Number(input.value);
    if (Number.isNaN(kg) || kg < 25 || kg > 300) {
      input.classList.add("is-invalid");
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

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  });

  return el(
    "div",
    { class: "weight__row weight__row--edit" },
    el("span", { class: "weight__row-wk" }, `Week ${w.week}`),
    el("span", { class: "field__control weight__row-input" }, input),
    el("button", { class: "btn btn--primary btn--sm", type: "button", onclick: commit }, "Save"),
    el("button", { class: "btn btn--text btn--sm", type: "button", onclick: cancel }, "Cancel"),
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
