import React from 'react';
export function Toast({ message, actionLabel = 'Undo', onUndo, placement = 'phone' }) {
  const abs = placement === 'phone';
  return (
    <div role="status" style={{ position: abs ? 'absolute' : 'relative', left: abs ? '50%' : undefined, transform: abs ? 'translateX(-50%)' : undefined, bottom: abs ? 92 : undefined, zIndex: 30, display: 'inline-flex', alignItems: 'center', gap: 16, height: 52, padding: '0 8px 0 20px', borderRadius: 26,
      background: 'var(--bg-inverse)', color: 'var(--ink-inverse)', boxShadow: 'var(--shadow-float)', fontSize: 15, whiteSpace: 'nowrap' }}>
      {message}
      <button type="button" onClick={onUndo} style={{ height: 40, padding: '0 16px', border: 0, background: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}>{actionLabel}</button>
    </div>);
}
