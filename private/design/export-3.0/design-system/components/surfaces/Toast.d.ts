import * as React from 'react';
/**
 * Inverse pill with Undo. Used for tick, weigh-in save and grocery Clear. Sits above the nav on phone, at the foot of the main pane on desktop, never over the nav.
 */
export interface ToastProps {
  message: string;
  actionLabel?: string;
  onUndo?: () => void;
  /** phone: absolute, 92px above the foot. static: in flow. */
  placement?: 'phone' | 'static';
}
export declare function Toast(props: ToastProps): JSX.Element;
