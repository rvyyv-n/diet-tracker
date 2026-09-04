/**
 * weight.js — the Weight tab: the weekly weigh-in, the trend it produces, and a
 * short history. The graph lands in the next commit.
 *
 * Everything derived (weekly series, rolling gain, adherence) comes from
 * trend.js; this file is entry + display only. Copy convention: sentence case.
 */

import { el, groupLabel } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { dateCalendar } from "./ui/date-calendar.js";
import { weightInput } from "./ui/weight-input.js";
import { formatWeight, formatWeightDelta, weightRangeText } from "./core/units.js";
import { loadProfile } from "./core/profile.js";
import { TARGET_RATE_KG_PER_WEEK, blockById } from "./core/plan.js";
import { todayISO, humanDate, planWeek } from "./core/dates.js";
import { allWeights, getWeight, logWeight } from "./core/weights.js";
import { allDays } from "./core/days.js";
import { topLoggedRecipes } from "./core/recipes.js";
import { publish } from "./core/broadcast.js";
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

/**
 * Repaint in place, keeping the state renderWeight() resets — a history row
 * open for editing, the date the entry form is filing to. Called by the router
 * when a sibling pane moved the data; see core/broadcast.js.
 */
export function repaintWeight() {
  if (mount) render();
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
      group("Weekly review", "square-check-big", reviewCard(series, rolling, start)),
      group("Trend", "trending-up", chartCard(series)),
      group("History", "calendar-days", historyCard(series)),
    ),
  );
  publish("weight");
}

/** An uppercase tracked label above a card — the shared Settings/Weight shape. */
function group(label, glyph, card) {
  return el("div", { class: "group" }, groupLabel(label, glyph), card);
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

/**
 * The intake-status class for a weekly gain, against the plan's target rate.
 * Gaining is the goal here, so the inversion in tokens.css applies: *under* the
 * band is the failure state and the one that reads red. Over the band is not a
 * failure, only off-pace, so it takes the partial amber.
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

function statsCard(latest, latestGain, adherencePct) {
  const gainClass = paceClass(latestGain);

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
    statRow(
      "This week's adherence",
      adherencePct == null
        ? "—"
        : el("span", { class: adherenceClass(adherencePct) }, `${adherencePct}%`),
    ),
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
 * Two muted lines beneath add the most-skipped block across all recorded days
 * and, once there's a repeat, the most-logged recipe from the book. All are
 * descriptive per insight_copy_states_facts: no exhortation, no red.
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

  return el(
    "div",
    { class: "card summary" },
    statRow("Week", `${wk}`),
    statRow("Average intake", avgKcal == null ? "—" : `${NUM.format(avgKcal)} kcal/day`),
    statRow(
      "Adherence",
      pct == null ? "—" : el("span", { class: adherenceClass(pct) }, `${pct}%`),
    ),
    statRow(
      "Weigh-in",
      wkWeight == null
        ? "—"
        : el(
            "span",
            {},
            formatWeight(wkWeight.kg, unit),
            kgDelta == null ? null : weighInDelta(kgDelta),
          ),
    ),
    statRow(
      "4-week pace",
      roll == null ? "—" : el("span", { class: paceClass(roll) }, `${roll.toFixed(2)} kg/wk`),
    ),
    skipNote(),
    loggedNote(),
  );
}

/**
 * The week-over-week change, coloured by the same inversion the rest of the
 * screen uses: gaining is the goal, so a loss is the low state.
 *
 * The class is decided from the *formatted* figure, not the raw kg. A delta of
 * -0.001 kg formats as "+0.00 kg" at the display precision, and colouring that
 * red reads as a rendering fault rather than a flat week. Anything that rounds
 * away to zero stays muted, which is the honest answer: nothing moved.
 */
function weighInDelta(kgDelta) {
  const text = formatWeightDelta(kgDelta, unit);
  const moved = /[1-9]/.test(text);
  const cls = !moved ? "" : kgDelta > 0 ? "is-on-track" : "is-low";
  return el("span", { class: `review__delta${cls ? " " + cls : ""}` }, ` (${text})`);
}

/** The block skipped most across every recorded day — a fact, not a nag. */
function skipNote() {
  const worst = mostSkippedBlock(allDays());
  if (!worst) return null;
  const name = blockById(worst.blockId)?.name ?? worst.blockId;
  return el(
    "p",
    { class: "review__note" },
    el("span", { class: "review__note-icon", "aria-hidden": "true" }, icon("square-check-big", { size: 14 })),
    `Most often skipped: ${name} — ${worst.missed} of ${worst.of} days it was on the plan.`,
  );
}

/**
 * The recipe logged most from the book (pass 29). All-time, not week-scoped —
 * the book keeps only a running `useCount`. Nothing until a recipe has been
 * used at least twice, so it stays quiet for a brand-new book. A tie at the
 * top names both. A fact, like skipNote() — never "you always reach for X".
 */
function loggedNote() {
  const ranked = topLoggedRecipes(2);
  if (!ranked.length) return null;
  const top = ranked[0].useCount;
  const names = ranked.filter((r) => r.useCount === top).map((r) => r.name);
  const list =
    names.length <= 2
      ? names.join(" and ")
      : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
  return el(
    "p",
    { class: "review__note" },
    el("span", { class: "review__note-icon", "aria-hidden": "true" }, icon("utensils", { size: 14 })),
    `Most logged: ${list} — ${top} time${top === 1 ? "" : "s"}.`,
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
