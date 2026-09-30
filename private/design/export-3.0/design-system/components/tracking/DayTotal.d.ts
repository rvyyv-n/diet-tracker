import * as React from 'react';
/**
 * The Today hero: kcal figure in the numeric face, a bar on the horizon line coloured by intake status, and the sun riding the bar end. Runs edge to edge; it pads its own text by the gutter.
 * @startingPoint section="Today" subtitle="Hero kcal figure, status bar on the horizon, sun" viewport="390x260"
 */
export interface DayTotalProps {
  eyebrow: string;
  kcal: number;
  target: number;
  status: 'on-track' | 'partial' | 'low' | 'none';
  /** Bold-then-plain remaining line; pass JSX like <><b>825</b> kcal to go</> */
  remaining?: React.ReactNode;
  protein?: number;
  proteinTarget?: number;
}
export declare function DayTotal(props: DayTotalProps): JSX.Element;
