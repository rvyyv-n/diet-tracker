import * as React from 'react';
/**
 * Desktop 256px side nav: sun + wordmark, five destinations (Recipes is a fifth item here), and the Today glance card at the foot.
 * @startingPoint section="Shell" subtitle="Desktop 256px side nav + Today glance" viewport="256x560"
 */
export interface SideNavProps {
  active: 'today' | 'plan' | 'recipes' | 'weight' | 'settings';
  onSelect?: (id: string) => void;
  glance?: { kcal: string; target: string; status: 'on-track' | 'partial' | 'low' | 'none'; latest?: string };
}
export declare function SideNav(props: SideNavProps): JSX.Element;
