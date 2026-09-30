import React from 'react';
export function Radio({ selected, size = 22 }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', flex: 'none', display: 'inline-block', boxShadow: selected ? 'inset 0 0 0 ' + Math.round(size * 0.32) + 'px var(--ink)' : 'inset 0 0 0 1.5px var(--ink-soft)' }} />;
}
