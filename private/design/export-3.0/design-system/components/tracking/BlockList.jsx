import React from 'react';
export function BlockList({ children }) {
  return (
    <div style={{ position: 'relative', isolation: 'isolate', padding: '0 20px 0 0' }}>
      <div style={{ position: 'absolute', zIndex: -1, left: 87, top: 8, bottom: 8, width: 2, background: 'var(--line)' }} />
      {children}
    </div>);
}
