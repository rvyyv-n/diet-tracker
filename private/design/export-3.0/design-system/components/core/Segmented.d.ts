import * as React from 'react';
/**
 * Segmented control on a sunken track; the selected segment is an ink pill. Used for Log-food tabs and the Theme setting.
 */
export interface SegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange?: (value: string) => void;
}
export declare function Segmented(props: SegmentedProps): JSX.Element;
