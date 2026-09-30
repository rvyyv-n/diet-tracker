import React from 'react';
export function TextField({ label, value, onChange, placeholder, unit, hint, error, inputMode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      <span style={{ height: 48, borderRadius: 'var(--radius-field)', background: 'var(--bg-canvas)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', boxSizing: 'border-box',
        boxShadow: 'inset 0 0 0 1.5px ' + (error ? 'var(--danger)' : 'var(--line-strong)') }}>
        <input value={value} inputMode={inputMode} placeholder={placeholder} onChange={e => onChange && onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 16, fontVariantNumeric: 'tabular-nums' }} />
        {unit && <span style={{ fontSize: 15, color: 'var(--ink-muted)' }}>{unit}</span>}
      </span>
      {(error || hint) && <span style={{ fontSize: 13, color: error ? 'var(--danger)' : 'var(--ink-muted)' }}>{error || hint}</span>}
    </label>);
}
