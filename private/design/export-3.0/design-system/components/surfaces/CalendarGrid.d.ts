import * as React from 'react';
/**
 * Month grid for the calendar sheet: 48px day cells with an intake dot beneath the number, today ringed, plus the On track / Partial / Low legend. Put inside Sheet.
 */
export interface CalendarGridProps {
  month: string;
  /** Empty cells before day 1 (Monday-first) */
  leadingBlanks?: number;
  days: { n: number; status: 'on-track' | 'partial' | 'low' | 'today' | 'none' }[];
  note?: string;
  onPick?: (n: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
}
export declare function CalendarGrid(props: CalendarGridProps): JSX.Element;
