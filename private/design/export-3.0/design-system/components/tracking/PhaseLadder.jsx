import React from 'react';
export function PhaseLadder({ rungs }) {
  return (
    <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)', padding: 6 }}>
      {rungs.map((r, i) => { const now = r.state === 'now', past = r.state === 'past'; return (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0,1fr) auto', columnGap: 14, alignItems: 'center', padding: 12, borderRadius: 16, background: now ? 'var(--bg-sunken)' : 'transparent' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', boxSizing: 'border-box', background: now ? 'var(--accent)' : past ? 'var(--ink-soft)' : 'transparent', boxShadow: now || past ? 'none' : 'inset 0 0 0 1.5px var(--ink-soft)' }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: now ? 'var(--ink)' : 'var(--ink-muted)' }}>{r.name}</span>
              <span style={{ fontFamily: 'var(--font-caption)', fontSize: 'var(--due-label-size)', fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: now ? 'var(--accent-text)' : 'var(--ink-muted)' }}>{r.status}</span>
            </span>
            <span style={{ display: 'block', fontSize: 14, color: 'var(--ink-muted)', marginTop: 2 }}>{r.when}</span>
          </span>
          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ display: 'block', fontSize: 17, fontWeight: 700, color: now ? 'var(--ink)' : 'var(--ink-muted)' }}>{r.kcal}</span>
            <span style={{ display: 'block', fontSize: 14, color: 'var(--ink-muted)' }}>{r.protein}</span>
          </span>
        </div>); })}
    </div>);
}
