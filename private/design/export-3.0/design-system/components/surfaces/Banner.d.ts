import * as React from 'react';
/**
 * Inline notice under the header. closed = a view-only past day; backfill = yesterday unfinished (gold dot, neutral edge); storage = write failure (danger edge). Never red for a missed block.
 */
export interface BannerProps {
  kind: 'closed' | 'backfill' | 'storage';
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}
export declare function Banner(props: BannerProps): JSX.Element;
