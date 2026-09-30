import * as React from 'react';
/**
 * Engine suggestion. Always offers Not now + Apply; nothing changes the plan without a tap. Copy states facts, never verdicts.
 */
export interface SuggestionCardProps {
  title: string;
  body: string;
  label?: string;
  applyLabel?: string;
  dismissLabel?: string;
  onApply?: () => void;
  onDismiss?: () => void;
}
export declare function SuggestionCard(props: SuggestionCardProps): JSX.Element;
