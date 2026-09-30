import * as React from 'react';
/**
 * Settings/Data row: bold title, muted hint, and a chevron or a Toggle. Put inside ListGroup.
 */
export interface ListRowProps {
  title: string;
  hint?: string;
  /** 'chevron' or any node (e.g. <Toggle />) */
  trailing?: 'chevron' | React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  /** Injected by ListGroup */
  first?: boolean;
}
export declare function ListRow(props: ListRowProps): JSX.Element;
