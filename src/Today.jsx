/**
 * Today.jsx — the day's blocks, built on the v3.0 tracking components (pass
 * 67). From the top on a phone: the seven-day dot strip, a banner when one
 * applies (yesterday unfinished, a closed day), the day total on its horizon,
 * then the block list with the now marker and the due card, the Log food and
 * Add a block buttons, and the appetite chips. On desktop the screen splits
 * into `.r-columns`: the total and the list in the main column; the seven
 * days, the two buttons and Appetite in the 340px support column.
 *
 * The sheets (Log food, Swap, Add a block, Calendar) live in LogFood.jsx. A
 * tick, a log or an add shows a toast with Undo, which puts the day back as
 * it was.
 *
 * Time on today is emphasis only: the latest unticked block whose time has
 * come is the due card, and earlier unticked blocks recede but stay tappable.
 * Nothing is ever red for a missed block.
 */

import { useEffect, useRef, useState } from "react";
import { loadProfile, overviewMetricShown } from "./js/core/profile.js";
import {
  activeBlocks,
  blockById,
  phaseTarget,
  defaultPhaseForWeek,
  phaseAddOns,
  ADDON_IDS,
  FOOD_DB,
} from "./js/core/plan.js";
import {
  newDay,
  toggleBlock,
  blockValue,
  dayTotals,
  dayAddOns,
  dayBonus,
  setAppetite,
  APPETITE_VALUES,
  intakeStatus,
  isDayEditable,
} from "./js/core/day.js";
import { dayExtras, removeExtra } from "./js/core/extras.js";
import { getDay, putDay, allDays } from "./js/core/days.js";
import { whatsNewSeen, markWhatsNewSeen } from "./js/core/whatsnew.js";
import { mostSkippedBlock } from "./js/core/trend.js";
import { todayISO, addDays, planWeek } from "./js/core/dates.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import { NUM } from "./components/shared.jsx";
import { useWide } from "./components/useWide.js";
import { Button, Card, Chip } from "./components/core.jsx";
import { Banner, Toast } from "./components/surfaces.jsx";
import {
  StatusDot,
  DotStrip,
  DayTotal,
  BlockList,
  BlockRow,
  NowMarker,
  DueCard,
} from "./components/tracking.jsx";
import {
  LogFoodSheet,
  SwapSheet,
  AddBlockSheet,
  CalendarSheet,
  announceDayTotal,
  nowHHMM,
  resolveDesc,
  longDate,
} from "./LogFood.jsx";

// The appetite check labels, in tap order. Keys are APPETITE_VALUES.
const APPETITE_LABEL = { stuffed: "Stuffed", fine: "Fine", hungry: "Hungry" };

// The dot strip is the last week at a glance. Older days are reached through
// the calendar, not by growing the strip.
const STRIP_DAYS = 7;

// How long a toast stays before it goes on its own.
const TOAST_MS = 4000;

export default function Today() {
  const paneRef = useRef(null);
  const wide = useWide();

  // `viewDate` is the day on screen: today, unless a dot, the calendar or the
  // backfill banner put an earlier one there.
  const [viewDate, setViewDate] = useState(todayISO());
  // The open sheet: null, "log", "add", "calendar" or { swap: blockId }.
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null); // { message, undo }
  const [extrasMode, setExtrasMode] = useState("pick"); // "recipe" | "pick" | "type"
  const [extrasModeTouched, setExtrasModeTouched] = useState(false);
  const [extrasFoodId, setExtrasFoodId] = useState(() => FOOD_DB[0]?.id ?? null);
  // The recipe editor (pass 28) inside Log food, or null.
  const [recipeEditor, setRecipeEditor] = useState(null);
  const [recipeEditorError, setRecipeEditorError] = useState(null);
  const [recipeDeleteConfirming, setRecipeDeleteConfirming] = useState(false);

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
  useEffect(
    () =>
      subscribe((fresh) => {
        if (!fresh.has("today")) bump((n) => n + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  function goToDate(iso) {
    setViewDate(iso);
    setSheet(null);
    setToast(null);
  }

  const profile = loadProfile();
  const day = loadViewDay(profile, viewDate);
  const editable = isDayEditable(day, todayISO());

  /** Persist a changed day and repaint; `message` shows a toast whose Undo puts `day` back. */
  function commit(nextDay, message) {
    const before = day;
    putDay(nextDay);
    announceDayTotal(nextDay);
    setToast(
      message
        ? {
            message,
            undo: () => {
              putDay(before);
              announceDayTotal(before);
              setToast(null);
              bump((n) => n + 1);
            },
          }
        : null,
    );
    bump((n) => n + 1);
  }

  function tick(blockId) {
    const block = blockById(blockId);
    const wasDone = Boolean(day.completed[blockId]);
    const kcal = blockValue(day, blockId).kcal;
    commit(
      toggleBlock(day, blockId),
      wasDone ? null : `${block.name} ticked · ${NUM.format(kcal)} kcal`,
    );
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

  const week = weekDays(profile, day.date);
  const closeSheet = () => setSheet(null);
  const openCalendar = () => setSheet("calendar");

  return (
    <div className="pane" data-screen="today" ref={paneRef}>
      <section className="r-today">
        <h1 className="sr-only">{day.date === todayISO() ? "Today" : longDate(day.date)}</h1>
        {whatsNewSeen() ? null : (
          <WhatsNewCard
            onDismiss={() => {
              markWhatsNewSeen();
              bump((n) => n + 1);
            }}
          />
        )}
        <div className="r-columns">
          <div className="r-today__main">
            <div className="r-today__strip">
              <DotStrip
                days={week.map((d) => ({
                  status: d.date === todayISO() ? "today" : (d.status ?? "none"),
                  selected: d.date === day.date,
                  label: d.label,
                }))}
                label={stripLabel(day.date)}
                onSelect={(i) => goToDate(week[i].date)}
                onCalendar={openCalendar}
              />
            </div>
            <DayBanner day={day} editable={editable} goToDate={goToDate} />
            <TotalCard day={day} profile={profile} />
            <Blocks
              day={day}
              editable={editable}
              onTick={tick}
              setSheet={setSheet}
              commit={commit}
            />
          </div>
          <aside className="r-today__support" aria-label="Day tools">
            <WeekCard week={week} viewed={day.date} goToDate={goToDate} onCalendar={openCalendar} />
            {editable ? (
              <div className="r-today__actions">
                <Button variant="secondary" onClick={() => setSheet("log")}>
                  + Log food
                </Button>
                <Button variant="secondary" onClick={() => setSheet("add")}>
                  + Add a block
                </Button>
              </div>
            ) : null}
            {editable ? <Appetite day={day} commit={commit} /> : null}
          </aside>
        </div>
      </section>
      {toast ? <Toast message={toast.message} onUndo={toast.undo} /> : null}
      {sheet === "log" ? (
        <LogFoodSheet
          day={day}
          dialog={wide}
          extrasState={extrasState}
          onClose={closeSheet}
          commit={commit}
        />
      ) : null}
      {sheet === "add" ? (
        <AddBlockSheet day={day} dialog={wide} onClose={closeSheet} commit={commit} />
      ) : null}
      {sheet?.swap ? (
        <SwapSheet
          day={day}
          blockId={sheet.swap}
          dialog={wide}
          onClose={closeSheet}
          commit={commit}
        />
      ) : null}
      {sheet === "calendar" ? (
        <CalendarSheet
          value={day.date}
          min={profile.startDate || todayISO()}
          max={todayISO()}
          dialog={wide}
          onPick={goToDate}
          onClose={closeSheet}
        />
      ) : null}
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

const STATUS_WORD = { "on-track": "on track", partial: "partial", low: "low" };

/**
 * The last seven days, oldest first, each with its intake status (null when
 * nothing was ticked or logged). Days before the plan started are left out.
 */
function weekDays(profile, viewed) {
  const today = todayISO();
  const start = profile.startDate || today;
  const out = [];
  for (let i = STRIP_DAYS - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    if (date < start) continue;
    const rec = getDay(date);
    const status = rec && dayTotals(rec).done > 0 ? intakeStatus(rec) : null;
    const word = date === today ? "today" : status ? STATUS_WORD[status] : "nothing logged";
    out.push({
      date,
      status,
      label: `${longDate(date)}, ${word}${date === viewed ? ", showing" : ""}`,
    });
  }
  return out;
}

/** "Wed 30" beside the dot strip. */
function stripLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short" });
  return `${wd} ${d}`;
}

/** "Phase 2 · Week 6", the eyebrow over the day total. */
function phaseLine(profile, day) {
  const week = planWeek(profile.startDate || day.date, day.date);
  return `Phase ${day.phaseId} · Week ${week}`;
}

// --- pieces --------------------------------------------------------------

/**
 * A one-time card for a device upgrading from v1.6 into v2 — see
 * core/whatsnew.js for why a first-run setup never sees this. Dismiss is
 * permanent; it names where each feature lives rather than describing it, in
 * keeping with insight_copy_states_facts. Restyled with first run (pass 72).
 */
function WhatsNewCard({ onDismiss }) {
  return (
    <div className="r-today__card">
      <Card>
        <p className="r-today__card-title">What&rsquo;s new in 2.0</p>
        <ul className="whatsnew__list">
          <li>Off-plan food and a recipe book — Log food, below the checklist.</li>
          <li>A weekly grocery checklist — the new Plan tab.</li>
          <li>Choose which numbers show on the day total — Settings → Overview.</li>
          <li>A wider layout on tablet and desktop.</li>
        </ul>
        <Button variant="secondary" size="sm" onClick={onDismiss}>
          Got it
        </Button>
      </Card>
    </div>
  );
}

/**
 * One banner under the strip at most. A closed day says so. On today,
 * yesterday left part-done says that, with a way to open it; a day never
 * touched is left alone, since this catches a forgotten evening block and
 * doesn't ask anyone to reconstruct a blank day.
 */
function DayBanner({ day, editable, goToDate }) {
  const today = todayISO();
  if (!editable) {
    return (
      <div className="r-today__banner">
        <Banner
          kind="closed"
          title="This day is closed."
          sub={`${longDate(day.date)} · view only`}
        />
      </div>
    );
  }
  if (day.date !== today) return null;
  const yesterday = addDays(today, -1);
  const rec = getDay(yesterday);
  if (!rec) return null;
  const totals = dayTotals(rec);
  if (totals.planDone >= totals.total) return null;
  const target = phaseTarget(rec.phaseId).kcal;
  return (
    <div className="r-today__banner">
      <Banner
        kind="backfill"
        title="Yesterday isn't finished"
        sub={`${stripLabel(yesterday)} · ${NUM.format(totals.kcal)} of ${NUM.format(target)} kcal`}
        action="Open"
        onAction={() => goToDate(yesterday)}
      />
    </div>
  );
}

/**
 * The day total. The kcal figure and its target always show; the remaining
 * line and the protein line are each behind a Settings toggle (pass 32,
 * profile.overviewMetrics).
 */
function TotalCard({ day, profile }) {
  const totals = dayTotals(day);
  const target = phaseTarget(day.phaseId);
  const status = totals.kcal === 0 ? "none" : intakeStatus(day);
  const closed = !isDayEditable(day, todayISO());
  const gap = target.kcal - totals.kcal;
  const left = Math.max(0, totals.total - totals.planDone);

  let remaining;
  if (gap <= 0) {
    remaining = (
      <>
        <b>{NUM.format(-gap)}</b> over target
      </>
    );
  } else {
    remaining = (
      <>
        <b>{NUM.format(gap)}</b>
        {closed ? " under target" : ` to go · ${left} block${left === 1 ? "" : "s"}`}
      </>
    );
  }

  return (
    <div className="r-today__total">
      <DayTotal
        eyebrow={
          <>
            <span className="r-today__date">{longDate(day.date)} · </span>
            {phaseLine(profile, day)}
          </>
        }
        kcal={totals.kcal}
        target={target.kcal}
        status={status}
        remaining={overviewMetricShown(profile, "remaining") ? remaining : null}
        protein={overviewMetricShown(profile, "protein") ? Math.round(totals.proteinG) : undefined}
        proteinTarget={target.proteinG}
      />
    </div>
  );
}

/**
 * The block list: the day's plan blocks, bonus blocks and logged food in time
 * order, with the now marker and the due card on today.
 */
function Blocks({ day, editable, onTick, setSheet, commit }) {
  const live = day.date === todayISO() && editable;
  const now = live ? nowHHMM() : null;

  const planned = [
    ...activeBlocks(dayAddOns(day)).map((block) => ({ block, bonus: false })),
    ...dayBonus(day)
      .map(blockById)
      .filter(Boolean)
      .map((block) => ({ block, bonus: true })),
  ].sort((a, b) => a.block.order - b.block.order);

  const items = [
    ...planned.map(({ block, bonus }) => ({ kind: "block", time: block.time, block, bonus })),
    ...dayExtras(day).map((extra) => ({ kind: "extra", time: extra.at ?? null, extra })),
  ];
  // Timed rows by the clock; untimed food (logged before pass 67) after them.
  items.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  const done = (it) => it.kind === "extra" || Boolean(day.completed[it.block.id]);
  const due = live
    ? [...items].reverse().find((it) => it.kind === "block" && !done(it) && it.time <= now)
    : null;
  // Tagged while it is still to come: a fact from the history, never a verdict.
  const skipped = live ? mostSkippedBlock(allDays())?.blockId : null;

  const rows = [];
  let nowPlaced = !live;
  const placeNow = () => {
    if (nowPlaced) return;
    rows.push(<NowMarker key="now" time={now} />);
    nowPlaced = true;
  };

  for (const it of items) {
    if (it.time && it.time > now) placeNow();
    if (it.kind === "extra") {
      const { extra } = it;
      rows.push(
        <BlockRow
          key={extra.id}
          time={extra.at ?? ""}
          name={extra.name}
          desc="Logged food"
          kcal={Math.round(extra.kcal)}
          protein={Math.round(extra.proteinG)}
          state="off"
          link={editable ? "Remove" : undefined}
          linkLabel={`Remove ${extra.name}`}
          onLink={() => commit(removeExtra(day, extra.id))}
        />,
      );
      continue;
    }
    const { block, bonus } = it;
    const value = blockValue(day, block.id);
    const isDone = done(it);
    const addOn = ADDON_IDS.includes(block.id);
    if (due && block.id === due.block.id) {
      placeNow();
      rows.push(
        <DueCard
          key={block.id}
          label={[
            `Due now · ${block.time}`,
            bonus ? "Bonus" : addOn ? "Add-on" : null,
            block.id === skipped ? "Most skipped" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          name={block.name}
          desc={resolveDesc(day, block)}
          kcal={value.kcal}
          protein={Math.round(value.proteinG)}
          swappable={Boolean(block.rotation)}
          onTick={() => onTick(block.id)}
          onSwap={() => setSheet({ swap: block.id })}
        />,
      );
      continue;
    }
    const receded = live && !isDone && block.time < now;
    const state = !editable
      ? isDone
        ? "closedDone"
        : "closed"
      : isDone
        ? "done"
        : receded
          ? "receded"
          : "idle";
    const upcoming = state === "idle";
    rows.push(
      <BlockRow
        key={block.id}
        time={block.time}
        name={block.name}
        desc={resolveDesc(day, block)}
        kcal={value.kcal}
        protein={Math.round(value.proteinG)}
        state={state}
        tag={
          bonus
            ? "bonus"
            : addOn
              ? "add-on"
              : upcoming && block.id === skipped
                ? "most skipped"
                : undefined
        }
        tagEmphasis={!bonus && !addOn && block.id === skipped}
        link={block.rotation && upcoming ? "Swap" : undefined}
        linkLabel={`Swap ${block.name}`}
        onLink={() => setSheet({ swap: block.id })}
        onToggle={editable ? () => onTick(block.id) : undefined}
      />,
    );
  }
  placeNow();

  return (
    <div className="r-today__blocks">
      <BlockList>{rows}</BlockList>
    </div>
  );
}

/**
 * The seven days as a card, for the desktop support column: weekday, dot and
 * date for each, the Calendar button and the legend. The phone shows the same
 * days as the dot strip instead.
 */
function WeekCard({ week, viewed, goToDate, onCalendar }) {
  const today = todayISO();
  return (
    <div className="r-weekcard">
      <div className="r-weekcard__head">
        <h2 className="r-weekcard__title">7 days</h2>
        <Button variant="secondary" size="sm" onClick={onCalendar}>
          Calendar
        </Button>
      </div>
      <div className="r-weekcard__days">
        {week.map((d) => {
          const [y, m, n] = d.date.split("-").map(Number);
          const wd = new Date(y, m - 1, n).toLocaleDateString("en-GB", { weekday: "short" });
          const key = d.date === today ? "today" : (d.status ?? "none");
          return (
            <button
              key={d.date}
              type="button"
              aria-label={d.label}
              aria-current={d.date === viewed ? "date" : undefined}
              onClick={() => goToDate(d.date)}
              className={`r-weekcard__day r-dotstrip__day--${key}${d.date === viewed ? " is-selected" : ""}`}
            >
              <span>{wd}</span>
              <span className="r-weekcard__dot-box">
                <span className="r-dotstrip__dot" />
              </span>
              <span className="r-weekcard__n">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="r-weekcard__legend">
        <StatusDot status="on-track" />
        <StatusDot status="partial" />
        <StatusDot status="low" />
      </div>
    </div>
  );
}

/**
 * The per-day appetite check. Optional and never nagged: no prompt, and no
 * state at all for a day left blank. Tapping the picked chip again clears it
 * (see day.setAppetite), so this is a group of toggles, not a radio group.
 */
function Appetite({ day, commit }) {
  return (
    <div className="r-appetite" role="group" aria-labelledby="r-appetite-label">
      <span id="r-appetite-label" className="r-appetite__label">
        Appetite
      </span>
      <div className="r-appetite__chips">
        {APPETITE_VALUES.map((value) => (
          <Chip
            key={value}
            selected={value === day.appetite}
            onClick={() => commit(setAppetite(day, value))}
          >
            {APPETITE_LABEL[value]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
