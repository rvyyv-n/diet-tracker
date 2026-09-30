import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function BlockRow({ time, name, kcal, state = 'idle', tag, tagEmphasis, link, onToggle, onLink }) {
  const S = {
    idle: { ms: 28, bg: 'var(--bg-canvas)', ring: 'inset 0 0 0 1.5px var(--ink-soft)', tc: 'var(--ink-muted)', nc: 'var(--ink)', ns: 18, kw: 700, kc: 'var(--ink)' },
    done: { ms: 28, bg: 'var(--ink)', ring: 'none', tc: 'var(--ink-muted)', nc: 'var(--ink)', ns: 18, kw: 700, kc: 'var(--ink)', check: 1 },
    receded: { ms: 28, bg: 'var(--bg-canvas)', ring: 'inset 0 0 0 1.5px var(--line-strong)', tc: 'var(--ink-soft)', nc: 'var(--ink-muted)', ns: 16, kw: 400, kc: 'var(--ink-muted)' },
    closed: { ms: 24, bg: 'transparent', ring: 'inset 0 0 0 1.5px var(--line-strong)', tc: 'var(--ink-soft)', nc: 'var(--ink-muted)', ns: 16, kw: 400, kc: 'var(--ink-muted)' },
    closedDone: { ms: 24, bg: 'var(--ink-soft)', ring: 'none', tc: 'var(--ink-soft)', nc: 'var(--ink-muted)', ns: 16, kw: 400, kc: 'var(--ink-muted)', check: 1 },
    off: { ms: 28, bg: 'transparent', ring: 'none', tc: 'var(--ink-muted)', nc: 'var(--ink)', ns: 18, kw: 700, kc: 'var(--ink)', diamond: 1 },
  }[state];
  const tagC = tagEmphasis && state === 'idle' ? 'var(--accent-text)' : 'var(--ink-muted)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '58px 32px minmax(0,1fr) auto', alignItems: 'center', columnGap: 12, minHeight: 58, paddingLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ textAlign: 'right', fontSize: 14, lineHeight: 1.15, color: S.tc }}>{time}{state === 'off' && <><br /><span style={{ fontSize: 11 }}>off plan</span></>}</span>
      <button type="button" aria-label={name} onClick={onToggle} disabled={!onToggle} style={{ width: 28, height: 28, padding: 0, border: 0, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onToggle ? 'pointer' : 'default' }}>
        <span style={{ width: S.ms, height: S.ms, borderRadius: '50%', background: S.bg, boxShadow: S.ring, color: 'var(--bg-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--dur-fast) var(--ease-out)' }}>
          {S.check && <Icon name="check" size={14} />}
          {S.diamond && <span style={{ width: 12, height: 12, borderRadius: 3, transform: 'rotate(45deg)', background: 'var(--ink)' }} />}
        </span>
      </button>
      <span style={{ minWidth: 0, fontSize: S.ns, color: S.nc }}>{name}
        {link && <button type="button" onClick={onLink} style={{ border: 0, background: 'none', padding: 0, marginLeft: 6, color: 'var(--accent-text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{link}</button>}
        {tag && <span style={{ marginLeft: 6, fontSize: 14, color: tagC, fontWeight: tagEmphasis && state === 'idle' ? 700 : 400 }}>{tag}</span>}
      </span>
      <span style={{ fontSize: 16, fontWeight: S.kw, color: S.kc }}>{kcal}</span>
    </div>);
}
