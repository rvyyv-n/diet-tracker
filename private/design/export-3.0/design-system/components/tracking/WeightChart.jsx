import React from 'react';
export function WeightChart({ weights, labels = [], bandLow, bandHigh, emptyText = 'A trend appears after four weigh-ins.' }) {
  const id = React.useId().replace(/:/g, ''), n = weights.length, trend = n >= 4;
  const all = weights.concat(bandLow || [], bandHigh || []);
  const lo = Math.min(...all) - 0.4, hi = Math.max(...all) + 0.4;
  const X = i => n < 2 ? 174 : (i * 348) / (n - 1), Y = v => 144 - ((v - lo) / (hi - lo)) * 124;
  const avg = weights.map((_, i) => { const s = weights.slice(Math.max(0, i - 3), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; });
  const pts = (arr, from = 0) => arr.map((v, i) => i >= from ? X(i) + ',' + Y(v) : null).filter(Boolean).join(' ');
  const band = bandLow && bandHigh ? bandHigh.map((v, i) => X(i) + ',' + Y(v)).join(' ') + ' ' + bandLow.map((v, i) => X(i) + ',' + Y(v)).reverse().join(' ') : null;
  const last = n - 1;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: -20, right: -20, top: '85%', height: 1.5, background: 'linear-gradient(90deg,transparent,var(--horizon) 12%,var(--horizon) 88%,transparent)' }} />
      <svg viewBox="-8 0 364 176" style={{ width: '100%', display: 'block', overflow: 'visible', position: 'relative' }}>
        <defs>
          <linearGradient id={id + 'sky'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F29A6E" stopOpacity=".38" /><stop offset="1" stopColor="#F8C28E" stopOpacity=".12" /></linearGradient>
          <radialGradient id={id + 'sun'} cx=".4" cy=".38" r=".6"><stop offset="0" stopColor="#ffd392" /><stop offset=".45" stopColor="#f8a959" /><stop offset="1" stopColor="#e0673f" /></radialGradient>
          <radialGradient id={id + 'glow'}><stop offset="0" stopColor="#f8a959" stopOpacity=".5" /><stop offset="1" stopColor="#f8a959" stopOpacity="0" /></radialGradient>
        </defs>
        {trend && band && <><polygon points={band} style={{ fill: 'var(--chart-band)', opacity: 'var(--band-flat)' }} /><polygon points={band} fill={'url(#' + id + 'sky)'} style={{ opacity: 'var(--band-sky)' }} /></>}
        {trend && <polyline points={pts(avg, 3)} fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        <g style={{ fill: 'var(--ink)' }}>{weights.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="3" />)}</g>
        {trend && <><circle cx={X(last)} cy={Y(avg[last])} r="26" fill={'url(#' + id + 'glow)'} /><circle cx={X(last)} cy={Y(avg[last])} r="8" fill={'url(#' + id + 'sun)'} /></>}
      </svg>
      {!trend && n > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 24, textAlign: 'center', fontSize: 14, color: 'var(--ink-muted)' }}>{emptyText}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -12, fontSize: 12, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>{[0, 1, 2].map(i => <span key={i}>{labels[i]}</span>)}</div>
    </div>);
}
