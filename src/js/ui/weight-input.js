/**
 * weight-input.js — a weight entry control that renders in the user's unit.
 *
 * kg and lb are a single number field; st is a stone + pounds pair, the same
 * shape as the height ft/in row. `getKg()` always returns kilograms (null when
 * empty, NaN when unparseable), so a caller stores kg whatever was typed.
 *
 *   const w = weightInput({ unit: "lb", kg: 68.2 });
 *   parent.append(w.node);
 *   const kg = w.getKg();            // -> 68.2
 */

import { el } from "./dom.js";
import { kgToLb, lbToKg, kgToStLb, stLbToKg } from "../core/units.js";

export function weightInput({ unit = "kg", kg = null } = {}) {
  const compound = unit === "st";

  const one = el("input", {
    class: "field__input",
    type: "number",
    inputmode: "decimal",
    step: "0.1",
    placeholder: unit === "lb" ? "lb" : "kg",
  });
  const stIn = el("input", {
    class: "field__input", type: "number", inputmode: "numeric", step: "1", min: "0", placeholder: "st",
  });
  const lbIn = el("input", {
    class: "field__input", type: "number", inputmode: "decimal", step: "0.1", min: "0", placeholder: "lb",
  });

  if (kg != null && !Number.isNaN(kg)) {
    if (compound) {
      const { st, lb } = kgToStLb(kg);
      stIn.value = String(st);
      lbIn.value = lb.toFixed(1);
    } else {
      one.value = (unit === "lb" ? kgToLb(kg) : kg).toFixed(1);
    }
  }

  const node = compound
    ? el(
        "div",
        { class: "weight-stlb" },
        el("div", { class: "field__control" }, stIn),
        el("span", { class: "weight-stlb__unit" }, "st"),
        el("div", { class: "field__control" }, lbIn),
        el("span", { class: "weight-stlb__unit" }, "lb"),
      )
    : el("div", { class: "field__control" }, one);

  const inputs = compound ? [stIn, lbIn] : [one];
  const round2 = (n) => Math.round(n * 100) / 100;

  function getKg() {
    if (compound) {
      const s = stIn.value.trim();
      const l = lbIn.value.trim();
      if (s === "" && l === "") return null;
      return round2(stLbToKg(s === "" ? 0 : Number(s), l === "" ? 0 : Number(l)));
    }
    const raw = one.value.trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (Number.isNaN(n)) return NaN;
    // kg keeps exactly what was typed; a converted figure is rounded so it
    // doesn't land in storage as 68.038860384...
    return unit === "lb" ? round2(lbToKg(n)) : n;
  }

  return {
    node,
    inputs,
    getKg,
    /** The field to focus when the value is rejected. */
    get focusEl() {
      return compound && stIn.value.trim() === "" ? stIn : inputs[0];
    },
    setInvalid(bad) {
      for (const i of inputs) i.classList.toggle("is-invalid", Boolean(bad));
    },
  };
}
