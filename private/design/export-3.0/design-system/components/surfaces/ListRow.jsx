import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function ListRow({ title, hint, trailing, danger, onClick, first }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} style={{ width: '100%', boxSizing: 'border-box', border: 0, borderTop: first ? 'none' : '1px solid var(--line)', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit', cursor: onClick ? 'pointer' : 'default',
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 14, alignItems: 'center', minHeight: 60 }}>
      <span><span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--ink)' }}>{title}</span>{hint && <span style={{ display: 'block', fontSize: 14, color: 'var(--ink-muted)' }}>{hint}</span>}</span>
      {trailing === 'chevron' ? <span style={{ color: 'var(--ink-muted)', display: 'flex' }}><Icon name="chevronRight" size={16} /></span> : trailing}
    </Tag>);
}
