import React from 'react';
export function Segmented({ options, value, onChange }) {
  return (
    <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(' + options.length + ',1fr)', gap: 4, padding: 4, height: 48, boxSizing: 'border-box', borderRadius: 24, background: 'var(--bg-sunken)' }}>
      {options.map(o => { const on = o.value === value; return (
        <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange && onChange(o.value)}
          style={{ border: 0, borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--bg-canvas)' : 'var(--ink-muted)' }}>{o.label}</button>); })}
    </div>);
}
