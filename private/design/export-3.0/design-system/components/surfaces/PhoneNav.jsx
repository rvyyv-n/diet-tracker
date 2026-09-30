import React from 'react';
import { Icon } from '../core/Icon.jsx';
const TABS = [['today', 'Today'], ['plan', 'Plan'], ['weight', 'Weight'], ['settings', 'Settings']];
export function PhoneNav({ active, onSelect, placement = 'floating' }) {
  const fl = placement === 'floating';
  return (
    <>
      {fl && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, background: 'linear-gradient(to bottom,transparent,var(--bg-canvas) 70%)', pointerEvents: 'none' }} />}
      <nav style={{ position: fl ? 'absolute' : 'relative', left: 12, right: 12, bottom: 14, height: 64, borderRadius: 32, background: 'var(--nav-bg)', boxShadow: 'var(--nav-edge),var(--nav-shadow)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: 6, boxSizing: 'border-box',
        fontFamily: 'var(--font-caption)', fontSize: 'var(--nav-label-size)', fontWeight: 'var(--nav-label-weight)', letterSpacing: 'var(--label-tracking)', textTransform: 'var(--label-transform)', color: 'var(--nav-ink)' }}>
        {TABS.map(([id, label]) => { const on = id === active; return (
          <button key={id} type="button" aria-current={on ? 'page' : undefined} onClick={() => onSelect && onSelect(id)}
            style={{ position: 'relative', border: 0, cursor: 'pointer', borderRadius: 26, font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: on ? 'var(--nav-active-bg)' : 'transparent', color: on ? 'var(--nav-active-ink)' : 'inherit', boxShadow: on ? 'var(--nav-active-glow)' : 'none', transition: 'background var(--dur-fast) var(--ease-out)' }}>
            {on && <span style={{ position: 'absolute', top: 6, right: 14, width: 6, height: 6, borderRadius: '50%', background: 'var(--nav-dot)' }} />}
            <Icon name={id} size={20} strokeWidth={on ? 1.9 : 1.8} />{label}
          </button>); })}
      </nav>
    </>);
}
