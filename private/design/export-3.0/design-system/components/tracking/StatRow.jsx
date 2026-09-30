import React from 'react';
export function StatRow({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + stats.length + ',1fr)', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ padding: i ? '12px 0 12px 12px' : '12px 0', borderLeft: i ? '1px solid var(--line)' : 'none' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{s.label}</div>
        </div>))}
    </div>);
}
