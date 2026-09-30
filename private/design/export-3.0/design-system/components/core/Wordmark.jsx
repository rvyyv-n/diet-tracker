import React from 'react';
export function Wordmark({ variant = 'nav', size = 26 }) {
  const f = { fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', lineHeight: 1, fontSize: size };
  if (variant === 'nav') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--sun)', boxShadow: '0 0 14px 2px var(--sun-halo)', flex: 'none' }} />
      <span style={f}>Rise</span>
    </span>);
  return (
    <span aria-label="Rise" style={{ ...f, fontStyle: 'italic', display: 'inline-block', whiteSpace: 'nowrap' }}>R
      <span style={{ position: 'relative', display: 'inline-block' }}>{'\u0131'}
        <span style={{ position: 'absolute', left: '50%', top: '.04em', width: '.19em', height: '.19em', transform: 'translateX(-28%)', borderRadius: '50%', background: 'var(--sun)', boxShadow: '0 0 .28em .06em var(--sun-halo)' }} />
      </span>se
    </span>);
}
