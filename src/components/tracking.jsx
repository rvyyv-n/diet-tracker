/**
 * tracking.jsx — the v3.0 tracking components (pass 65): the day's blocks,
 * its total, the week's dots, the weight trend and the plan's phases. Ported
 * from the handoff's components/tracking as classes in app.css.
 *
 * Intake colours are inverted on purpose (gain context): green at or above
 * target, gold partial, red well under. Every status dot sits beside a word.
 */

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button, Icon } from "./core.jsx";
import { MealDesc } from "./shared.jsx";
import { kgToLb, lbToKg, weightUnitLabel } from "../js/core/units.js";

const cx = (...names) => names.filter(Boolean).join(" ");
const nf = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : n);

const STATUS_WORD = {
  "on-track": "On track",
  partial: "Partial",
  low: "Low",
  none: "Not started",
};
const statusKey = (status) => (status in STATUS_WORD ? status : "none");

/** An intake status dot with its word. Colour is never the only signal. */
export function StatusDot({ status, label, size = 8 }) {
  const key = statusKey(status);
  return (
    <span className={`r-status r-status--${key}`} style={{ "--r-dot-size": `${size}px` }}>
      <span className="r-status__dot" aria-hidden="true" />
      {label ?? STATUS_WORD[key]}
    </span>
  );
}

/**
 * Seven days as dots, the selected one ringed, plus the Calendar button. It
 * replaces a date stepper. Each day may carry a `label` ("Mon 28, partial")
 * for its accessible name; each dot's hit area is the full 44px row height.
 */
export function DotStrip({ days, label, onSelect, onCalendar }) {
  return (
    <div className="r-dotstrip">
      <div className="r-dotstrip__days">
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-label={d.label ?? `Day ${i + 1}`}
            aria-current={d.selected ? "date" : undefined}
            disabled={d.disabled}
            onClick={() => onSelect?.(i)}
            className={cx(
              "r-dotstrip__day",
              `r-dotstrip__day--${d.status in STATUS_WORD || d.status === "today" ? d.status : "none"}`,
              d.selected && "is-selected",
            )}
          >
            <span className="r-dotstrip__dot" />
          </button>
        ))}
        <span className="r-dotstrip__label">{label}</span>
      </div>
      <Button variant="secondary" className="r-dotstrip__calendar" onClick={onCalendar}>
        Calendar
      </Button>
    </div>
  );
}

/**
 * The Today hero: the kcal figure, a bar on the horizon coloured by intake
 * status, and the sun riding the bar's end. Runs edge to edge and pads its
 * own text by the gutter. `scrub` ({ stops, value, label, onChange }) makes
 * the sun a slider: `stops` are the replay points as fractions of the bar,
 * `value` the point shown (null for now), `label` its words for a reader.
 */
export function DayTotal({
  eyebrow,
  kcal,
  target,
  status,
  remaining,
  protein,
  proteinTarget,
  scrub,
}) {
  const key = statusKey(status);
  const f = target > 0 ? Math.max(0, Math.min(1, kcal / target)) : 0;
  const horizonRef = useRef(null);
  const barRef = useRef(null);
  const dragging = useRef(false);
  // A slider once at least one thing is eaten (pass 93): drag the sun back and
  // Today shows the day as it stood. Letting go returns it to now.
  const s = scrub && scrub.stops.length > 1 ? scrub : null;
  const last = s ? s.stops.length - 1 : 0;
  const at = s?.value ?? null;

  /** The replay point nearest a pointer; null for the last, which is now. */
  function pointAt(clientX) {
    const box = horizonRef.current.getBoundingClientRect();
    const gutter = barRef.current.offsetLeft;
    const x = (clientX - box.left - gutter) / Math.max(1, box.width - 2 * gutter);
    let best = 0;
    s.stops.forEach((stop, i) => {
      // Ties go to the later point, so a run of points past target still ends on the day.
      if (Math.abs(stop - x) <= Math.abs(s.stops[best] - x)) best = i;
    });
    return best === last ? null : best;
  }
  const set = (v) => {
    if (v !== at) s.onChange(v);
  };
  const drag = s
    ? {
        onPointerDown: (e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          set(pointAt(e.clientX));
        },
        onPointerMove: (e) => {
          if (dragging.current) set(pointAt(e.clientX));
        },
        onPointerUp: () => {
          dragging.current = false;
          set(null);
        },
        onPointerCancel: () => {
          dragging.current = false;
          set(null);
        },
      }
    : {};
  function onKeyDown(e) {
    const now = at ?? last;
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    let next;
    if (step) next = Math.max(0, Math.min(last, now + step));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End" || e.key === "Escape") next = last;
    else return;
    e.preventDefault();
    set(next === last ? null : next);
  }

  return (
    <div
      className={cx(
        "r-daytotal",
        `r-status--${key}`,
        s && "r-daytotal--scrub",
        at != null && "is-scrubbing",
      )}
      style={{ "--r-fill": f }}
    >
      <div className="r-daytotal__head">
        <span>{eyebrow}</span>
        <StatusDot status={key} />
      </div>
      <div className="r-daytotal__figure">
        <span className="r-daytotal__kcal">{nf(kcal)}</span>
        <span className="r-daytotal__target">/ {nf(target)} kcal</span>
      </div>
      <div className="r-daytotal__horizon" ref={horizonRef} {...drag}>
        <span className="r-daytotal__line" aria-hidden="true" />
        <span className="r-daytotal__bar" ref={barRef} aria-hidden="true" />
        <span className="r-daytotal__halo" aria-hidden="true" />
        {s ? (
          <span
            className="r-daytotal__sun"
            role="slider"
            tabIndex={0}
            aria-label="Replay the day"
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={at ?? last}
            aria-valuetext={s.label}
            onKeyDown={onKeyDown}
            onBlur={() => set(null)}
          />
        ) : (
          <span className="r-daytotal__sun" aria-hidden="true" />
        )}
        {f < 0.9 ? (
          <span className="r-daytotal__end" aria-hidden="true">
            {nf(target)}
          </span>
        ) : null}
      </div>
      <div className="r-daytotal__foot">
        <span>{remaining}</span>
        {protein != null ? (
          <span className="r-daytotal__protein">
            Protein {protein}/{proteinTarget} g
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A check that pops in on the spring curve when `pop` is set (a change the user just made). */
function TickPop({ size, pop, onPopEnd }) {
  return (
    <span className={cx("r-tickpop", pop && "is-pop")} onAnimationEnd={onPopEnd}>
      <Icon name="check" size={size} />
    </span>
  );
}

/** The day's checklist; draws the time rail behind the markers. */
export function BlockList({ children, flipKey }) {
  const ref = useRef(null);
  const tops = useRef(new Map());
  const lastKey = useRef(flipKey);
  // When `flipKey` changes (the replay point on Today), rows that moved
  // glide from where they were instead of jumping: the now marker travels up
  // the rail and the rows part round it.
  useLayoutEffect(() => {
    const moved = lastKey.current !== flipKey;
    lastKey.current = flipKey;
    const next = new Map();
    for (const el of ref.current.children) {
      const top = el.offsetTop;
      const was = tops.current.get(el);
      next.set(el, top);
      if (!moved || was == null || was === top) continue;
      el.style.transition = "none";
      el.style.transform = `translateY(${was - top}px)`;
      el.getBoundingClientRect();
      el.style.transition = "";
      el.style.transform = "";
    }
    tops.current = next;
  });
  return (
    <div className="r-blocklist" ref={ref}>
      {children}
    </div>
  );
}

/**
 * One meal block: time, marker, name, kcal. States: idle, done, receded
 * (earlier and unticked — quieter, never red), closed and closedDone (a past
 * day), off (off-plan food). `desc` and `protein` show on desktop only, where
 * the row has the room; `link` (Swap, Remove) sits after the name on a phone
 * and in its own column on desktop. `linkLabel` names it for a screen reader.
 */
export function BlockRow({
  time,
  name,
  desc,
  kcal,
  protein,
  state = "idle",
  popIn = false,
  onPopEnd,
  tag,
  tagEmphasis,
  link,
  linkLabel,
  onToggle,
  onLink,
  ahead = false,
}) {
  const done = state === "done" || state === "closedDone";
  // The check pops in when this row goes from open to done on screen, or when
  // `popIn` says it mounts just ticked (the due card turns into this row).
  // Rows that open done, and a past day that replaces Today's rows, stay still.
  const [prevState, setPrevState] = useState(state);
  const [pop, setPop] = useState(popIn);
  if (state !== prevState) {
    setPrevState(state);
    setPop(state === "done" && (prevState === "idle" || prevState === "receded"));
  }
  return (
    <div
      className={cx(
        "r-blockrow",
        `r-blockrow--${state === "closedDone" ? "closed-done" : state}`,
        ahead && "is-ahead",
      )}
    >
      <span className="r-blockrow__time">
        {time}
        {state === "off" ? <span className="r-blockrow__off">off plan</span> : null}
      </span>
      <button
        type="button"
        className="r-blockrow__mark"
        aria-label={state === "off" ? `${name}, off plan` : name}
        aria-pressed={state === "off" ? undefined : done}
        onClick={onToggle}
        disabled={!onToggle}
      >
        <span className="r-blockrow__dot">
          {done ? <TickPop size={14} pop={pop} onPopEnd={onPopEnd} /> : null}
          {state === "off" ? <span className="r-blockrow__diamond" /> : null}
        </span>
      </button>
      <span className="r-blockrow__name">
        <span className="r-blockrow__title">{name}</span>
        {link ? (
          <button
            type="button"
            className="r-blockrow__link"
            aria-label={linkLabel}
            onClick={onLink}
          >
            {link}
          </button>
        ) : null}
        {tag ? (
          <span className={cx("r-blockrow__tag", tagEmphasis && "is-emphasis")}>{tag}</span>
        ) : null}
        {desc ? (
          <span className="r-blockrow__desc">
            <MealDesc text={desc} />
          </span>
        ) : null}
      </span>
      <span className="r-blockrow__kcal">
        {nf(kcal)}
        {protein != null ? <span className="r-blockrow__protein"> · {protein} g</span> : null}
      </span>
    </div>
  );
}

/** A sunrise line with a sun bead and the time: where the day is between blocks. */
export function NowMarker({ time }) {
  return (
    <div className="r-now">
      <span className="r-now__line" aria-hidden="true" />
      <span className="r-now__sun" aria-hidden="true" />
      <span className="r-now__time">{time}</span>
    </div>
  );
}

/** The block due now: the only emphasised item on Today, with Tick as its action. */
export function DueCard({ label, name, desc, kcal, protein, swappable, onTick, onSwap, ahead }) {
  return (
    <div className={cx("r-due", ahead && "is-ahead")}>
      <div className="r-due__head">
        <div className="r-due__text">
          <div className="r-due__label">{label}</div>
          <div className="r-due__name">{name}</div>
          {desc ? (
            <div className="r-due__desc">
              <MealDesc text={desc} />
              <span className="r-due__inline">
                {" · "}
                <b>{nf(kcal)} kcal</b> · {protein} g
              </span>
            </div>
          ) : null}
        </div>
        <div className="r-due__figures">
          <div className="r-due__kcal">{nf(kcal)}</div>
          <div className="r-due__meta">kcal · {protein} g</div>
        </div>
      </div>
      <div className={cx("r-due__actions", swappable && "r-due__actions--swap")}>
        {swappable ? (
          <Button variant="dueSecondary" onClick={onSwap}>
            Swap
          </Button>
        ) : null}
        <Button variant="dueCta" icon="check" onClick={onTick}>
          Tick {name}
        </Button>
      </div>
    </div>
  );
}

/**
 * An engine suggestion. Offers Not now and Apply; nothing changes without a
 * tap. With no `onApply` (a check-up that only informs) it offers the dismiss
 * alone.
 */
export function SuggestionCard({
  title,
  body,
  label = "Suggestion",
  applyLabel = "Apply",
  dismissLabel = "Not now",
  onApply,
  onDismiss,
}) {
  return (
    <div className="r-suggestion">
      <div className="r-suggestion__label">{label}</div>
      <div className="r-suggestion__title">{title}</div>
      <div className="r-suggestion__body">{body}</div>
      <div className="r-suggestion__actions">
        <Button variant="secondary" onClick={onDismiss}>
          {dismissLabel}
        </Button>
        {onApply ? <Button onClick={onApply}>{applyLabel}</Button> : null}
      </div>
    </div>
  );
}

/** A hairline-ruled row of two or three figures with captions. */
export function StatRow({ stats }) {
  return (
    <div className="r-statrow" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={i} className="r-statrow__cell">
          <div className="r-statrow__value">{s.value}</div>
          <div className="r-statrow__label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The phase ladder. The active rung sits on a sunken tile; every rung has a
 * status word. `note` is a quiet line under the rungs, inside the card.
 */
export function PhaseLadder({ rungs, note }) {
  return (
    <div className="r-ladder">
      {rungs.map((r, i) => (
        <div key={i} className={`r-ladder__rung r-ladder__rung--${r.state ?? "next"}`}>
          <span className="r-ladder__dot" aria-hidden="true" />
          <span className="r-ladder__text">
            <span className="r-ladder__title">
              <span className="r-ladder__name">{r.name}</span>
              <span className="r-ladder__status">{r.status}</span>
            </span>
            <span className="r-ladder__when">{r.when}</span>
          </span>
          <span className="r-ladder__figures">
            <span className="r-ladder__kcal">{r.kcal}</span>
            <span className="r-ladder__protein">{r.protein}</span>
          </span>
        </div>
      ))}
      {note ? <p className="r-ladder__note">{note}</p> : null}
    </div>
  );
}

/** One grocery line. Ticking it pops the check; a week reset or a phase change does not. */
function GroceryItem({ item: it, onToggle }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!it.done}
      onClick={() => {
        setPop(!it.done);
        onToggle();
      }}
      className={cx("r-grocery__item", it.done && "is-done", it.changed && "is-changed")}
    >
      <span className="r-grocery__box">
        {it.done ? <TickPop size={15} pop={pop} onPopEnd={() => setPop(false)} /> : null}
      </span>
      <span className="r-grocery__name">{it.name}</span>
      <span className="r-grocery__qty">{it.qty}</span>
    </button>
  );
}

/**
 * The weekly grocery checklist, by aisle. Ticked items strike through and
 * quieten; a quantity changed by a phase change shows in accent text.
 */
export function GroceryList({ aisles, scaleNote, onToggle, onClear }) {
  const any = aisles.some((a) => a.items.some((it) => it.done));
  return (
    <div className="r-grocery">
      {aisles.map((a, ai) => (
        <div key={ai} className="r-grocery__aisle">
          <div className="r-grocery__aisle-name">
            {a.icon ? <Icon name={a.icon} size={16} className="r-grocery__aisle-icon" /> : null}
            {a.name}
          </div>
          <div className="r-grocery__items">
            {a.items.map((it, ii) => (
              <GroceryItem key={ii} item={it} onToggle={() => onToggle?.(ai, ii)} />
            ))}
          </div>
        </div>
      ))}
      <div className="r-grocery__foot">
        <span className="r-grocery__note">{scaleNote}</span>
        <Button variant="secondary" size="sm" disabled={!any} onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

/* The chart's drawing box, from the handoff: a 364×176 viewBox starting at x -8. */
const VB = { x: -8, w: 364, h: 176 };
const GHOST = { x: 16, y: 140, path: "M16 140 C120 136 220 104 332 64" };
// Gridline steps to try, in the display unit; the first that gives at most
// three lines wins.
const GRID_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];

/**
 * Weekly weigh-ins as dots, the four-week rolling average as a line, an
 * optional target band, and the sun on the latest average. The horizon runs
 * full-bleed; the axis labels are HTML so they follow the theme. Band maths
 * is inferred in the handoff, so callers pass the band as two series.
 *
 * Pass 93 made it readable without the legend: gridlines with weights in the
 * user's `unit` (stone reads in pounds, as the deltas do), the average drawn
 * dashed while it is still averaging in its first weeks, "On pace" written
 * on the band, and the sun's own reading beside it.
 */
export function WeightChart({
  weights,
  labels = [],
  bandLow,
  bandHigh,
  unit = "kg",
  emptyText = "A trend appears after four weigh-ins.",
}) {
  const id = useId().replace(/:/g, "");
  const n = weights.length;
  const trend = n >= 4;
  const all = n ? weights.concat(bandLow ?? [], bandHigh ?? []) : [0];
  const lo = Math.min(...all) - 0.4;
  const hi = Math.max(...all) + 0.4;
  const X = (i) => (n < 2 ? 174 : (i * 348) / (n - 1));
  const Y = (v) => 144 - ((v - lo) / (hi - lo)) * 124;
  const avg = weights.map((_, i) => {
    const s = weights.slice(Math.max(0, i - 3), i + 1);
    return s.reduce((a, b) => a + b, 0) / s.length;
  });
  const pts = (arr, from = 0, to = arr.length - 1) =>
    arr
      .map((v, i) => (i >= from && i <= to ? `${X(i)},${Y(v)}` : null))
      .filter(Boolean)
      .join(" ");
  const band =
    bandLow && bandHigh
      ? `${bandHigh.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} ${bandLow
          .map((v, i) => `${X(i)},${Y(v)}`)
          .reverse()
          .join(" ")}`
      : null;
  const last = n - 1;
  const at = (x, y) => ({ left: `${((x - VB.x) / VB.w) * 100}%`, top: `${(y / VB.h) * 100}%` });
  // Before the first weigh-in: a faint dashed rise, with the sun where the
  // first weigh-in will land.
  const ghost = n === 0;
  const sun = trend ? at(X(last), Y(avg[last])) : ghost ? at(GHOST.x, GHOST.y) : null;

  // Gridlines at round weights in the display unit.
  const inLb = unit === "lb" || unit === "st";
  const show = (kg) => (inLb ? kgToLb(kg) : kg);
  const step = GRID_STEPS.find((c) => Math.floor(show(hi) / c) - Math.ceil(show(lo) / c) < 3);
  const grid = [];
  if (n && step) {
    for (let k = Math.ceil(show(lo) / step); k * step <= show(hi); k++) {
      const v = k * step;
      const kg = inLb ? lbToKg(v) : v;
      if (Y(kg) > 12 && Y(kg) < 136) grid.push({ v, y: Y(kg) });
    }
  }
  const digits = step === 0.25 ? 2 : step < 1 || step === 2.5 ? 1 : 0;
  const unitWord = weightUnitLabel(inLb ? "lb" : "kg");
  // "On pace" sits on the band's top edge at its end, the reading under the sun.
  const bandEnd = trend && bandHigh ? Y(bandHigh[last]) : null;

  return (
    <div className="r-chart">
      <span className="r-chart__horizon" aria-hidden="true" />
      <div className="r-chart__plot">
        <svg viewBox={`${VB.x} 0 ${VB.w} ${VB.h}`} className="r-chart__svg" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="r-chart__sky-top" />
              <stop offset="1" className="r-chart__sky-bottom" />
            </linearGradient>
          </defs>
          {grid.map((g) => (
            <line
              key={g.v}
              x1={VB.x}
              x2={VB.x + VB.w}
              y1={g.y}
              y2={g.y}
              className="r-chart__grid"
            />
          ))}
          {trend && band ? (
            <>
              <polygon points={band} className="r-chart__band" />
              <polygon points={band} fill={`url(#${id}sky)`} className="r-chart__band-sky" />
            </>
          ) : null}
          {trend ? (
            <>
              <polyline points={pts(avg, 0, 3)} className="r-chart__avg r-chart__avg--early" />
              <polyline points={pts(avg, 3)} className="r-chart__avg" />
            </>
          ) : null}
          {ghost ? <path d={GHOST.path} className="r-chart__ghost" /> : null}
          <g className="r-chart__dots">
            {weights.map((v, i) => (
              <circle key={i} cx={X(i)} cy={Y(v)} r="3" />
            ))}
          </g>
        </svg>
        {grid.map((g, i) => (
          <span key={g.v} className="r-chart__tick" style={at(VB.x, g.y)} aria-hidden="true">
            {g.v.toFixed(digits)}
            {i === grid.length - 1 ? ` ${unitWord}` : null}
          </span>
        ))}
        {bandEnd != null ? (
          <span className="r-chart__band-label" style={at(X(last), bandEnd)} aria-hidden="true">
            On pace
          </span>
        ) : null}
        {sun ? (
          <>
            <span className="r-chart__glow" style={sun} aria-hidden="true" />
            <span className="r-chart__sun" style={sun} aria-hidden="true" />
          </>
        ) : null}
        {trend ? (
          <span className="r-chart__reading" style={sun} aria-hidden="true">
            {show(avg[last]).toFixed(1)} avg
          </span>
        ) : null}
      </div>
      {!trend ? <div className="r-chart__empty">{emptyText}</div> : null}
      <div className="r-chart__axis">
        {[0, 1, 2].map((i) => (
          <span key={i}>{labels[i]}</span>
        ))}
      </div>
    </div>
  );
}
