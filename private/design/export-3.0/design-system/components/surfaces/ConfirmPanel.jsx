import React from 'react';
import { Button } from '../core/Button.jsx';
export function ConfirmPanel({ title, body, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return (
    <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', boxShadow: 'inset 0 0 0 1.5px var(--danger)', padding: 18 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-muted)' }}>{body}</div>
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="text" onClick={onCancel} style={{ color: 'var(--ink)', padding: '0 14px' }}>{cancelLabel}</Button>
      </div>
    </div>);
}
