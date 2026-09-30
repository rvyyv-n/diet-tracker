import * as React from 'react';
/**
 * The Rise wordmark, set in type with the sun disc; use in the nav, splash and first run. There is no drawn logo file.
 */
export interface WordmarkProps {
  /** nav: sun + "Rise" (desktop side nav). reel: italic serif "Rıse" with the sun as the dot. */
  variant?: 'nav' | 'reel';
  /** font-size in px, default 26 */
  size?: number;
}
export declare function Wordmark(props: WordmarkProps): JSX.Element;
