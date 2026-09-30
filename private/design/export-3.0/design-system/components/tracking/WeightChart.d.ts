import * as React from 'react';
/**
 * Weekly weigh-ins as dots, a 4-week rolling-average line, an optional target band, and the sun on the latest average. The horizon runs full-bleed; axis labels are HTML in --ink-muted so they follow the theme.
 * @startingPoint section="Weight" subtitle="Weigh-in dots, rolling average, sun" viewport="390x260"
 */
export interface WeightChartProps {
  weights: number[];
  /** Three axis labels: first, middle, last */
  labels?: [string, string, string];
  /** Optional band around the trend, same length as weights */
  bandLow?: number[];
  bandHigh?: number[];
  /** Shown when fewer than 4 weigh-ins */
  emptyText?: string;
}
export declare function WeightChart(props: WeightChartProps): JSX.Element;
