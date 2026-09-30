import * as React from 'react';
/**
 * Ring/dot radio mark for option lists (swap options, add-a-block, Look tiles). Presentational — the row is the hit target.
 */
export interface RadioProps {
  selected?: boolean;
  /** px, default 22 */
  size?: number;
}
export declare function Radio(props: RadioProps): JSX.Element;
