import * as React from 'react';
/**
 * Modal surface: a bottom sheet with grabber on phone, a 520px centred dialog on desktop. Includes the scrim. Parent must be position:relative and clip overflow.
 * @startingPoint section="Shell" subtitle="Bottom sheet (phone) and 520px dialog (desktop)" viewport="390x460"
 */
export interface SheetProps {
  variant?: 'sheet' | 'dialog';
  title: string;
  /** Right-aligned eyebrow, e.g. date or "Today only" */
  meta?: string;
  /** Dialog only: left padding so it centres on the main pane (desktop nav = 256) */
  navInset?: number;
  onClose?: () => void;
  children?: React.ReactNode;
}
export declare function Sheet(props: SheetProps): JSX.Element;
