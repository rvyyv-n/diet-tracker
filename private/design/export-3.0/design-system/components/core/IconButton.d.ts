import * as React from 'react';
/**
 * 44px circular icon button with a visible outline; always give it an accessible label.
 */
export interface IconButtonProps {
  icon: string;
  /** Accessible name — required. */
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
