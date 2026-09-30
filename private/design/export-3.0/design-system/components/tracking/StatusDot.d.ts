import * as React from 'react';
/**
 * Intake status dot paired with its word — colour is never the only signal. Green = at/above target, gold = partial, red = well under.
 */
export interface StatusDotProps {
  status: 'on-track' | 'partial' | 'low' | 'none';
  /** Override the word; defaults On track / Partial / Low / Not started. Pass "" for dot only. */
  label?: string;
  /** dot px, default 8 */
  size?: number;
}
export declare function StatusDot(props: StatusDotProps): JSX.Element;
