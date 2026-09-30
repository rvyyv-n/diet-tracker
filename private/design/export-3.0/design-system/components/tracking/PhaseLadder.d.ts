import * as React from 'react';
/**
 * Three-rung phase ladder (Ramp-up / Target / Pushed). The active rung sits on a sunken tile with a coral dot; past rungs are grey. Every rung has a status word.
 */
export interface PhaseLadderProps {
  rungs: { name: string; status: string; when: string; kcal: string; protein: string; state: 'past' | 'now' | 'next' }[];
}
export declare function PhaseLadder(props: PhaseLadderProps): JSX.Element;
