import React from 'react';
export function Chip({ selected, onClick, children }) {
  return (
    <button type="button" aria-pressed={!!selected} onClick={onClick}
      style={{ height: 44, padding: '0 14px', borderRadius: 22, border: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15,
        background: selected ? 'var(--ink)' : 'var(--chip-bg)', color: selected ? 'var(--bg-canvas)' : 'var(--ink)' }}>{children}</button>);
}
