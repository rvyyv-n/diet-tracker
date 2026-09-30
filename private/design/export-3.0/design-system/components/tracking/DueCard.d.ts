import * as React from 'react';
/**
 * The block due now — the only emphasised item on Today. Look-aware surface (Paper: raised with coral edge; Reel: dark/coral panel), display-serif name, Tick as the primary action.
 * @startingPoint section="Today" subtitle="Due-now block card with Tick + Swap" viewport="390x260"
 */
export interface DueCardProps {
  label: string;
  name: string;
  desc?: string;
  kcal: number;
  protein: number;
  swappable?: boolean;
  onTick?: () => void;
  onSwap?: () => void;
  style?: React.CSSProperties;
}
export declare function DueCard(props: DueCardProps): JSX.Element;
