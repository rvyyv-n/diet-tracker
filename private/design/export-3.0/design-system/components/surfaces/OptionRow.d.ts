import * as React from 'react';
/**
 * Selectable row for Swap and Add-a-block sheets: radio, name, optional note, kcal over protein.
 */
export interface OptionRowProps {
  name: string;
  note?: string;
  kcal: number;
  protein: number;
  selected?: boolean;
  last?: boolean;
  onClick?: () => void;
}
export declare function OptionRow(props: OptionRowProps): JSX.Element;
