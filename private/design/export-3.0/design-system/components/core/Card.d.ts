import * as React from 'react';
/**
 * Surface container. raised = default card; outlined = quiet card; sunken; danger = destructive confirm.
 */
export interface CardProps {
  variant?: 'raised' | 'outlined' | 'sunken' | 'danger';
  /** CSS padding, default 16 */
  padding?: number | string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
