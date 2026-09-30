import * as React from 'react';
/**
 * Seven-day strip, one dot per day coloured by intake status, with the selected day ringed and a Calendar button. Replaces a date stepper.
 */
export interface DotStripProps {
  days: { status: 'on-track' | 'partial' | 'low' | 'today'; selected?: boolean }[];
  /** Text beside the dots, e.g. "Wed 30" */
  label: string;
  onSelect?: (index: number) => void;
  onCalendar?: () => void;
}
export declare function DotStrip(props: DotStripProps): JSX.Element;
