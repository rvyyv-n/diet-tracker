/**
 * surfaces.jsx — the v3.0 surfaces (pass 65): sheets and dialogs, toasts,
 * banners, confirms, empty states, list rows and the calendar grid. Ported
 * from the handoff's components/surfaces as classes in app.css. The two
 * navigation surfaces (PhoneNav, SideNav) belong to the shell, pass 66.
 */

import { Children, cloneElement, isValidElement, useEffect, useRef } from "react";
import { Button, Icon, IconButton, Radio } from "./core.jsx";

const cx = (...names) => names.filter(Boolean).join(" ");

/**
 * A modal surface with its scrim: a bottom sheet with a grabber on phone, a
 * 520px centred dialog on desktop (`variant="dialog"`, `navInset` keeps it
 * centred on the main pane). Fixed to the viewport; `contained` pins it
 * inside a positioned parent instead, for previews. Escape closes it. With
 * no title (the calendar draws its own month bar) the head is left out and
 * `label` names the dialog. Focus moves into the panel on open and back to
 * where it was on close.
 */
export function Sheet({
  variant = "sheet",
  title,
  label,
  meta,
  navInset = 0,
  contained,
  onClose,
  children,
}) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (contained) return undefined;
    const back = document.activeElement;
    panelRef.current?.focus();
    return () => back?.focus?.();
  }, [contained]);

  useEffect(() => {
    if (!onClose || contained) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, contained]);

  const dialog = variant === "dialog";
  return (
    <div
      className={cx("r-sheet", dialog && "r-sheet--dialog", contained && "r-sheet--contained")}
      style={navInset ? { "--r-sheet-inset": `${navInset}px` } : undefined}
    >
      <div className="r-sheet__scrim" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || label}
        tabIndex={-1}
        className="r-sheet__panel"
      >
        {dialog ? null : <div className="r-sheet__grabber" aria-hidden="true" />}
        {title || meta ? (
          <div className="r-sheet__head">
            <h2 className="r-sheet__title">{title}</h2>
            {meta ? <span className="r-sheet__meta">{meta}</span> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/**
 * An inverse pill with Undo, for a tick, a weigh-in save or a grocery Clear.
 * `phone` floats above the tab bar, `pane` sits in flow at the foot of the
 * main pane.
 */
export function Toast({ message, actionLabel = "Undo", onUndo, placement = "phone" }) {
  return (
    <div role="status" className={cx("r-toast", placement === "phone" && "r-toast--float")}>
      {message}
      {onUndo ? (
        <button type="button" className="r-toast__action" onClick={onUndo}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/**
 * An inline notice under the header: `closed` (a view-only past day),
 * `backfill` (yesterday unfinished — gold dot, neutral edge), `storage` (a
 * failed write), `info` (a plain fact, outlined, no action). Never red for a
 * missed block.
 */
export function Banner({ kind, title, sub, action, onAction }) {
  return (
    <div className={`r-banner r-banner--${kind}`} role={kind === "storage" ? "alert" : undefined}>
      {kind === "closed" ? <Icon name="lock" size={20} className="r-banner__icon" /> : null}
      {kind === "backfill" ? <span className="r-banner__dot" aria-hidden="true" /> : null}
      {kind === "storage" ? <Icon name="warn" size={20} className="r-banner__icon" /> : null}
      {kind === "info" ? <Icon name="info" size={20} className="r-banner__icon" /> : null}
      <span className="r-banner__text">
        <b>{title}</b>
        {sub ? <span className="r-banner__sub">{sub}</span> : null}
      </span>
      {action ? (
        <button type="button" className="r-banner__action" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

/** An inline destructive confirm. The copy names exactly what is removed. */
export function ConfirmPanel({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  return (
    <div className="r-confirm" role="group" aria-label={title}>
      <div className="r-confirm__title">{title}</div>
      <div className="r-confirm__body">{body}</div>
      <div className="r-confirm__actions">
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="text" className="r-confirm__cancel" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}

/** Weight history and the recipe book only: one muted glyph, one line, no button. */
export function EmptyState({ icon, children }) {
  return (
    <div className="r-empty">
      <Icon name={icon} size={28} strokeWidth={1.6} className="r-empty__icon" />
      <p className="r-empty__line">{children}</p>
    </div>
  );
}

/** A raised card of ListRows, with hairlines between them. */
export function ListGroup({ children }) {
  const kids = Children.toArray(children);
  return (
    <div className="r-listgroup">
      {kids.map((k, i) => (isValidElement(k) ? cloneElement(k, { first: i === 0 }) : k))}
    </div>
  );
}

/** A settings or data row: title, hint, and a chevron or a control. */
export function ListRow({ title, hint, trailing, danger, onClick, first, icon }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx("r-listrow", first && "is-first", danger && "is-danger", icon && "has-icon")}
    >
      {icon ? (
        <span className="r-listrow__icon">
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <span className="r-listrow__text">
        <span className="r-listrow__title">{title}</span>
        {hint ? <span className="r-listrow__hint">{hint}</span> : null}
      </span>
      {trailing === "chevron" ? (
        <Icon name="chevronRight" size={16} className="r-listrow__chevron" />
      ) : (
        trailing
      )}
    </Tag>
  );
}

/** A selectable row for the Swap and Add-a-block sheets. */
export function OptionRow({ name, note, kcal, protein, selected, last, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      onClick={onClick}
      className={cx("r-option", last && "is-last")}
    >
      <Radio selected={selected} />
      <span className="r-option__text">
        <span className="r-option__name">{name}</span>
        {note ? <span className="r-option__note">{note}</span> : null}
      </span>
      <span className="r-option__figures">
        {kcal}
        <span className="r-option__protein">{protein} g</span>
      </span>
    </button>
  );
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const LEGEND = [
  ["on-track", "On track"],
  ["partial", "Partial"],
  ["low", "Low"],
];

/**
 * A month for the calendar sheet: 48px day cells with an intake dot under
 * the number, today ringed, and the legend. A day may be `disabled` (before
 * the plan, or in the future).
 */
export function CalendarGrid({
  month,
  leadingBlanks = 0,
  days,
  note,
  onPick,
  onPrev,
  onNext,
  nextDisabled,
  prevDisabled,
}) {
  return (
    <div className="r-calendar">
      <div className="r-calendar__bar">
        <span className="r-calendar__month" aria-live="polite">
          {month}
        </span>
        <span className="r-calendar__nav">
          <IconButton
            icon="chevronLeft"
            label="Previous month"
            onClick={onPrev}
            disabled={prevDisabled}
          />
          <IconButton
            icon="chevronRight"
            label="Next month"
            onClick={onNext}
            disabled={nextDisabled}
          />
        </span>
      </div>
      <div className="r-calendar__grid">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="r-calendar__weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => (
          <button
            key={d.n}
            type="button"
            aria-label={d.label}
            aria-current={d.status === "today" ? "date" : undefined}
            disabled={d.disabled}
            onClick={() => onPick?.(d.n)}
            className={cx(
              "r-calendar__day",
              d.status && `r-calendar__day--${d.status}`,
              d.selected && "is-selected",
            )}
          >
            {d.n}
            <span className="r-calendar__dot" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="r-calendar__legend">
        {LEGEND.map(([k, l]) => (
          <span key={k} className={`r-status r-status--${k}`}>
            <span className="r-status__dot" aria-hidden="true" />
            {l}
          </span>
        ))}
        {note ? <span>{note}</span> : null}
      </div>
    </div>
  );
}
