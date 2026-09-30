import * as React from 'react';
/**
 * Small label above a screen title or hero number; Paper = sentence-case 15px, Reel = spaced caps 12px.
 */
export interface EyebrowProps {
  children: React.ReactNode;
  /** Right-aligned slot, e.g. a status dot + word */
  trailing?: React.ReactNode;
}
export declare function Eyebrow(props: EyebrowProps): JSX.Element;
