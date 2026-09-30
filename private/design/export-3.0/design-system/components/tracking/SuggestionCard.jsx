import React from 'react';
import { Button } from '../core/Button.jsx';
export function SuggestionCard({ title, body, label = 'Suggestion', applyLabel = 'Apply', dismissLabel = 'Not now', onApply, onDismiss }) {
  return (
    <div style={{ borderRadius: 22, background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)', padding: 18 }}>
      <div style={{ fontSize: 'var(--due-label-size)', fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: 'var(--accent-text)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-md)', lineHeight: 1.2, marginTop: 6 }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink-muted)', marginTop: 6 }}>{body}</div>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
        <Button variant="secondary" onClick={onDismiss}>{dismissLabel}</Button>
        <Button onClick={onApply}>{applyLabel}</Button>
      </div>
    </div>);
}
