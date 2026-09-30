import React from 'react';
const P = {
  today: [1.9, <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></>],
  plan: [1.8, <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></>],
  recipes: [1.8, <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>],
  weight: [1.8, <path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>],
  settings: [1.8, <><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></>],
  check: [3.2, <path d="M5 12.5l4.5 4.5L19 7.5"/>],
  lock: [1.8, <><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></>],
  warn: [2, <><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/></>],
  info: [1.8, <><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></>],
  search: [1.8, <><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></>],
  chevronLeft: [2, <path d="M15 6l-6 6 6 6"/>],
  chevronRight: [2, <path d="M9 6l6 6-6 6"/>],
  dairy: [1.9, <path d="M12 3c-3.5 0-6 5-6 9a6 6 0 0 0 12 0c0-4-2.5-9-6-9z"/>],
  pantry: [1.9, <><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9M10 13h4"/></>],
  protein: [1.9, <><path d="M15.5 4.5a5 5 0 0 1 0 7.1l-3.9 3.9-4.1-4.1 3.9-3.9a5 5 0 0 1 4.1-3z"/><path d="M7.5 11.4 4 15a2 2 0 1 0 2.5 3A2 2 0 1 0 9 20.5l3.6-3.5"/></>],
  produce: [1.9, <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6"/></>],
};
export function Icon({ name, size = 20, strokeWidth, style }) {
  const e = P[name]; if (!e) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? e[0]} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', ...style }}>{e[1]}</svg>;
}
