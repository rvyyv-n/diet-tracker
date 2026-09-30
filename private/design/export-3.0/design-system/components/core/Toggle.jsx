import React from 'react';
export function Toggle({ checked, label, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange && onChange(!checked)}
      style={{ position: 'relative', width: 52, height: 32, borderRadius: 16, border: 0, padding: 0, cursor: 'pointer', flex: 'none',
        background: checked ? 'var(--ink)' : 'var(--bg-sunken)', boxShadow: checked ? 'none' : 'inset 0 0 0 1.5px var(--line-strong)', transition: 'background var(--dur-fast) var(--ease-out)' }}>
      <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 26, height: 26, borderRadius: '50%', background: checked ? 'var(--bg-canvas)' : 'var(--ink-soft)', transition: 'left var(--dur-fast) var(--ease-spring)' }} />
    </button>);
}
