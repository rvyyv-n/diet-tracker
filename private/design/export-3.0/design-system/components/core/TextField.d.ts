import * as React from 'react';
/**
 * 48px labelled field with optional unit suffix, hint and error; radius follows the Look (rounded rect in Paper, pill in Reel).
 */
export interface TextFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Trailing unit, e.g. kg */
  unit?: string;
  hint?: string;
  /** Error text; also draws the danger ring */
  error?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
}
export declare function TextField(props: TextFieldProps): JSX.Element;
