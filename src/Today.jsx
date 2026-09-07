/**
 * Today.jsx — the daily checklist, converted from today.js (pass 45's
 * fourth screen, and the biggest one). Shows the blocks active for the
 * viewed day's phase, in time-of-day order, plus off-plan food, the recipe
 * book, and the appetite check.
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
 * Two vanilla widgets remain as-is: `dateCalendar()` (the day-strip's
 * calendar popover) and `listbox()` (the food/ingredient picker). Same
 * reasoning as Weight.jsx's entry card — small, correct, self-contained —
 * rebuilt fresh every render and mounted with the same `Imperative` adapter.
 *
 * The hero kcal figure in `TotalCard` uses reactbits.dev's `CountUp`
 * (`src/components/reactbits/CountUp.jsx`) — the text/number effect
 * pass-45-plan.md called for landing here, once this screen went React. It
 * animates on mount and re-animates smoothly whenever the total changes
 * (ticking a block, logging food), rather than the figure just snapping.
 */

import { useEffect, useRef, useState } from "react";
import { justOpened, announce } from "./js/ui/dom.js";
import CountUp from "./components/reactbits/CountUp.jsx";
import { iconSvg } from "./js/ui/icons.js";
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
import { dayExtras, addExtra, removeExtra } from "./js/core/extras.js";
import {
  allRecipes,
  getRecipe,
  saveRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  touchRecipe,
  recipeKey,
  recipeTotals,
} from "./js/core/recipes.js";
import { getDay, putDay, allDays } from "./js/core/days.js";
import { whatsNewSeen, markWhatsNewSeen } from "./js/core/whatsnew.js";
import { dateCalendar } from "./js/ui/date-calendar.js";
import { listbox } from "./js/ui/listbox.js";
import { allWeights } from "./js/core/weights.js";
import { weeklyWeights, weeklyGains, rollingGain, weeklyAdherence } from "./js/core/trend.js";
import { evaluate, applySuggestion } from "./js/core/adjust.js";
import { todayISO, addDays, planWeek, daysBetween } from "./js/core/dates.js";
import { publish, subscribe } from "./js/core/broadcast.js";

const NUM = new Intl.NumberFormat("en-US"); // 1,890

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

/** Same dual-mode design as App.jsx's / Settings.jsx's `Icon` — see either. */
function Icon({ name, size, stroke, className }) {
  const html = { __html: iconSvg(name, { size, stroke }) };
  if (className) return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={html} />;
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={html} />;
}

function GroupLabel({ icon: glyph, children, tag: Tag = "span" }) {
  return (
    <Tag className="group__label">
      {glyph ? <Icon name={glyph} size={14} className="group__label-icon" /> : null}
      {children}
    </Tag>
  );
}

function EmptyState({ glyph, line }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon name={glyph} size={32} />
      </span>
      <p className="empty__line">{line}</p>
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
        <ExtrasSection day={day} editable={editable} />
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

/** Tell a screen reader the one fact that changed — the new total — rather
 * than the whole re-render. Shares TotalCard's own wording. */
function announceDayTotal(day) {
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId);
  const toGo = Math.max(0, target.kcal - totals.kcal);
  const blocksLeft = Math.max(0, totals.total - totals.planDone);
  const blockWord = blocksLeft === 1 ? "block" : "blocks";
  let remaining;
  if (blocksLeft === 0 && toGo === 0) remaining = "All done.";
  else if (toGo === 0) remaining = `Target met, ${blocksLeft} ${blockWord} left.`;
  else remaining = `${NUM.format(toGo)} kcal to go, ${blocksLeft} ${blockWord} left.`;
  announce(`${NUM.format(totals.kcal)} of ${NUM.format(target.kcal)} kcal. ${remaining}`);
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

  return (
    <div className="card daytotal">
      <div className="daytotal__figure">
        <CountUp
          to={totals.kcal}
          duration={0.25}
          separator=","
          className={`daytotal__kcal ${STATUS_CLASS[status]}`}
        />
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
function ExtrasSection({ day, editable }) {
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
          <ExtraRow key={extra.id} day={day} extra={extra} editable={editable} savedKeys={savedKeys} />
        ))}
      </ul>
    </div>
  );
}

function ExtraRow({ day, extra, editable, savedKeys }) {
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

// this file's ExtraRow above needs `commit` in scope — see call site below,
// which passes it through instead of leaving it a free variable.

/** The "+ Log food" trigger and its panel — closed by default, same register
 *  as AddBlockSection's "+ Add a block". Behind the toggle: the recipe book,
 *  the FOOD_DB list, and quick-type. The Recipes tab is always present (pass
 *  28 — it's the way in to the recipe editor, even with an empty book). */
function ExtrasAddPanel({ day, extrasOpen, setExtrasOpen, extrasState, commit }) {
  const modes = ["recipe", "pick", "type"];
  const { extrasMode, extrasModeTouched } = extrasState;
  // First open this visit defaults to the book when it has anything — a repeat
  // meal is the common case and should be one tap; otherwise the food list.
  const activeMode = !extrasModeTouched && allRecipes().length
    ? "recipe"
    : modes.includes(extrasMode)
      ? extrasMode
      : "pick";

  return (
    <div className="addblock">
      <button className="addblock__trigger" type="button" onClick={() => setExtrasOpen(!extrasOpen)}>
        <span className="addblock__icon" aria-hidden="true">
          <Icon name={extrasOpen ? "minus" : "plus"} size={12} stroke={2} />
        </span>
        {extrasOpen ? "Close" : "Log food"}
      </button>
      {extrasOpen ? (
        <div className="addblock__panel extras__panel">
          <ExtrasModeToggle modes={modes} activeMode={activeMode} extrasState={extrasState} />
          {activeMode === "recipe" ? (
            <ExtrasRecipeForm day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
          ) : activeMode === "pick" ? (
            <ExtrasPickForm day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
          ) : (
            <ExtrasTypeForm day={day} setExtrasOpen={setExtrasOpen} commit={commit} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ExtrasModeToggle({ modes, activeMode, extrasState }) {
  const label = { recipe: "Recipes", pick: "Foods", type: "Custom" };
  const { setExtrasMode, setExtrasModeTouched, setRecipeEditor, setRecipeEditorError } = extrasState;
  return (
    <div className="seg extras__modeseg">
      {modes.map((mode) => (
        <button
          key={mode}
          className={`seg__btn${activeMode === mode ? " is-on" : ""}`}
          type="button"
          onClick={() => {
            if (activeMode === mode) return;
            setExtrasMode(mode);
            setExtrasModeTouched(true);
            // Leaving the Recipes tab drops any half-finished editor.
            setRecipeEditor(null);
            setRecipeEditorError(null);
          }}
        >
          {label[mode]}
        </button>
      ))}
    </div>
  );
}

// --- the recipe book (Recipes tab) --------------------------------------

/** The Recipes tab: the editor when one is open (pass 28), else the insert
 *  list with a "New recipe" trigger above it. */
function ExtrasRecipeForm({ day, extrasState, setExtrasOpen, commit }) {
  return extrasState.recipeEditor ? (
    <RecipeEditorPanel extrasState={extrasState} />
  ) : (
    <RecipeList day={day} extrasState={extrasState} setExtrasOpen={setExtrasOpen} commit={commit} />
  );
}

// A book past this size is worth filtering; below it, most-used-first already
// carries the whole list.
const RECIPE_FILTER_THRESHOLD = 8;

/**
 * The book as an insert list: one tap on a row logs that recipe as an extra on
 * the day and bumps its recency (touchRecipe) so the book stays ordered by
 * what's actually eaten. "Edit" opens the editor (where delete also lives, so
 * a destructive tap isn't sitting on every row). Rows reuse .extras__row so a
 * saved recipe and a logged extra read the same.
 */
function RecipeList({ day, extrasState, setExtrasOpen, commit }) {
  const { setRecipeEditor, setRecipeEditorError, setRecipeDeleteConfirming } = extrasState;
  const recipes = allRecipes();
  const showFilter = recipes.length > RECIPE_FILTER_THRESHOLD;
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const visible = q === "" ? recipes : recipes.filter((r) => r.name.toLowerCase().includes(q));

  function openEditor(id) {
    setRecipeEditorError(null);
    setRecipeDeleteConfirming(false);
    if (id == null) {
      setRecipeEditor({ id: null, name: "", items: [], addMode: "pick", addFoodId: null });
    } else {
      const recipe = getRecipe(id);
      if (!recipe) return;
      setRecipeEditor({
        id: recipe.id,
        name: recipe.name,
        items: (recipe.items ?? []).map((it) => ({ ...it })),
        addMode: "pick",
        addFoodId: null,
      });
    }
  }

  return (
    <div className="extras__recipes">
      <button className="addblock__trigger" type="button" onClick={() => openEditor(null)}>
        <span className="addblock__icon" aria-hidden="true">+</span>
        New recipe
      </button>
      {showFilter ? (
        <div className="field extras__recipe-filter">
          <div className="field__control">
            <input
              className="field__input"
              type="text"
              placeholder="Filter recipes"
              aria-label="Filter recipes"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      {recipes.length ? (
        visible.map((recipe) => (
          <RecipePickRow key={recipe.id} day={day} recipe={recipe} setExtrasOpen={setExtrasOpen} commit={commit} openEditor={openEditor} />
        ))
      ) : (
        <EmptyState glyph="book-open" line="No saved recipes yet. Build one above, or save a food you've logged." />
      )}
    </div>
  );
}

function RecipePickRow({ day, recipe, setExtrasOpen, commit, openEditor }) {
  return (
    <div className="extras__row extras__pick-row">
      <button
        className="extras__pick"
        type="button"
        onClick={() => {
          setExtrasOpen(false);
          touchRecipe(recipe.id);
          commit(addExtra(day, { name: recipe.name, kcal: recipe.kcal, proteinG: recipe.proteinG }));
        }}
      >
        <span className="extras__name">{recipe.name}</span>
        <span className="block-row__kcal">
          {NUM.format(recipe.kcal)}
          <span className="block-row__unit">kcal</span>
        </span>
      </button>
      <button className="block-row__swap extras__edit" type="button" aria-label={`Edit ${recipe.name}`} onClick={() => openEditor(recipe.id)}>
        Edit
      </button>
    </div>
  );
}

/**
 * The recipe editor (pass 28): a name field, the working ingredient list, an
 * add-ingredient sub-form (pick from FOOD_DB or quick-type, mirroring the
 * extras entry), and the running total. Save routes to createRecipe (new) or
 * updateRecipe (existing, which also renames). Delete only shows when editing
 * an existing recipe.
 */
function RecipeEditorPanel({ extrasState }) {
  const {
    recipeEditor: ed,
    setRecipeEditor,
    recipeEditorError,
    setRecipeEditorError,
    recipeDeleteConfirming,
    setRecipeDeleteConfirming,
  } = extrasState;
  const totals = recipeTotals(ed.items);
  const deleteConfirmJustOpened = justOpened("today.recipeDelete", recipeDeleteConfirming);
  const canSave = Boolean(ed.name.trim()) && ed.items.length > 0;

  function addItem(item) {
    setRecipeEditor((prev) => ({ ...prev, items: [...prev.items, item] }));
    setRecipeEditorError(null);
  }

  function removeItem(index) {
    setRecipeEditor((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setRecipeEditorError(null);
  }

  function save() {
    const result = ed.id == null
      ? createRecipe({ name: ed.name, items: ed.items })
      : updateRecipe(ed.id, { name: ed.name, items: ed.items });
    if (!result) {
      setRecipeEditorError(
        ed.id != null
          ? `Couldn't save — another recipe may already be called "${ed.name.trim()}".`
          : "Couldn't save — give it a name and at least one ingredient.",
      );
      return;
    }
    setRecipeEditor(null);
    setRecipeEditorError(null);
  }

  function close() {
    setRecipeEditor(null);
    setRecipeEditorError(null);
    setRecipeDeleteConfirming(false);
  }

  return (
    <div className="recipe-editor">
      <div className="field">
        <span className="field__label">Name</span>
        <div className="field__control">
          <input
            className="field__input"
            type="text"
            value={ed.name}
            placeholder="e.g. Morning shake"
            maxLength={60}
            onChange={(e) => setRecipeEditor((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
      </div>
      <div className="recipe-editor__items">
        {ed.items.length ? (
          ed.items.map((item, i) => <RecipeItemRow key={i} item={item} onRemove={() => removeItem(i)} />)
        ) : (
          <p className="field__hint">Add an ingredient below.</p>
        )}
      </div>
      <p className="recipe-editor__total">
        Total {NUM.format(Math.round(totals.kcal))} kcal · {Math.round(totals.proteinG)} g protein
      </p>
      <div className="recipe-editor__add">
        <RecipeAddModeToggle extrasState={extrasState} />
        {ed.addMode === "pick" ? (
          <RecipeAddPickForm extrasState={extrasState} onAdd={addItem} />
        ) : (
          <RecipeAddTypeForm onAdd={addItem} />
        )}
      </div>
      {recipeEditorError ? <p className="recipe-editor__error">{recipeEditorError}</p> : null}
      <div className="recipe-editor__actions">
        <button className="btn btn--primary btn--full" type="button" disabled={!canSave} onClick={save}>
          {ed.id == null ? "Save recipe" : "Save changes"}
        </button>
        <button className="btn btn--text" type="button" onClick={close}>
          Cancel
        </button>
        {ed.id != null && !recipeDeleteConfirming ? (
          <button
            className="btn btn--text recipe-editor__delete"
            type="button"
            onClick={() => setRecipeDeleteConfirming(true)}
          >
            Delete recipe
          </button>
        ) : null}
      </div>
      {ed.id != null && recipeDeleteConfirming ? (
        <RecipeDeleteConfirm ed={ed} justOpenedNow={deleteConfirmJustOpened} onCancel={() => setRecipeDeleteConfirming(false)} onClose={close} />
      ) : null}
    </div>
  );
}

/**
 * Delete's own two-step, reusing Settings' .set-confirm rather than the
 * rejected undo-toast pattern — a recipe is real effort to rebuild and this is
 * the app's only unconfirmed destructive tap outside Settings.
 */
function RecipeDeleteConfirm({ ed, justOpenedNow, onCancel, onClose }) {
  return (
    <div className={`set-confirm${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-confirm__title">Delete "{ed.name.trim() || "this recipe"}"?</p>
      <p className="set-confirm__body">This cannot be undone.</p>
      <div className="set-confirm__actions">
        <button
          className="btn btn--danger"
          type="button"
          onClick={() => {
            deleteRecipe(ed.id);
            onClose();
          }}
        >
          Delete recipe
        </button>
        <button className="btn btn--text" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RecipeItemRow({ item, onRemove }) {
  return (
    <div className="extras__row recipe-editor__item">
      <span className="extras__name">{item.name}</span>
      <span className="block-row__kcal">
        {NUM.format(Math.round(Number(item.kcal) || 0))}
        <span className="block-row__unit">kcal</span>
      </span>
      <button className="block-row__drop" type="button" aria-label={`Remove ${item.name}`} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

function RecipeAddModeToggle({ extrasState }) {
  const { recipeEditor: ed, setRecipeEditor } = extrasState;
  return (
    <div className="seg extras__modeseg">
      {[
        ["pick", "Foods"],
        ["type", "Custom"],
      ].map(([mode, label]) => (
        <button
          key={mode}
          className={`seg__btn${ed.addMode === mode ? " is-on" : ""}`}
          type="button"
          onClick={() => {
            if (ed.addMode === mode) return;
            setRecipeEditor((prev) => ({ ...prev, addMode: mode }));
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * A shared food/ingredient picker: the `listbox()` vanilla widget over
 * FOOD_DB, a kcal/protein hint, and an Add button. Used both by the extras
 * "Foods" tab and the recipe editor's "Foods" add-mode — they differ only in
 * where the picked id lives and what a tap on Add actually does.
 */
function PickForm({ label, foodId, onFoodChange, buttonClass, buttonLabel, onAdd }) {
  const effectiveId = foodId != null && FOOD_DB.some((f) => f.id === foodId) ? foodId : (FOOD_DB[0]?.id ?? null);
  const food = FOOD_DB.find((f) => f.id === effectiveId) ?? null;
  const lb = listbox({
    options: FOOD_DB.map((f) => ({ value: f.id, label: `${f.name} — ${f.portion}` })),
    value: effectiveId,
    ariaLabel: label,
    // Re-render so the kcal/protein hint and the Add button's captured food
    // follow the new pick — same as the calendar popover's onChange.
    onChange: onFoodChange,
  });

  return (
    <div className="extras__form">
      <div className="field">
        <span className="field__label">{label}</span>
        <Imperative node={lb.node} />
      </div>
      {food ? (
        <p className="field__hint">{NUM.format(food.kcal)} kcal · {Math.round(food.proteinG)} g protein</p>
      ) : null}
      <button className={buttonClass} type="button" disabled={!food} onClick={() => food && onAdd(food)}>
        {buttonLabel}
      </button>
    </div>
  );
}

function RecipeAddPickForm({ extrasState, onAdd }) {
  const { recipeEditor: ed, setRecipeEditor } = extrasState;
  return (
    <PickForm
      label="Ingredient"
      foodId={ed.addFoodId}
      onFoodChange={(v) => setRecipeEditor((prev) => ({ ...prev, addFoodId: v }))}
      buttonClass="btn btn--secondary btn--full"
      buttonLabel="Add ingredient"
      onAdd={(food) => onAdd({ name: food.name, kcal: food.kcal, proteinG: food.proteinG })}
    />
  );
}

/** Pick a FOOD_DB entry through the existing listbox control; its kcal /
 *  protein come along unedited, so this path is one tap once a food is
 *  chosen. */
function ExtrasPickForm({ day, extrasState, setExtrasOpen, commit }) {
  const { extrasFoodId, setExtrasFoodId } = extrasState;
  return (
    <PickForm
      label="Food"
      foodId={extrasFoodId}
      onFoodChange={setExtrasFoodId}
      buttonClass="btn btn--primary btn--full"
      buttonLabel="Add"
      onAdd={(food) => {
        setExtrasOpen(false);
        commit(addExtra(day, { name: food.name, kcal: food.kcal, proteinG: food.proteinG }));
      }}
    />
  );
}

/**
 * A shared quick-type form: name, kcal, protein by hand. Add stays disabled
 * until a name is typed — kcal/protein of "" sanitise to 0 at the call site,
 * a fine default for something like a black coffee.
 */
function TypeForm({ label, placeholder, buttonClass, buttonLabel, onAdd }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");

  return (
    <div className="extras__form">
      <div className="field">
        <span className="field__label">{label}</span>
        <div className="field__control">
          <input
            className="field__input"
            type="text"
            placeholder={placeholder}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="extras__row-fields">
        <div className="field">
          <span className="field__label">Kcal</span>
          <div className="field__control">
            <input
              className="field__input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="0"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <span className="field__label">Protein (g)</span>
          <div className="field__control">
            <input
              className="field__input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="0"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
        </div>
      </div>
      <button className={buttonClass} type="button" disabled={!name.trim()} onClick={() => onAdd({ name, kcal, proteinG: protein })}>
        {buttonLabel}
      </button>
    </div>
  );
}

function RecipeAddTypeForm({ onAdd }) {
  return (
    <TypeForm label="Ingredient" placeholder="e.g. Honey" buttonClass="btn btn--secondary btn--full" buttonLabel="Add ingredient" onAdd={onAdd} />
  );
}

/** Quick-type a one-off item by hand. */
function ExtrasTypeForm({ day, setExtrasOpen, commit }) {
  return (
    <TypeForm
      label="Food"
      placeholder="e.g. Chocolate bar"
      buttonClass="btn btn--primary btn--full"
      buttonLabel="Add"
      onAdd={(item) => {
        setExtrasOpen(false);
        commit(addExtra(day, item));
      }}
    />
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

/** "08:00" -> "8am", "13:30" -> "1:30pm" — a compact time-of-day label. */
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
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
