/** @file Dev-only state shared by the debug card (ui) and the cheats (scenes): is the card open, is the mouse on it, which option each picker holds. */

import type { FightReport } from './bossVerdict';

/**
 * Lives outside any scene so the card stays open and the pickers keep their value when a run restarts.
 * `overPanel` is read by the desktop input: a click on the card must not swing the belt.
 */
export const debugState = {
  shown: false,
  overPanel: false,
  /** Index of the chosen option per picker row (by `DebugId`). */
  choice: {} as Record<string, number>,
  /** The picker row that `,` and `.` step (the one used last). */
  active: null as string | null,
  /** Boss lab: every finished duel of this browser session (the scoreboard), and "Duel auto" (a new run starts straight in the duel). */
  book: [] as FightReport[],
  autoDuel: false,
};
