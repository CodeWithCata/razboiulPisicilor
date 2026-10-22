/** Which way the game is being played. Passed to GameScene (and on to UIScene / PauseScene / end screens). */
export type RunMode = 'campaign' | 'endless';

export interface RunOptions {
  mode: RunMode;
}

export const DEFAULT_RUN: RunOptions = { mode: 'campaign' };

/** Scene data is untyped at runtime (and empty on a plain `scene.start`), so always go through this. */
export const readRun = (data: Partial<RunOptions> | undefined): RunOptions => ({ ...DEFAULT_RUN, ...data });

/**
 * True from the start tap on the menu until the game scene takes over (fullscreen wait + opening videos).
 * While it is set the menu must stay as it is: a resize-triggered rebuild would restart the menu music under the intro.
 */
let startingRun = false;
export const isStartingRun = (): boolean => startingRun;
export const setStartingRun = (value: boolean): void => {
  startingRun = value;
};
