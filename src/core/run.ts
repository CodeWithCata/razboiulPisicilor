/** @file Which way the game is being played (campaign, endless, custom), the custom setup a run carries, which modes keep a record, and the "a run is starting" flag. */
import type { CustomSetup } from '../config/customGame';
import { getCustomSetup } from './customGame';

/** Which way the game is being played. Passed to GameScene (and on to UIScene / PauseScene / end screens). */
export type RunMode = 'campaign' | 'endless' | 'custom';

/** The modes that keep a best score (a custom game has none: its rules change every time). */
export type RecordMode = Exclude<RunMode, 'custom'>;

/** The record mode of a run, or null for a custom game. */
export const recordModeOf = (mode: RunMode): RecordMode | null => (mode === 'custom' ? null : mode);

export interface RunOptions {
  mode: RunMode;
  /** Custom games only: the setup this run plays (a new object per change, so it stays the one the run started with). */
  custom?: CustomSetup;
}

export const DEFAULT_RUN: RunOptions = { mode: 'campaign' };

/** Scene data is untyped at runtime (and empty on a plain `scene.start`), so always go through this. */
export function readRun(data: Partial<RunOptions> | undefined): RunOptions {
  const run: RunOptions = { ...DEFAULT_RUN, ...data };
  // A custom run that came without a setup (a restart from a scene that forgot it) plays the one saved on this device.
  if (run.mode === 'custom' && !run.custom) return { ...run, custom: getCustomSetup() };
  return run;
}

/**
 * True from the start tap on the menu until the game scene takes over (fullscreen wait + opening videos).
 * While it is set the menu must stay as it is: a resize-triggered rebuild would restart the menu music under the intro.
 */
let startingRun = false;
export const isStartingRun = (): boolean => startingRun;
export const setStartingRun = (value: boolean): void => {
  startingRun = value;
};
