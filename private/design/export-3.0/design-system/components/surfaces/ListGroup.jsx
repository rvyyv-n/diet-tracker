import React from 'react';
export function ListGroup({ children }) {
  const kids = React.Children.toArray(children);
  return (
    <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)', padding: '0 16px' }}>
      {kids.map((k, i) => React.isValidElement(k) ? React.cloneElement(k, { first: i === 0 }) : k)}
    </div>);
}
