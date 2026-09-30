import * as React from 'react';
/**
 * 44px selectable pill for one-tap answers such as Appetite (Stuffed / Fine / Hungry); tap again to clear.
 */
export interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
export declare function Chip(props: ChipProps): JSX.Element;
