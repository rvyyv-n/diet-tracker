import * as React from 'react';
/**
 * Pill button. Primary is the single coral action per view; hero is the Look-aware CTA; danger is destructive-confirm only.
 * @startingPoint section="Core" subtitle="Primary, hero, secondary, text, danger; md 52 / sm 40" viewport="700x260"
 */
export interface ButtonProps {
  /** primary: coral fill. hero: Look-aware (Reel = sun gradient, caps). secondary: outlined. text: link-style. danger: erase/delete. dueCta / dueSecondary: inside DueCard. */
  variant?: 'primary' | 'hero' | 'secondary' | 'text' | 'danger' | 'dueCta' | 'dueSecondary';
  /** md = 52px, sm = 40px */
  size?: 'md' | 'sm';
  /** Icon name from <Icon /> */
  icon?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
