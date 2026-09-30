import React from 'react';
export function Card({ variant = 'raised', padding = 16, children, style }) {
  const V = {
    raised: { background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)' },
    outlined: { background: 'var(--bg-raised)', boxShadow: 'inset 0 0 0 1px var(--line)' },
    sunken: { background: 'var(--bg-sunken)' },
    danger: { background: 'var(--bg-raised)', boxShadow: 'inset 0 0 0 1.5px var(--danger)' },
  }[variant];
  return <div style={{ borderRadius: 'var(--radius-card)', padding, boxSizing: 'border-box', ...V, ...style }}>{children}</div>;
}
