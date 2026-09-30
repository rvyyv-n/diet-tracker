import React from 'react';
import { Icon } from './Icon.jsx';
export function IconButton({ icon, label, disabled, onClick }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      style={{ width: 44, height: 44, borderRadius: 22, border: 0, background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        boxShadow: 'inset 0 0 0 1.5px ' + (disabled ? 'var(--line)' : 'var(--line-strong)'), color: disabled ? 'var(--ink-soft)' : 'var(--ink)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} strokeWidth={2} />
    </button>);
}
