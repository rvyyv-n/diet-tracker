import * as React from 'react';
/**
 * One meal block in the day checklist: time, marker, name, kcal. States: idle, done, receded (earlier and unticked — quieter, never red), closed (past day), off (off-plan food).
 * @startingPoint section="Today" subtitle="Checklist row: idle, done, receded, closed, off-plan" viewport="390x420"
 */
export interface BlockRowProps {
  time: string;
  name: string;
  kcal: number;
  /** idle: unticked, current | done: ticked | receded: earlier and unticked | closed / closedDone: closed past day | off: off-plan food */
  state?: 'idle' | 'done' | 'receded' | 'closed' | 'closedDone' | 'off';
  /** Small inline tag such as "add-on" or "most skipped" */
  tag?: string;
  /** Accent-weight tag (Shake "most skipped") */
  tagEmphasis?: boolean;
  /** Inline text action: Swap, Remove */
  link?: string;
  onToggle?: () => void;
  onLink?: () => void;
}
export declare function BlockRow(props: BlockRowProps): JSX.Element;
