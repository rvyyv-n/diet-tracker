/**
 * Today.jsx — the daily checklist, converted from today.js (pass 45's
 * fourth screen, and the biggest one). Shows the blocks active for the
 * viewed day's phase, in time-of-day order, plus off-plan food and the
 * appetite check. The "+ Log food" panel and the recipe book behind it live
 * in LogFood.jsx (pass 62).
 *
 * Two things the vanilla screen needed that this one drops entirely, for the
 * same reason Plan.jsx dropped `renderPreservingFocus()`: React's reconciler
 * doesn't tear the whole subtree down on every interaction, so an element
 * that's still there next render keeps its identity, its focus, and — new
 * here — its typed value.
 *   - `data-focus-key` / `renderPreservingFocus()` are gone; nothing replaces
 *     them because nothing needs to.
 *   - The recipe name field, the quick-type extras/ingredient forms, and the
 *     recipe-book filter box were all *uncontrolled* in the vanilla version,
 *     reading `.value` off the live DOM node instead of going through
 *     `render()` — a keystroke that rebuilt the whole screen would have
 *     wiped the field it was typed into. They're ordinary controlled inputs
 *     here; a keystroke just updates state and React patches the same input
 *     node in place.
 *
 * One vanilla widget remains as-is: `dateCalendar()` (the day-strip's
 * calendar popover). Same reasoning as Weight.jsx's entry card — small,
 * correct, self-contained — rebuilt fresh every render and mounted with the
 * shared `Imperative` adapter. (The food picker's `listbox()` moved to
 * LogFood.jsx with the rest of the panel.)
 *
 * The hero kcal figure in `TotalCard` uses reactbits.dev's `CountUp`
 * (`src/components/reactbits/CountUp.jsx`) — the text/number effect
 * pass 45 called for landing here, once this screen went React. It
 * animates on mount and re-animates smoothly whenever the total changes
 * (ticking a block, logging food), rather than the figure just snapping.
 */

import { useEffect, useRef, useState } from "react";
import { justOpened } from "./js/ui/dom.js";
import CountUp from "./components/reactbits/CountUp.jsx";
import { loadProfile, saveProfile, overviewMetricShown } from "./js/core/profile.js";
import {
  activeBlocks,
  blockById,
  phaseById,
  phaseTarget,
  rotationOptions,
  defaultPhaseForWeek,
  phaseAddOns,
  PHASES,
  ADDON_IDS,
  FOOD_DB,
} from "./js/core/plan.js";
import {
  newDay,
  toggleBlock,
  chooseRotation,
  blockValue,
  dayTotals,
  dayAddOns,
  dayBonus,
  addBlock,
  removeBlock,
  setAppetite,
  APPETITE_VALUES,
  intakeStatus,
  isDayEditable,
} from "./js/core/day.js";
import { dayExtras, removeExtra } from "./js/core/extras.js";
import { allRecipes, saveRecipe, recipeKey } from "./js/core/recipes.js";
import { getDay, putDay, allDays } from "./js/core/days.js";
import { whatsNewSeen, markWhatsNewSeen } from "./js/core/whatsnew.js";
import { dateCalendar } from "./js/ui/date-calendar.js";
import { allWeights } from "./js/core/weights.js";
import { weeklyWeights, weeklyGains, rollingGain, weeklyAdherence } from "./js/core/trend.js";
import { evaluate, applySuggestion } from "./js/core/adjust.js";
import { todayISO, addDays, planWeek, daysBetween } from "./js/core/dates.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { NUM, Icon, GroupLabel, Imperative, fmtTime } from "./components/shared.jsx";
import { ExtrasAddPanel, announceDayTotal } from "./LogFood.jsx";

// The hero kcal figure's count-up (pass 45) should only play once per page
// load — not every time Today remounts from a tab switch, and not every
// time a block is checked and the total changes mid-visit. A module-level
// flag (rather than component state) is what makes that survive Today
// unmounting entirely when you navigate away: it resets only on an actual
// page reload, which is exactly "first load of the site".
let kcalCountUpPlayed = false;

// The appetite check labels, in tap order. Keys are APPETITE_VALUES.
const APPETITE_LABEL = { stuffed: "Stuffed", fine: "Fine", hungry: "Hungry" };

const STATUS_CLASS = {
  "on-track": "is-on-track",
  partial: "is-partial",
  low: "is-low",
};

// How many days the adherence dot strip shows — the last week at a glance, up
// near the header. Older days are reached through the calendar popover beside
// it, not by growing this strip.
const STRIP_DAYS = 7;

export default function Today() {
  const paneRef = useRef(null);

  // `viewDate` is the day on screen — today, unless the user tapped a dot in
  // the strip, the calendar popover, or the backfill prompt to look at (or
  // finish) an earlier day.
  const [viewDate, setViewDate] = useState(todayISO());
  const [openPicker, setOpenPicker] = useState(null); // the block id whose rotation picker is expanded
  const [addOpen, setAddOpen] = useState(false); // the "add a block" panel under the checklist
  const [extrasOpen, setExtrasOpen] = useState(false); // the "log food" panel under the extras list
  const [extrasMode, setExtrasMode] = useState("pick"); // "recipe" | "pick" (FOOD_DB) | "type" (quick-type)
  const [extrasModeTouched, setExtrasModeTouched] = useState(false); // has the user picked an extras tab this visit?
  const [extrasFoodId, setExtrasFoodId] = useState(() => FOOD_DB[0]?.id ?? null); // the FOOD_DB id picked in "pick" mode
  // The recipe editor (pass 28), open over the Recipes tab, or null. `id`
  // null is a new recipe; `items` is the working ingredient list; `addMode` /
  // `addFoodId` drive its own pick/type add-ingredient sub-form.
  const [recipeEditor, setRecipeEditor] = useState(null);
  const [recipeEditorError, setRecipeEditorError] = useState(null); // a message shown under the editor after a failed save
  const [recipeDeleteConfirming, setRecipeDeleteConfirming] = useState(false); // Delete's own two-step, reusing Settings' .set-confirm

  useEffect(() => {
    const node = paneRef.current;
    node.classList.remove("tab-switching");
    void node.offsetWidth;
    node.classList.add("tab-switching");
  }, []);

  useEffect(() => {
    publish("today");
  });

  const [, bump] = useState(0);
  useEffect(() => subscribe((fresh) => {
    if (!fresh.has("today")) bump((n) => n + 1);
  }), []);

  /** Jump straight back to today from any earlier day. */
  function goToDate(iso) {
    setViewDate(iso);
    setOpenPicker(null);
    setAddOpen(false);
    setExtrasOpen(false);
  }

  /** Persist a changed day, then repaint. */
  function commit(nextDay) {
    putDay(nextDay);
    announceDayTotal(nextDay);
    bump((n) => n + 1);
  }

  const profile = loadProfile();
  const day = loadViewDay(profile, viewDate);
  const editable = isDayEditable(day, todayISO());
  const suggestion = viewDate === todayISO() ? liveSuggestion(profile) : null;

  function applySuggestionAndSave() {
    const next = {
      ...applySuggestion(profile, suggestion),
      dismissedSuggestion: { ruleId: suggestion.ruleId, date: todayISO() },
    };
    saveProfile(next);
    const rec = getDay(viewDate); // reflect the block change on today straight away
    if (rec) putDay({ ...rec, addOns: next.addOns });
    bump((n) => n + 1);
  }

  function dismissSuggestion() {
    saveProfile({
      ...profile,
      dismissedSuggestion: { ruleId: suggestion.ruleId, date: todayISO() },
    });
    bump((n) => n + 1);
  }

  const extrasState = {
    extrasMode,
    setExtrasMode,
    extrasModeTouched,
    setExtrasModeTouched,
    extrasFoodId,
    setExtrasFoodId,
    recipeEditor,
    setRecipeEditor,
    recipeEditorError,
    setRecipeEditorError,
    recipeDeleteConfirming,
    setRecipeDeleteConfirming,
  };

  return (
    <div className="pane" data-screen="today" ref={paneRef}>
      <section className="screen today">
        <DateHeader profile={profile} day={day} editable={editable} goToDate={goToDate} />
        {whatsNewSeen() ? null : (
          <WhatsNewCard onDismiss={() => { markWhatsNewSeen(); bump((n) => n + 1); }} />
        )}
        <AdherenceStrip profile={profile} viewedDay={day} goToDate={goToDate} />
        {suggestion ? (
          <SuggestionCard suggestion={suggestion} onApply={applySuggestionAndSave} onDismiss={dismissSuggestion} />
        ) : null}
        <TotalCard day={day} profile={profile} />
        <BackfillPrompt viewDate={viewDate} setViewDate={setViewDate} setOpenPicker={setOpenPicker} />
        <Checklist day={day} editable={editable} openPicker={openPicker} setOpenPicker={setOpenPicker} setAddOpen={setAddOpen} commit={commit} />
        <ExtrasSection day={day} editable={editable} commit={commit} />
        {editable ? (
          <div className="today-actions">
            <ExtrasAddPanel
              day={day}
              extrasOpen={extrasOpen}
              setExtrasOpen={setExtrasOpen}
              extrasState={extrasState}
              commit={commit}
            />
            <AddBlockSection day={day} addOpen={addOpen} setAddOpen={setAddOpen} commit={commit} />
          </div>
        ) : null}
        {editable ? <AppetiteSection day={day} commit={commit} /> : null}
      </section>
    </div>
  );
}

// --- data ----------------------------------------------------------------

/**
 * The viewed day's record, or a fresh one. Rotations are seeded from the last
 * recorded day (pass 14 — sticky rotations), not the hardcoded defaults, so
 * most days need no re-picking. For a day that was never recorded, the phase is
 * the default for *that day's* plan week rather than today's — stepping back to
 * an unrecorded week-1 day should show the ramp-up blocks, not this week's.
 */
function loadViewDay(profile, viewDate) {
  const stored = getDay(viewDate);
  if (stored) return stored;
  const last = allDays().at(-1);
  const today = todayISO();
  if (viewDate === today) {
    return newDay(today, profile.currentPhaseId, profile.addOns, last?.rotations);
  }
  const phaseId = defaultPhaseForWeek(planWeek(profile.startDate || viewDate, viewDate));
  return newDay(viewDate, phaseId, phaseAddOns(phaseId), last?.rotations);
}

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

function SuggestionCard({ suggestion, onApply, onDismiss }) {
  return (
    <div className="card suggestion">
      <p className="suggestion__headline">{suggestion.headline}</p>
      <p className="suggestion__detail">{suggestion.detail}</p>
      <div className="suggestion__actions">
        {suggestion.kind === "add-block" || suggestion.kind === "remove-block" ? (
          <button className="btn btn--primary" type="button" onClick={onApply}>
            Apply
          </button>
        ) : null}
        <button className="btn btn--text" type="button" onClick={onDismiss}>
          {suggestion.kind === "checkup" ? "Got it" : "Not now"}
        </button>
      </div>
    </div>
  );
}

/**
 * A one-time card for a device upgrading from v1.6 into v2 — see
 * core/whatsnew.js for why a first-run setup never sees this. Dismiss is
 * permanent; it names where each feature lives rather than describing it, in
 * keeping with insight_copy_states_facts.
 */
function WhatsNewCard({ onDismiss }) {
  return (
    <div className="card suggestion">
      <p className="suggestion__headline">What's new in 2.0</p>
      <ul className="whatsnew__list">
        <li>Off-plan food and a recipe book — Log food, below the checklist.</li>
        <li>A weekly grocery checklist — the new Plan tab.</li>
        <li>Choose which numbers show on the day total — Settings → Overview.</li>
        <li>A wider layout on tablet and desktop.</li>
      </ul>
      <div className="suggestion__actions">
        <button className="btn btn--text" type="button" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}

function PhaseBanner({ profile, day }) {
  const phase = phaseById(day.phaseId);
  // The week of the day being viewed, not always today's — the stepper and the
  // dot strip can put an earlier day on screen.
  const week = planWeek(profile.startDate || day.date, day.date);
  const weekText = day.phaseId === 1 ? `Week ${week} of 2` : `Week ${week}`;
  return <p className="phase-banner">{phase.name} · {weekText}</p>;
}

/**
 * The three-rung target ladder, with the viewed day's phase picked out. Keeps
 * the daily figure in context — ramp-up is meant to feel low, the pushed target
 * is meant to feel like a lot — so a number that would otherwise read as "wrong"
 * reads as "this rung".
 */
function PhaseLadder({ day }) {
  return (
    <p className="phase-ladder">
      {PHASES.map((phase, i) => (
        <span key={phase.id}>
          {i > 0 ? " · " : ""}
          <span className={phase.id === day.phaseId ? "phase-ladder__now" : undefined}>
            {phase.name} {NUM.format(phase.kcal)}
          </span>
        </span>
      ))}
      {" kcal"}
    </p>
  );
}

function DateHeader({ profile, day, editable, goToDate }) {
  const isToday = day.date === todayISO();
  return (
    <div className="screen-head">
      <div className="today__daterow">
        <h1 className={`screen__title screen__title--lg${isToday ? "" : " screen__title--date"}`}>
          {isToday ? "Today" : longDate(day.date)}
        </h1>
        {isToday ? null : (
          <button className="btn btn--text" type="button" onClick={() => goToDate(todayISO())}>
            Back to today
          </button>
        )}
      </div>
      <PhaseBanner profile={profile} day={day} />
      <PhaseLadder day={day} />
      {editable ? null : <span className="today__closed">This day is closed.</span>}
    </div>
  );
}

/**
 * A dot per day over the last week, coloured by that day's intake status, with
 * untouched days left blank. It sits just under the header as a quick "how has
 * the week gone" glance. Tapping a dot views that day; the calendar button
 * beside the label reaches any older day (still read-only). Facts only: the
 * dots reuse the intake-status scale the day total already uses, with no
 * separate "alarm" colour.
 */
function AdherenceStrip({ profile, viewedDay, goToDate }) {
  const today = todayISO();
  const start = profile.startDate || today;
  const dots = [];
  for (let i = STRIP_DAYS - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    if (date < start) continue;
    const rec = getDay(date);
    const touched = rec && dayTotals(rec).done > 0;
    dots.push({ date, status: touched ? intakeStatus(rec) : null });
  }
  if (dots.length < 2) return null;

  // The "older days" route: a compact calendar popover, capped at today, seeded
  // on the day currently in view. Picking a date just moves viewDate — the same
  // thing a dot tap does.
  const cal = dateCalendar({ value: viewedDay.date, max: today });
  cal.onChange((iso) => goToDate(iso));

  return (
    <div className="daystrip">
      <div className="daystrip__head">
        <GroupLabel icon="calendar-days">7 days</GroupLabel>
        <Imperative node={cal.node} />
      </div>
      <div className="daystrip__row">
        {dots.map((d) => (
          <button
            key={d.date}
            className={
              "daystrip__dot" +
              (d.status ? ` is-${d.status}` : " is-blank") +
              (d.date === viewedDay.date ? " is-viewing" : "")
            }
            type="button"
            aria-label={d.status ? longDate(d.date) : `${longDate(d.date)} — no entry`}
            aria-current={d.date === viewedDay.date ? "date" : undefined}
            onClick={() => goToDate(d.date)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The day-total progress bar (pass 42). A hairline under the hero figure,
 * filled to the day's fraction of target and coloured by the same
 * intakeStatus() the figure above it already uses.
 *
 * Deliberately a bar and not a ring or a dial: it is a second reading of a
 * number that is already on screen in full — "1,840 / 2,900 kcal" — so it may
 * add shape but must not add meaning. Nothing about it is allowed to read as a
 * score, which is why there is no label, no percentage text, and no end-state
 * flourish when it fills.
 *
 * Clamped at 100%: over target the bar simply stops full rather than
 * overflowing its track. Going over is not an error in a gain tracker, and the
 * figure above already says by how much. Hidden from the accessibility tree
 * for the same reason it is decorative — a screen reader gets the real numbers.
 */
function DayBar({ kcal, targetKcal, status }) {
  if (!targetKcal) return null;
  const pct = Math.max(0, Math.min(100, (kcal / targetKcal) * 100));
  return (
    <span className="daytotal__bar" aria-hidden="true">
      <span className={`daytotal__bar-fill ${STATUS_CLASS[status]}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * The day-total card. The kcal figure and its target always show; the
 * "remaining" line and the protein line are each behind a Settings toggle
 * (pass 32 — profile.overviewMetrics), gated here so a hidden line leaves no
 * node rather than empty space.
 */
function TotalCard({ day, profile }) {
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId);
  const status = intakeStatus(day);

  const toGo = Math.max(0, target.kcal - totals.kcal);
  const blocksLeft = Math.max(0, totals.total - totals.planDone);
  const blockWord = blocksLeft === 1 ? "block" : "blocks";

  let remaining;
  if (blocksLeft === 0 && toGo === 0) remaining = "All done.";
  else if (toGo === 0) remaining = `Target met · ${blocksLeft} ${blockWord} left`;
  else remaining = `${NUM.format(toGo)} kcal to go · ${blocksLeft} ${blockWord} left`;

  // First paint of this page load gets the count-up; everything after —
  // a remount from switching tabs, a block ticked mid-visit — just shows
  // the number, matching how it behaved before pass 45's CountUp landed.
  const playCountUp = !kcalCountUpPlayed;
  useEffect(() => {
    kcalCountUpPlayed = true;
  }, []);

  return (
    <div className="card daytotal">
      <div className="daytotal__figure">
        {playCountUp ? (
          <CountUp
            to={totals.kcal}
            duration={0.25}
            separator=","
            className={`daytotal__kcal ${STATUS_CLASS[status]}`}
          />
        ) : (
          <span className={`daytotal__kcal ${STATUS_CLASS[status]}`}>{NUM.format(totals.kcal)}</span>
        )}
        <span className="daytotal__target">/ {NUM.format(target.kcal)} kcal</span>
      </div>
      <DayBar kcal={totals.kcal} targetKcal={target.kcal} status={status} />
      {overviewMetricShown(profile, "remaining") ? <p className="daytotal__remaining">{remaining}</p> : null}
      {overviewMetricShown(profile, "protein") ? (
        <p className="daytotal__protein">Protein {Math.round(totals.proteinG)} / {target.proteinG} g</p>
      ) : null}
    </div>
  );
}

/**
 * A quiet nudge, shown only from today's view, only when yesterday was opened
 * and left part-done. A day never touched yesterday is left alone — this catches
 * a forgotten evening block, it doesn't ask you to reconstruct a blank day.
 */
function BackfillPrompt({ viewDate, setViewDate, setOpenPicker }) {
  if (viewDate !== todayISO()) return null;
  const yesterday = addDays(todayISO(), -1);
  const record = getDay(yesterday);
  if (!record) return null;
  const totals = dayTotals(record);
  if (totals.planDone >= totals.total) return null;
  return (
    <button
      className="backfill"
      type="button"
      onClick={() => {
        setViewDate(yesterday);
        setOpenPicker(null);
      }}
    >
      Yesterday — {totals.planDone} of {totals.total} blocks. Tap to finish.
    </button>
  );
}

function Checklist({ day, editable, openPicker, setOpenPicker, setAddOpen, commit }) {
  const rows = [
    ...activeBlocks(dayAddOns(day)).map((block) => ({ block, bonus: false })),
    ...dayBonus(day)
      .map(blockById)
      .filter(Boolean)
      .map((block) => ({ block, bonus: true })),
  ].sort((a, b) => a.block.order - b.block.order);

  // Time-of-day cue — today only. The "now" row is the last one whose nominal
  // time has arrived; rows above it recede, rows below are still to come. Before
  // the first block's time, nothing is "now" and every row is upcoming.
  // Typography and weight only — never a red "overdue" (insight_copy_states_facts).
  const live = day.date === todayISO();
  const now = live ? nowHHMM() : null;
  let nowIdx = -1;
  if (live) {
    rows.forEach(({ block }, i) => {
      if (block.time && block.time <= now) nowIdx = i;
    });
  }

  return (
    <ul className="checklist">
      {rows.map(({ block, bonus }, i) => {
        const timeState = !live ? "plain" : i < nowIdx ? "past" : i === nowIdx ? "now" : "upcoming";
        return (
          <BlockRow
            key={block.id}
            day={day}
            block={block}
            editable={editable}
            bonus={bonus}
            timeState={timeState}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            setAddOpen={setAddOpen}
            commit={commit}
          />
        );
      })}
    </ul>
  );
}

function BlockRow({ day, block, editable, bonus, timeState, openPicker, setOpenPicker, setAddOpen, commit }) {
  const done = Boolean(day.completed[block.id]);
  const kcal = blockValue(day, block.id).kcal;
  const pickerOpen = openPicker === block.id;
  // Called for every block every render (unlike RotationPicker below, which
  // only renders for the one that's open) so a closed block's key clears
  // reliably — see justOpened()'s own note on why that matters.
  const pickerJustOpened = justOpened(`today.picker.${block.id}`, pickerOpen);
  // The cue is a today-only affordance: the nominal time sits after the block
  // name as a quiet chip. The current block used to read "now" here, but that
  // word crowded the name off a phone row — it's marked by a coral edge on the
  // row instead (block-row--now). Nothing on a past day being reviewed
  // (timeState "plain"), and nothing for a hand-added bonus block with no time.
  const timeText = timeState === "plain" || !block.time ? null : fmtTime(block.time);

  return (
    <li
      className={
        "block-row" +
        (done ? " is-done" : "") +
        (bonus ? " block-row--bonus" : "") +
        (timeState === "past" ? " block-row--past" : "") +
        (timeState === "now" ? " block-row--now" : "")
      }
    >
      <div className="block-row__lead">
        <button
          className="block-row__main"
          type="button"
          disabled={!editable}
          aria-pressed={String(done)}
          onClick={editable ? () => commit(toggleBlock(day, block.id)) : undefined}
        >
          <span className={`block-row__tick ${done ? "is-done" : ""}`}>
            {done ? <Icon name="check" size={14} stroke={2.5} /> : null}
          </span>
          <span className="block-row__body">
            <span className="block-row__name">
              <span className="block-row__label">{block.name}</span>
              {timeText ? <span className="block-row__time">{timeText}</span> : null}
              {bonus ? <span className="block-row__tag">bonus</span> : null}
            </span>
            <span className="block-row__desc">{resolveDesc(day, block)}</span>
          </span>
          <span className="block-row__kcal">
            {NUM.format(kcal)}
            <span className="block-row__unit">kcal</span>
          </span>
        </button>
        {block.rotation && editable ? (
          <button
            className="block-row__swap"
            type="button"
            onClick={() => setOpenPicker(pickerOpen ? null : block.id)}
          >
            {pickerOpen ? "Close" : "Swap"}
          </button>
        ) : null}
        {editable && ADDON_IDS.includes(block.id) ? (
          <button
            className="block-row__drop"
            type="button"
            aria-label={`Remove ${block.name}`}
            onClick={() => {
              setOpenPicker(null);
              setAddOpen(false);
              commit(removeBlock(day, block.id));
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      {block.rotation && pickerOpen && editable ? (
        <RotationPicker day={day} block={block} justOpenedNow={pickerJustOpened} setOpenPicker={setOpenPicker} commit={commit} />
      ) : null}
    </li>
  );
}

function RotationPicker({ day, block, justOpenedNow, setOpenPicker, commit }) {
  const current = day.rotations[block.rotation];
  return (
    <div className={`rotation${justOpenedNow ? " is-entering" : ""}`}>
      {rotationOptions(block.rotation).map((opt) => (
        <button
          key={opt.id}
          className={`rotation__opt${opt.id === current ? " is-picked" : ""}`}
          type="button"
          onClick={() => {
            setOpenPicker(null);
            commit(chooseRotation(day, block.rotation, opt.id));
          }}
        >
          <span className="rotation__radio" aria-hidden="true">{opt.id === current ? "●" : "○"}</span>
          <span className="rotation__opt-desc">{opt.desc}</span>
          <span className="rotation__opt-kcal">{NUM.format(opt.kcal)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * The "add a block" affordance under the checklist: the add-ons not already on
 * the day, each with its kcal, in a recessed panel in the rotation-picker
 * register. Adding a phase default the user dropped restores it to the plan;
 * adding anything else makes it a bonus block (kcal only). See day.addBlock.
 */
function AddBlockSection({ day, addOpen, setAddOpen, commit }) {
  const onDay = new Set([...dayAddOns(day), ...dayBonus(day)]);
  const available = ADDON_IDS.filter((id) => !onDay.has(id))
    .map(blockById)
    .filter(Boolean);
  if (!available.length) return null;
  const justOpenedNow = justOpened("today.addOpen", addOpen);
  return (
    <div className="addblock">
      <button className="addblock__trigger" type="button" onClick={() => setAddOpen(!addOpen)}>
        <span className="addblock__icon" aria-hidden="true">
          <Icon name={addOpen ? "minus" : "plus"} size={12} stroke={2} />
        </span>
        {addOpen ? "Close" : "Add a block"}
      </button>
      {addOpen ? (
        <div className={`rotation addblock__panel${justOpenedNow ? " is-entering" : ""}`}>
          {available.map((block) => (
            <button
              key={block.id}
              className="rotation__opt"
              type="button"
              onClick={() => {
                setAddOpen(false);
                commit(addBlock(day, block.id));
              }}
            >
              <span className="rotation__radio" aria-hidden="true">+</span>
              <span className="rotation__opt-desc">{block.name}</span>
              <span className="rotation__opt-kcal">{NUM.format(blockValue(day, block.id).kcal)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Off-plan food logged against the viewed day (pass 25). Renders under the
 * checklist: a list of what's already logged, each removable. The "+ Log
 * food" trigger sits in the actions strip beside "+ Add a block"; with
 * nothing logged there is nothing to draw here, and the strip carries the
 * affordance.
 */
function ExtrasSection({ day, editable, commit }) {
  const extras = dayExtras(day);
  if (!extras.length) return null;
  // The set of name keys already in the recipe book — so an extra that's
  // already saved doesn't offer "Save" again (saveRecipe would just update it,
  // but the affordance would be noise). Built once, not per row.
  const savedKeys = editable ? new Set(allRecipes().map((r) => recipeKey(r.name))) : null;
  return (
    <div className="extras">
      <ul className="extras__list">
        {extras.map((extra) => (
          <ExtraRow key={extra.id} day={day} extra={extra} editable={editable} savedKeys={savedKeys} commit={commit} />
        ))}
      </ul>
    </div>
  );
}

function ExtraRow({ day, extra, editable, savedKeys, commit }) {
  const canSave = editable && savedKeys && !savedKeys.has(recipeKey(extra.name));
  return (
    <li className="extras__row">
      <span className="extras__name">{extra.name}</span>
      <span className="block-row__kcal">
        {NUM.format(extra.kcal)}
        <span className="block-row__unit">kcal</span>
      </span>
      {canSave ? (
        <button
          // The recessed strip from the rotation Swap control — same register
          // as the other secondary row action, so the row doesn't grow a
          // third visual language.
          className="block-row__swap extras__save"
          type="button"
          aria-label={`Save ${extra.name} to the recipe book`}
          onClick={(event) => {
            saveRecipe({ name: extra.name, kcal: extra.kcal, proteinG: extra.proteinG });
            // A write that didn't land gets no "Saved"; the banner says why.
            if (!allRecipes().some((r) => recipeKey(r.name) === recipeKey(extra.name))) return;
            // No re-render: the day didn't change. Acknowledge in place, the
            // way Settings' export button does. The next render drops the
            // button anyway (savedKeys will contain it now).
            const btn = event.currentTarget;
            btn.textContent = "Saved";
            btn.disabled = true;
          }}
        >
          Save
        </button>
      ) : null}
      {editable ? (
        <button
          className="block-row__drop"
          type="button"
          aria-label={`Remove ${extra.name}`}
          onClick={() => commit(removeExtra(day, extra.id))}
        >
          ×
        </button>
      ) : null}
    </li>
  );
}

/**
 * The per-day appetite check: three chips under a quiet label, low on the
 * screen. Optional and never nagged — no prompt, and no red state for a day
 * left blank. Tapping the picked chip again clears it (see day.setAppetite).
 */
function AppetiteSection({ day, commit }) {
  const current = day.appetite;
  return (
    <div className="appetite">
      <GroupLabel icon="gauge" tag="p">Appetite</GroupLabel>
      <div
        // Not role="radiogroup"/"radio": tapping the picked chip again clears
        // it (see day.setAppetite), so this can legitimately have none picked —
        // a state a radio group can't represent once one has been checked.
        // Grouped as plain toggle buttons instead, matching Settings' .seg.
        className="appetite__chips"
        role="group"
        aria-label="Appetite"
      >
        {APPETITE_VALUES.map((value) => (
          <button
            key={value}
            className={`appetite__chip${value === current ? " is-picked" : ""}`}
            type="button"
            aria-pressed={String(value === current)}
            onClick={() => commit(setAppetite(day, value))}
          >
            {APPETITE_LABEL[value]}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- helpers ---------------------------------------------------------------

/** Local clock as "HH:MM", to compare against a block's nominal `time`. */
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The description to show for a block — the chosen rotation option's, if any. */
function resolveDesc(day, block) {
  if (block.rotation) {
    const opt = rotationOptions(block.rotation).find((o) => o.id === day.rotations[block.rotation]);
    if (opt) return opt.desc;
  }
  return block.desc;
}

/** "Thursday 28 August" for a header, from a local ISO date. */
function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
