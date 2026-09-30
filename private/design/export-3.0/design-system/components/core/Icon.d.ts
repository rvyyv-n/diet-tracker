import * as React from 'react';
/**
 * Stroke icon from the Rise set (24px grid, round caps); use for nav, status glyphs and aisle marks.
 */
export interface IconProps {
  /** today | plan | recipes | weight | settings | check | lock | warn | info | search | chevronLeft | chevronRight | dairy | pantry | protein | produce */
  name: string;
  /** px, default 20 */
  size?: number;
  /** override stroke width (defaults per icon: 1.8–1.9, check 3.2) */
  strokeWidth?: number;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
