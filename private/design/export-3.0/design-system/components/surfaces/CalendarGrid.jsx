import React from 'react';
import { IconButton } from '../core/IconButton.jsx';
const COL = { 'on-track': 'var(--intake-on-track)', partial: 'var(--intake-partial)', low: 'var(--intake-low)' };
export function CalendarGrid({ month, leadingBlanks = 0, days, note, onPick, onPrev, onNext, nextDisabled }) {
  const head = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const legend = [['on-track', 'On track'], ['partial', 'Partial'], ['low', 'Low']];
  return (
    <div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-md)' }}>{month}</span>
        <span style={{ display: 'flex', gap: 4 }}><IconButton icon="chevronLeft" label="Previous month" onClick={onPrev} /><IconButton icon="chevronRight" label="Next month" onClick={onNext} disabled={nextDisabled} /></span>
      </div>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 4, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {head.map((h, i) => <span key={i} style={{ fontSize: 12, color: 'var(--ink-muted)', paddingBottom: 4 }}>{h}</span>)}
        {Array.from({ length: leadingBlanks }, (_, i) => <span key={'b' + i} />)}
        {days.map(d => { const t = d.status === 'today'; return (
          <button key={d.n} type="button" onClick={() => onPick && onPick(d.n)} style={{ height: 48, border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, fontSize: 15, fontWeight: t ? 700 : 400, boxShadow: t ? 'inset 0 0 0 2px var(--ink)' : 'none' }}>
            {d.n}<span style={{ width: 6, height: 6, borderRadius: '50%', background: COL[d.status] || 'transparent' }} />
          </button>); })}
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 13, color: 'var(--ink-muted)' }}>
        {legend.map(([k, l]) => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: COL[k] }} />{l}</span>)}
        {note && <span>{note}</span>}
      </div>
    </div>);
}
