import * as React from 'react';
/**
 * Inline destructive confirm with a danger outline (Erase everything, Delete recipe). Names exactly what is removed; keep the Undo path in the copy.
 */
export interface ConfirmPanelProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
export declare function ConfirmPanel(props: ConfirmPanelProps): JSX.Element;
