import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Wordmark } from '../core/Wordmark.jsx';
import { StatusDot } from '../tracking/StatusDot.jsx';
const ITEMS = [['today', 'Today'], ['plan', 'Plan'], ['recipes', 'Recipes'], ['weight', 'Weight'], ['settings', 'Settings']];
export function SideNav({ active, onSelect, glance }) {
  return (
    <nav style={{ width: 256, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4, padding: '28px 16px 20px', background: 'var(--bg-sunken)', boxShadow: 'inset -1px 0 0 var(--line)' }}>
      <div style={{ padding: '0 12px 24px' }}><Wordmark variant="nav" /></div>
      {ITEMS.map(([id, label]) => { const on = id === active; return (
        <button key={id} type="button" aria-current={on ? 'page' : undefined} onClick={() => onSelect && onSelect(id)}
          style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', alignItems: 'center', gap: 14, height: 48, padding: '0 14px', border: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 24,
            background: on ? 'var(--nav-active-bg)' : 'transparent', color: on ? 'var(--nav-active-ink)' : 'var(--nav-ink)', boxShadow: on ? 'var(--nav-active-glow)' : 'none',
            fontFamily: 'var(--font-caption)', fontSize: 'var(--nav-label-size)', fontWeight: 700, letterSpacing: 'var(--label-tracking)', textTransform: 'var(--label-transform)' }}>
          <span style={{ display: 'flex' }}><Icon name={id} size={20} /></span><span style={{ fontSize: 15 }}>{label}</span>
          {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--nav-dot)' }} />}
        </button>); })}
      {glance && (
        <div style={{ marginTop: 'auto', borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)', padding: 16 }}>
          <div style={{ fontSize: 'var(--due-label-size)', fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: 'var(--ink-muted)' }}>Today</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 28, fontWeight: 'var(--numeric-weight)', letterSpacing: 'var(--numeric-tracking)', lineHeight: 1 }}>{glance.kcal}</span>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>/ {glance.target} kcal</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}><StatusDot status={glance.status} /></div>
          {glance.latest && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: 14, color: 'var(--ink-muted)' }}>Latest <b style={{ color: 'var(--ink)' }}>{glance.latest}</b></div>}
        </div>)}
    </nav>);
}
