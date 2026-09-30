import * as React from 'react';
/**
 * Weekly grocery checklist grouped by aisle, with a per-aisle icon, tabular quantities and a scale note + Clear. Ticked items strike through and quiet down; quantities changed by a phase change show in accent text.
 * @startingPoint section="Plan" subtitle="Grocery checklist by aisle" viewport="390x520"
 */
export interface GroceryListProps {
  aisles: { name: string; icon?: 'dairy' | 'pantry' | 'protein' | 'produce'; items: { name: string; qty: string; done?: boolean; changed?: boolean }[] }[];
  scaleNote?: string;
  onToggle?: (aisleIndex: number, itemIndex: number) => void;
  onClear?: () => void;
}
export declare function GroceryList(props: GroceryListProps): JSX.Element;
