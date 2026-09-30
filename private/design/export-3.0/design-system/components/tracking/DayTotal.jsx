import React from 'react';
import { StatusDot } from './StatusDot.jsx';
const COL = { 'on-track': 'var(--intake-on-track)', partial: 'var(--intake-partial)', low: 'var(--intake-low)', none: 'var(--ink-soft)' };
export function DayTotal({ eyebrow, kcal, target, status, remaining, protein, proteinTarget }) {
  const f = Math.max(0, Math.min(1, kcal / target)), c = COL[status] || COL.none, nf = n => n.toLocaleString('en-US');
  const x = 'calc(20px + (100% - 40px) * ' + f + ')';
  return (
    <div style={{ fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 'var(--eyebrow-size)', fontWeight: 'var(--eyebrow-weight)', letterSpacing: 'var(--eyebrow-tracking)', textTransform: 'var(--eyebrow-transform)', color: 'var(--eyebrow-ink)' }}>
        <span>{eyebrow}</span><StatusDot status={status} />
      </div>
      <div style={{ padding: '0 20px', display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
        <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--type-hero)', fontWeight: 'var(--numeric-weight)', lineHeight: 1, letterSpacing: 'var(--numeric-tracking)' }}>{nf(kcal)}</span>
        <span style={{ fontSize: 20, color: 'var(--ink-muted)' }}>/ {nf(target)} kcal</span>
      </div>
      <div style={{ position: 'relative', height: 56, marginTop: 6 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 34, height: 1.5, background: 'linear-gradient(90deg,transparent,var(--horizon) 12%,var(--horizon) 88%,transparent)' }} />
        <div style={{ position: 'absolute', left: 20, width: 'calc((100% - 40px) * ' + f + ')', top: 33, height: 4, borderRadius: 2, background: c, transition: 'width var(--dur-base) var(--ease-out)' }} />
        <div style={{ position: 'absolute', left: 'calc(' + x + ' - 60px)', top: -25, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,var(--sun-halo),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 'calc(' + x + ' - 12px)', top: 23, width: 24, height: 24, borderRadius: '50%', background: 'var(--sun)', transition: 'left var(--dur-slow) var(--ease-out)' }} />
        {f < 0.9 && <div style={{ position: 'absolute', right: 20, top: 40, fontSize: 13, color: 'var(--ink-muted)' }}>{nf(target)}</div>}
      </div>
      <div style={{ padding: '0 20px', marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 17 }}>
        <span>{remaining}</span>
        {protein != null && <span style={{ color: 'var(--ink-muted)' }}>Protein {protein}/{proteinTarget} g</span>}
      </div>
    </div>);
}
