import * as React from 'react';
/**
 * 52×32 switch. On is the ink track, never green (green means intake on-track).
 */
export interface ToggleProps {
  checked: boolean;
  /** Accessible name */
  label: string;
  onChange?: (checked: boolean) => void;
}
export declare function Toggle(props: ToggleProps): JSX.Element;
