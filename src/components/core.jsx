/**
 * core.jsx — the v3.0 core controls (pass 65), ported from the design
 * handoff's components/core. The handoff draws them with inline styles; here
 * each is a class in app.css (the `r-` section) reading semantic tokens only,
 * so hover, press and focus live in CSS and a Look never needs its own markup.
 *
 * Props follow the handoff's own .d.ts so the screens can be built straight
 * from its prompts. Extra props (aria-*, className) pass through where a
 * screen will need them.
 */

import { iconSvg } from "../js/ui/icons.js";

const cx = (...names) => names.filter(Boolean).join(" ");

/* The Rise glyph set, copied from the handoff's Icon.jsx: [default stroke, inner markup]. */
const GLYPHS = {
  today: [1.9, '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>'],
  plan: [1.8, '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/>'],
  recipes: [
    1.8,
    '<path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  ],
  weight: [1.8, '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'],
  settings: [
    1.8,
    '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  ],
  check: [3.2, '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
  lock: [
    1.8,
    '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  ],
  warn: [2, '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>'],
  info: [1.8, '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'],
  search: [1.8, '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'],
  chevronLeft: [2, '<path d="M15 6l-6 6 6 6"/>'],
  chevronRight: [2, '<path d="M9 6l6 6-6 6"/>'],
  dairy: [1.9, '<path d="M12 3c-3.5 0-6 5-6 9a6 6 0 0 0 12 0c0-4-2.5-9-6-9z"/>'],
  pantry: [
    1.9,
    '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9M10 13h4"/>',
  ],
  protein: [
    1.9,
    '<path d="M15.5 4.5a5 5 0 0 1 0 7.1l-3.9 3.9-4.1-4.1 3.9-3.9a5 5 0 0 1 4.1-3z"/><path d="M7.5 11.4 4 15a2 2 0 1 0 2.5 3A2 2 0 1 0 9 20.5l3.6-3.5"/>',
  ],
  produce: [
    1.9,
    '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6"/>',
  ],
};

/**
 * A stroke icon from the Rise set. A name outside the set falls back to the
 * Lucide glyphs in ui/icons.js, so a screen can ask for any icon the app
 * already draws while the redesign replaces them.
 */
export function Icon({ name, size = 20, strokeWidth, className }) {
  const glyph = GLYPHS[name];
  const html = glyph
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth ?? glyph[0]}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph[1]}</svg>`
    : iconSvg(name, { size, stroke: strokeWidth });
  return (
    <span
      className={cx("r-icon", className)}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Pill button. `primary` is the one coral action per view, `hero` the
 * Look-aware CTA, `danger` destructive confirms only; `dueCta` and
 * `dueSecondary` sit on the due-now card. Pressed and disabled are inferred
 * states the screens don't draw.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  disabled,
  onClick,
  children,
  className,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "r-button",
        `r-button--${variant.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
        size === "sm" && "r-button--sm",
        fullWidth && "r-button--full",
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} size={18} strokeWidth={3} /> : null}
      {children}
    </button>
  );
}

/** 44px circular icon button. `label` is required: it is the accessible name. */
export function IconButton({ icon, label, disabled, onClick, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx("r-icon-button", className)}
      {...rest}
    >
      <Icon name={icon} size={18} strokeWidth={2} />
    </button>
  );
}

/** 44px selectable pill for one-tap answers. Tap again to clear is the caller's. */
export function Chip({ selected, onClick, children }) {
  return (
    <button type="button" aria-pressed={!!selected} onClick={onClick} className="r-chip">
      {children}
    </button>
  );
}

/** Segmented control on a sunken track; the selected segment is an ink pill. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="r-segmented"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange?.(o.value)}
          className="r-segmented__option"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 52×32 switch. On is the ink track, never green: green means intake on track. */
export function Toggle({ checked, label, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="r-toggle"
    >
      <span className="r-toggle__thumb" />
    </button>
  );
}

/** Ring/dot radio mark. Presentational: the row around it is the hit target. */
export function Radio({ selected, size = 22 }) {
  return (
    <span
      className={cx("r-radio", selected && "is-selected")}
      style={{ "--r-radio-size": `${size}px`, "--r-radio-dot": `${Math.round(size * 0.32)}px` }}
    />
  );
}

/** 48px labelled field with an optional unit suffix, hint and error. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  hint,
  error,
  inputMode,
  ...rest
}) {
  return (
    <label className={cx("r-field", error && "is-error")}>
      <span className="r-field__label">{label}</span>
      <span className="r-field__box">
        <input
          className="r-field__input"
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
        {unit ? <span className="r-field__unit">{unit}</span> : null}
      </span>
      {error || hint ? <span className="r-field__note">{error || hint}</span> : null}
    </label>
  );
}

/** Surface container: raised (default), outlined, sunken, or danger for confirms. */
export function Card({ variant = "raised", padding, children, className, as: Tag = "div" }) {
  return (
    <Tag
      className={cx("r-card", `r-card--${variant}`, className)}
      style={padding == null ? undefined : { padding }}
    >
      {children}
    </Tag>
  );
}

/** The small label above a screen title or hero number. Reel uppercases it. */
export function Eyebrow({ children, trailing }) {
  return (
    <div className="r-eyebrow">
      <span>{children}</span>
      {trailing}
    </div>
  );
}

/** A section title inside a screen, with optional right-aligned meta. */
export function SectionHeading({ children, meta, as: Tag = "h2" }) {
  return (
    <div className="r-section-heading">
      <Tag className="r-section-heading__title">{children}</Tag>
      {meta ? <span className="r-section-heading__meta">{meta}</span> : null}
    </div>
  );
}

/**
 * The wordmark, set in type with the sun disc; there is no drawn logo file.
 * `nav` is the side-nav lockup (sun, then "Rise"); `reel` is the italic
 * "Rıse" with the sun as the dot on its dotless i.
 */
export function Wordmark({ variant = "nav", size = 26 }) {
  if (variant === "nav") {
    return (
      <span className="r-wordmark" style={{ "--r-wordmark-size": `${size}px` }}>
        <span className="r-wordmark__sun" aria-hidden="true" />
        <span className="r-wordmark__word">Rise</span>
      </span>
    );
  }
  return (
    <span
      className="r-wordmark r-wordmark--reel"
      role="img"
      aria-label="Rise"
      style={{ "--r-wordmark-size": `${size}px` }}
    >
      R
      <span className="r-wordmark__i">
        {"ı"}
        <span className="r-wordmark__dot" />
      </span>
      se
    </span>
  );
}
