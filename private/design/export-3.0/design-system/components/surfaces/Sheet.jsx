import React from 'react';
export function Sheet({ variant = 'sheet', title, meta, navInset = 0, onClose, children }) {
  const dlg = variant === 'dialog';
  const head = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: dlg ? 'center' : 'baseline' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-md)' }}>{title}</span>
      {meta && <span style={{ fontSize: 'var(--eyebrow-size)', fontWeight: 'var(--eyebrow-weight)', letterSpacing: 'var(--eyebrow-tracking)', textTransform: 'var(--eyebrow-transform)', color: 'var(--ink-muted)' }}>{meta}</span>}
    </div>);
  const surf = { backgroundColor: 'var(--bg-raised)', backgroundImage: 'var(--texture)', boxShadow: 'var(--shadow-float)' };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)' }} />
      {dlg ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: navInset, pointerEvents: 'none' }}>
          <div role="dialog" aria-label={title} style={{ ...surf, pointerEvents: 'auto', width: 520, borderRadius: 28, padding: '24px 26px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>{head}{children}</div>
        </div>
      ) : (
        <div role="dialog" aria-label={title} style={{ ...surf, position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '28px 28px 0 0', padding: '10px 20px 28px' }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line-strong)', margin: '0 auto 14px' }} />
          {head}{children}
        </div>)}
    </div>);
}
