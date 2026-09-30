import * as React from 'react';
/**
 * Section title inside a screen: 18px display serif in Paper, 11px spaced caps in Reel. Optional right-aligned meta.
 */
export interface SectionHeadingProps {
  children: React.ReactNode;
  meta?: React.ReactNode;
}
export declare function SectionHeading(props: SectionHeadingProps): JSX.Element;
