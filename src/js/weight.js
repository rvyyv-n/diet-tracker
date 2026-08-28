/**
 * weight.js — the Weight tab: the weekly weigh-in, the trend it produces, and a
 * short history. The graph lands in the next commit.
 *
 * Everything derived (weekly series, rolling gain, adherence) comes from
 * trend.js; this file is entry + display only. Copy convention: sentence case.
 */

import { el } from "./ui/dom.js";
import { loadProfile } from "./core/profile.js";
import { TARGET_RATE_KG_PER_WEEK } from "./core/plan.js";
import { todayISO, humanDate, planWeek } from "./core/dates.js";
import { allWeights, getWeight, logWeight } from "./core/weights.js";
import { allDays } from "./core/days.js";
import { weeklyWeights, weeklyGains, rollingGain, weeklyAdherence } from "./core/trend.js";

let mount;

export function renderWeight(mountEl) {
  mount = mountEl;
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

  mount.replaceChildren(
    el(
      "section",
      { class: "screen weight" },
      el("h1", { class: "screen__title screen__title--lg" }, "Weight"),
      entryCard(),
      statsCard(latest, latestGain, thisWeekAdherence),
      historyCard(series),
    ),
  );
}

function entryCard() {
  const existing = getWeight(todayISO());

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

  const hint = el(
    "span",
    { class: "field__hint" },
    existing != null
      ? "Logged for today. Save again to change it."
      : "Same day each week — morning, after the bathroom, before food or water.",
  );

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
    logWeight(todayISO(), kg);
    render();
  });

  return el(
    "div",
    { class: "card weight__entry" },
    el(
      "label",
      { class: "field" },
      el("span", { class: "field__label" }, `Today — ${humanDate(todayISO())}`),
      el("span", { class: "field__control" }, input),
      hint,
    ),
    save,
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
      el("span", { class: gainClass }, latestGain == null ? "—" : `${latestGain.toFixed(2)} kg/wk`),
      `target ${band.min}–${band.max}`,
    ),
    statRow("This week's adherence", adherencePct == null ? "—" : `${adherencePct}%`),
  );
}

function statRow(key, value, sub) {
  return el(
    "div",
    { class: "summary__row" },
    el("span", { class: "summary__key" }, key),
    el(
      "span",
      { class: "summary__val" },
      value,
      sub ? el("span", { class: "weight__sub" }, ` ${sub}`) : null,
    ),
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
    el("span", { class: "field__label" }, "History"),
    ...reversed.map((w, i) => {
      const prev = reversed[i + 1];
      const delta = prev ? round2(w.kg - prev.kg) : null;
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
      );
    }),
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
