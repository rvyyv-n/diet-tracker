import * as React from 'react';
/**
 * Hairline-ruled row of 2–3 figures with captions (blocks eaten, kcal/day).
 */
export interface StatRowProps {
  stats: { value: string; label: string }[];
}
export declare function StatRow(props: StatRowProps): JSX.Element;
