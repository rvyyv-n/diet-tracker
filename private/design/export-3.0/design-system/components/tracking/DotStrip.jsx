import React from 'react';
const COL = { 'on-track': 'var(--intake-on-track)', partial: 'var(--intake-partial)', low: 'var(--intake-low)' };
export function DotStrip({ days, label, onSelect, onCalendar }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {days.map((d, i) => {
          const today = d.status === 'today', s = d.selected ? 20 : 14;
          const bg = today ? 'transparent' : COL[d.status];
          const ring = today ? (d.selected ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 1.5px var(--ink-soft)') : (d.selected ? '0 0 0 2px var(--bg-canvas),0 0 0 3.5px var(--ink)' : 'none');
          return <button key={i} type="button" aria-label={'Day ' + (i + 1) + (d.selected ? ', selected' : '')} onClick={() => onSelect && onSelect(i)}
            style={{ width: s, height: s, padding: 0, border: 0, borderRadius: '50%', background: bg, boxShadow: ring, cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease-out)' }} />;
        })}
        <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 4 }}>{label}</span>
      </div>
      <button type="button" onClick={onCalendar} style={{ height: 44, padding: '0 16px', borderRadius: 22, border: 0, background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Calendar</button>
    </div>);
}
