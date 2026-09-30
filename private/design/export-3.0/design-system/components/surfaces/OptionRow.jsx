import React from 'react';
import { Radio } from '../core/Radio.jsx';
export function OptionRow({ name, note, kcal, protein, selected, last, onClick }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onClick}
      style={{ width: '100%', border: 0, borderBottom: last ? 'none' : '1px solid var(--line)', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto', gap: 12, alignItems: 'center', minHeight: 64 }}>
      <Radio selected={selected} />
      <span><span style={{ display: 'block', fontSize: 17 }}>{name}</span>{note && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{note}</span>}</span>
      <span style={{ fontSize: 16, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{kcal}<span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: 'var(--ink-muted)' }}>{protein} g</span></span>
    </button>);
}
