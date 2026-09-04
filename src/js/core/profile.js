/**
 * profile.js — who the app is currently tracking.
 *
 * No personal figures are hardcoded anywhere in this repository. The defaults
 * below are deliberately empty: real values arrive from the welcome screen at
 * runtime and live only in the user's own browser. That keeps the repo public
 * without publishing anyone's body measurements, and it is what lets the app
 * serve someone other than its author.
 */

import { load, save } from "./storage.js";

const RECORD = "profile";

/**
 * Note that age is NOT stored. A saved age quietly becomes wrong on the user’s
 * next birthday, so the app stores the fact (birth date) and derives the
 * reading (age) whenever it needs it.
 */
export const DEFAULT_PROFILE = {
  name: "",
  birthDate: null,        // ISO "YYYY-MM-DD"
  heightCm: null,         // always stored in cm, whatever unit was typed
  heightUnit: "cm",       // "cm" | "ftin" — how to show the field on re-edit
  startWeightKg: null,    // always stored in kg, whatever unit was typed
  weightUnit: "kg",       // "kg" | "lb" | "st" — display + entry unit for weight
  targetRateKgPerWeek: 0.3,  // plan default; the user can override
  startDate: null,        // ISO date the plan began
  currentPhaseId: 1,      // plan phase the user is on now; app.js advances it
  addOns: [],             //   1 -> 2 with the weeks, never to 3 (user-only)
  //                         add-on blocks currently enabled ("A1".."A3"); seeded
  //                         from the phase default, then the engine adjusts it
  dismissedSuggestion: null, // { ruleId, date } — hushes that rule for ~a week,
  //                            set on Dismiss and after Apply (see today.js)
  introSeen: false,       // the first-run splash has been shown once (pass 11).
  themePref: "system",    // "system" | "light" | "dark" — the appearance choice
  //                         (pass 19); applied by core/theme.js, "system"
  //                         follows prefers-color-scheme.
  overviewMetrics: {},    // { [metricId]: false } for a readout the user hid on
  //                         Today's day-total card (pass 32). An absent id reads
  //                         as shown, so a metric added later defaults visible.
};                        // merged over defaults on load, so no schema bump.

export function loadProfile() {
  // Merge over the defaults rather than using them only as an absent-record
  // fallback: a profile saved by an earlier version is missing any field added
  // since, and spreading it on top fills those in without a schema-version bump.
  return { ...DEFAULT_PROFILE, ...load(RECORD, {}) };
}

export function saveProfile(profile) {
  return save(RECORD, profile);
}

/**
 * The optional readouts on Today's day-total card, in render order (pass 32).
 * The kcal figure and its target are not in the list — they always show. The
 * id list lives here; the label / hint copy lives at the two render sites
 * (today.js gates the lines, settings.js draws the toggles).
 */
export const OVERVIEW_METRICS = ["protein", "remaining"];

/** Whether a day-total readout is shown — hidden only if explicitly set false. */
export function overviewMetricShown(profile, id) {
  return profile.overviewMetrics?.[id] !== false;
}

/** A profile is complete once it has everything the engine needs to compute. */
export function isComplete(profile) {
  return (
    profile.heightCm != null &&
    profile.startWeightKg != null &&
    profile.birthDate != null
  );
}

/** Whole years since birthDate, or null if unknown. */
export function ageYears(profile, today = new Date()) {
  if (!profile.birthDate) return null;
  const born = new Date(profile.birthDate);
  if (Number.isNaN(born.getTime())) return null;

  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  const beforeBirthday =
    monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Validate a single field. Returns an error string, or null when valid.
 * Bounds are loose sanity checks meant to catch typos (a height typed in
 * metres, a weight off by a decimal place), not to police who may use the app.
 */
export function validate(field, value) {
  switch (field) {
    case "heightCm":
      if (value == null || Number.isNaN(value)) return "Enter your height.";
      return value >= 100 && value <= 250 ? null : "Height should be in cm, roughly 100–250.";
    case "startWeightKg":
      if (value == null || Number.isNaN(value)) return "Enter your weight.";
      return value >= 25 && value <= 300 ? null : "Weight should be in kg, roughly 25–300.";
    case "birthDate": {
      if (!value) return "Enter your date of birth.";
      const age = ageYears({ birthDate: value });
      return age != null && age >= 5 && age <= 120 ? null : "That date looks wrong.";
    }
    case "targetRateKgPerWeek":
      return value > 0 && value <= 1 ? null : "Pick a rate between 0 and 1 kg per week.";
    default:
      return null;
  }
}
