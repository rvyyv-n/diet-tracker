import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Banner({ kind, title, sub, action, onAction }) {
  const K = {
    closed: { bg: 'var(--bg-sunken)', ring: 'none', icon: <Icon name="lock" size={20} /> },
    backfill: { bg: 'transparent', ring: 'inset 0 0 0 1.5px var(--line-strong)', icon: <span style={{ flex: 'none', width: 10, height: 10, borderRadius: '50%', background: 'var(--intake-partial)' }} /> },
    storage: { bg: 'transparent', ring: 'inset 0 0 0 1.5px var(--danger)', icon: <span style={{ color: 'var(--danger)', display: 'flex' }}><Icon name="warn" size={20} /></span> },
  }[kind];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '8px 6px 8px 14px', boxSizing: 'border-box', borderRadius: 'var(--radius-md)', background: K.bg, boxShadow: K.ring }}>
      {K.icon}
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.35 }}><b>{title}</b>{sub && <span style={{ display: 'block', color: 'var(--ink-muted)', fontSize: 14 }}>{sub}</span>}</span>
      {action && <button type="button" onClick={onAction} style={{ flex: 'none', height: 44, padding: '0 12px', border: 0, background: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--accent-text)', cursor: 'pointer' }}>{action}</button>}
    </div>);
}
