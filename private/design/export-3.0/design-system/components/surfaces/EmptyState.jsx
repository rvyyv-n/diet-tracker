import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function EmptyState({ icon, children }) {
  return (
    <div style={{ padding: '28px 20px', boxSizing: 'border-box', borderRadius: 'var(--radius-card)', boxShadow: 'inset 0 0 0 1.5px var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <span style={{ color: 'var(--ink-soft)', display: 'flex' }}><Icon name={icon} size={28} strokeWidth={1.6} /></span>
      <span style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--ink-muted)', maxWidth: 280 }}>{children}</span>
    </div>);
}
