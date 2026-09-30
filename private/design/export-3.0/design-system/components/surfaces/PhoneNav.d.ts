import * as React from 'react';
/**
 * Floating 4-tab pill nav for the phone (Today · Plan · Weight · Settings) with a protective fade above it. Active tab is the ink pill (Reel: sun gradient) with a Look-aware dot. Parent must be position:relative.
 * @startingPoint section="Shell" subtitle="Floating 4-tab phone nav" viewport="390x160"
 */
export interface PhoneNavProps {
  active: 'today' | 'plan' | 'weight' | 'settings';
  onSelect?: (id: string) => void;
  /** floating (default) is absolutely positioned at the parent's foot; static renders in flow. */
  placement?: 'floating' | 'static';
}
export declare function PhoneNav(props: PhoneNavProps): JSX.Element;
