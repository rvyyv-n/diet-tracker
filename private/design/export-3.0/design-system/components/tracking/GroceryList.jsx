import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function GroceryList({ aisles, scaleNote, onToggle, onClear }) {
  const any = aisles.some(a => a.items.some(i => i.done));
  return (
    <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)', padding: '6px 16px 16px' }}>
      {aisles.map((a, ai) => (
        <div key={ai} style={{ paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-caption)', fontSize: 'var(--caption-size)', fontWeight: 'var(--caption-weight)', letterSpacing: 'var(--caption-tracking)', textTransform: 'var(--caption-transform)' }}>
            {a.icon && <span style={{ color: 'var(--ink-soft)', display: 'flex' }}><Icon name={a.icon} size={16} /></span>}{a.name}
          </div>
          <div style={{ marginTop: 4 }}>
            {a.items.map((it, ii) => (
              <button key={ii} type="button" onClick={() => onToggle && onToggle(ai, ii)}
                style={{ width: '100%', border: 0, borderTop: '1px solid var(--line)', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit', display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto', alignItems: 'center', columnGap: 14, minHeight: 52 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: it.done ? 'var(--ink)' : 'transparent', boxShadow: it.done ? 'none' : 'inset 0 0 0 1.5px var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-canvas)' }}>{it.done && <Icon name="check" size={15} />}</span>
                <span style={{ fontSize: 17, color: it.done ? 'var(--ink-muted)' : 'var(--ink)', textDecoration: it.done ? 'line-through' : 'none', textDecorationColor: 'var(--ink-soft)' }}>{it.name}</span>
                <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: it.done ? 'var(--ink-muted)' : it.changed ? 'var(--accent-text)' : 'var(--ink)' }}>{it.qty}</span>
              </button>))}
          </div>
        </div>))}
      <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{scaleNote}</span>
        <button type="button" onClick={onClear} style={{ flex: 'none', height: 40, padding: '0 16px', borderRadius: 20, border: 0, background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: any ? 'var(--ink)' : 'var(--ink-soft)' }}>Clear</button>
      </div>
    </div>);
}
