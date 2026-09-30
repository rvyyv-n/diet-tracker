import React from 'react';
import { Button } from '../core/Button.jsx';
export function DueCard({ label, name, desc, kcal, protein, swappable, onTick, onSwap, style }) {
  return (
    <div style={{ margin: '6px 0 10px 64px', borderRadius: 22, background: 'var(--due-bg)', color: 'var(--due-ink)', boxShadow: 'var(--due-edge),var(--due-glow)', padding: '16px 16px 14px 18px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--due-label-size)', fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: 'var(--due-accent-text)' }}>{label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'var(--due-title-style)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-lg)', lineHeight: 1.05, marginTop: 2 }}>{name}</div>
          {desc && <div style={{ fontSize: 14, color: 'var(--due-ink-muted)', marginTop: 4 }}>{desc}</div>}
        </div>
        <div style={{ textAlign: 'right', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{kcal}</div>
          <div style={{ fontSize: 14, color: 'var(--due-ink-muted)' }}>kcal · {protein} g</div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: swappable ? 'auto 1fr' : '1fr', gap: 10 }}>
        {swappable && <Button variant="dueSecondary" onClick={onSwap}>Swap</Button>}
        <Button variant="dueCta" icon="check" onClick={onTick}>Tick {name}</Button>
      </div>
    </div>);
}
