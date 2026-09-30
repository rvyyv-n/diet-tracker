import * as React from 'react';
/**
 * Empty state for weight history and the recipe book only: one muted glyph, one line, no second button.
 */
export interface EmptyStateProps {
  icon: string;
  children: React.ReactNode;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
