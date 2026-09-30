/**
 * tracking.jsx — the v3.0 tracking components (pass 65): the day's blocks,
 * its total, the week's dots, the weight trend and the plan's phases. Ported
 * from the handoff's components/tracking as classes in app.css.
 *
 * Intake colours are inverted on purpose (gain context): green at or above
 * target, gold partial, red well under. Every status dot sits beside a word.
 */

import { useId } from "react";
import { Button, Icon } from "./core.jsx";

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
 * own text by the gutter.
 */
export function DayTotal({ eyebrow, kcal, target, status, remaining, protein, proteinTarget }) {
  const key = statusKey(status);
  const f = target > 0 ? Math.max(0, Math.min(1, kcal / target)) : 0;
  return (
    <div className={`r-daytotal r-status--${key}`} style={{ "--r-fill": f }}>
      <div className="r-daytotal__head">
        <span>{eyebrow}</span>
        <StatusDot status={key} />
      </div>
      <div className="r-daytotal__figure">
        <span className="r-daytotal__kcal">{nf(kcal)}</span>
        <span className="r-daytotal__target">/ {nf(target)} kcal</span>
      </div>
      <div className="r-daytotal__horizon" aria-hidden="true">
        <span className="r-daytotal__line" />
        <span className="r-daytotal__bar" />
        <span className="r-daytotal__halo" />
        <span className="r-daytotal__sun" />
        {f < 0.9 ? <span className="r-daytotal__end">{nf(target)}</span> : null}
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

/** The day's checklist; draws the time rail behind the markers. */
export function BlockList({ children }) {
  return <div className="r-blocklist">{children}</div>;
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
  tag,
  tagEmphasis,
  link,
  linkLabel,
  onToggle,
  onLink,
}) {
  const done = state === "done" || state === "closedDone";
  return (
    <div className={`r-blockrow r-blockrow--${state === "closedDone" ? "closed-done" : state}`}>
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
          {done ? <Icon name="check" size={14} /> : null}
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
        {desc ? <span className="r-blockrow__desc">{desc}</span> : null}
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
export function DueCard({ label, name, desc, kcal, protein, swappable, onTick, onSwap }) {
  return (
    <div className="r-due">
      <div className="r-due__head">
        <div className="r-due__text">
          <div className="r-due__label">{label}</div>
          <div className="r-due__name">{name}</div>
          {desc ? (
            <div className="r-due__desc">
              {desc}
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

/** The phase ladder. The active rung sits on a sunken tile; every rung has a status word. */
export function PhaseLadder({ rungs }) {
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
    </div>
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
              <button
                key={ii}
                type="button"
                role="checkbox"
                aria-checked={!!it.done}
                onClick={() => onToggle?.(ai, ii)}
                className={cx("r-grocery__item", it.done && "is-done", it.changed && "is-changed")}
              >
                <span className="r-grocery__box">
                  {it.done ? <Icon name="check" size={15} /> : null}
                </span>
                <span className="r-grocery__name">{it.name}</span>
                <span className="r-grocery__qty">{it.qty}</span>
              </button>
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

/**
 * Weekly weigh-ins as dots, the four-week rolling average as a line, an
 * optional target band, and the sun on the latest average. The horizon runs
 * full-bleed; the axis labels are HTML so they follow the theme. Band maths
 * is inferred in the handoff, so callers pass the band as two series.
 */
export function WeightChart({
  weights,
  labels = [],
  bandLow,
  bandHigh,
  emptyText = "A trend appears after four weigh-ins.",
}) {
  const id = useId().replace(/:/g, "");
  const n = weights.length;
  const trend = n >= 4;
  const all = weights.concat(bandLow ?? [], bandHigh ?? []);
  const lo = Math.min(...all) - 0.4;
  const hi = Math.max(...all) + 0.4;
  const X = (i) => (n < 2 ? 174 : (i * 348) / (n - 1));
  const Y = (v) => 144 - ((v - lo) / (hi - lo)) * 124;
  const avg = weights.map((_, i) => {
    const s = weights.slice(Math.max(0, i - 3), i + 1);
    return s.reduce((a, b) => a + b, 0) / s.length;
  });
  const pts = (arr, from = 0) =>
    arr
      .map((v, i) => (i >= from ? `${X(i)},${Y(v)}` : null))
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
  const sun = trend
    ? {
        left: `${((X(last) - VB.x) / VB.w) * 100}%`,
        top: `${(Y(avg[last]) / VB.h) * 100}%`,
      }
    : null;

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
          {trend && band ? (
            <>
              <polygon points={band} className="r-chart__band" />
              <polygon points={band} fill={`url(#${id}sky)`} className="r-chart__band-sky" />
            </>
          ) : null}
          {trend ? <polyline points={pts(avg, 3)} className="r-chart__avg" /> : null}
          <g className="r-chart__dots">
            {weights.map((v, i) => (
              <circle key={i} cx={X(i)} cy={Y(v)} r="3" />
            ))}
          </g>
        </svg>
        {sun ? (
          <>
            <span className="r-chart__glow" style={sun} aria-hidden="true" />
            <span className="r-chart__sun" style={sun} aria-hidden="true" />
          </>
        ) : null}
      </div>
      {!trend && n > 0 ? <div className="r-chart__empty">{emptyText}</div> : null}
      <div className="r-chart__axis">
        {[0, 1, 2].map((i) => (
          <span key={i}>{labels[i]}</span>
        ))}
      </div>
    </div>
  );
}
