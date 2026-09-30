import React, { useState } from 'react';
import { Icon } from './Icon.jsx';
export function Button({ variant = 'primary', size = 'md', icon, fullWidth, disabled, onClick, children, style }) {
  const [down, setDown] = useState(false);
  const h = size === 'sm' ? 40 : 52;
  const V = {
    primary: { background: disabled ? 'var(--accent-disabled)' : 'var(--accent)', color: 'var(--accent-ink)' },
    hero: { background: 'var(--cta-hero-bg)', color: 'var(--cta-hero-ink)', boxShadow: 'var(--cta-hero-glow)', fontSize: 'var(--cta-hero-size)', letterSpacing: 'var(--cta-hero-tracking)', textTransform: 'var(--cta-hero-transform)' },
    secondary: { background: 'transparent', color: 'var(--ink)', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)' },
    text: { background: 'transparent', color: 'var(--accent-text)', padding: '0 4px' },
    danger: { background: 'var(--danger)', color: 'var(--danger-ink)' },
    dueCta: { background: 'var(--due-cta-bg)', color: 'var(--due-cta-ink)', fontSize: 17 },
    dueSecondary: { background: 'transparent', color: 'inherit', boxShadow: 'inset 0 0 0 1.5px var(--due-secondary-edge)' },
  }[variant];
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      onPointerDown={() => setDown(true)} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}
      style={{ height: h, padding: size === 'sm' ? '0 16px' : '0 20px', borderRadius: h / 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font-body)', fontSize: size === 'sm' ? 15 : 16, fontWeight: 700, border: 0, cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined, opacity: disabled && variant !== 'primary' ? 0.5 : 1,
        transform: down && !disabled ? 'scale(.97)' : 'none', transition: 'transform var(--dur-instant) var(--ease-out)', ...V, ...style }}>
      {icon && <Icon name={icon} size={18} strokeWidth={3} />}{children}
    </button>);
}
