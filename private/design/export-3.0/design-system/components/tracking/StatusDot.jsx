import React from 'react';
const MAP = { 'on-track': ['var(--intake-on-track)', 'On track'], partial: ['var(--intake-partial)', 'Partial'], low: ['var(--intake-low)', 'Low'], none: ['var(--ink-soft)', 'Not started'] };
export function StatusDot({ status, label, size = 8 }) {
  const [c, w] = MAP[status] || MAP.none; const t = label ?? w;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: size, height: size, borderRadius: '50%', background: c, flex: 'none' }} />{t}</span>;
}
