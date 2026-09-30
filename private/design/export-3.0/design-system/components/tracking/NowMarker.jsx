import React from 'react';
export function NowMarker({ time }) {
  return (
    <div style={{ position: 'relative', height: 30, margin: '4px 0' }}>
      <div style={{ position: 'absolute', left: 0, right: -20, top: 15, height: 1.5, background: 'linear-gradient(90deg,transparent,var(--now-line) 18%,var(--now-line) 80%,transparent)' }} />
      <span style={{ position: 'absolute', left: 80, top: 8, width: 16, height: 16, borderRadius: '50%', background: 'var(--sun)', boxShadow: '0 0 12px 4px var(--sun-halo)' }} />
      <span style={{ position: 'absolute', left: 8, top: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--bg-canvas)', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
    </div>);
}
