import React from 'react';
export function Eyebrow({ children, trailing }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 'var(--eyebrow-size)', fontWeight: 'var(--eyebrow-weight)', letterSpacing: 'var(--eyebrow-tracking)', textTransform: 'var(--eyebrow-transform)', color: 'var(--eyebrow-ink)' }}>
      <span>{children}</span>{trailing}
    </div>);
}
