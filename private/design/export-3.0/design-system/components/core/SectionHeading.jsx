import React from 'react';
export function SectionHeading({ children, meta }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontFamily: 'var(--section-font)', fontSize: 'var(--section-size)', fontWeight: 'var(--section-weight)', letterSpacing: 'var(--section-tracking)', textTransform: 'var(--section-transform)', color: 'var(--section-ink)' }}>{children}</span>
      {meta && <span style={{ fontSize: 14, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>{meta}</span>}
    </div>);
}
