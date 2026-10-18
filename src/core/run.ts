/** Which way the game is being played. Passed to GameScene (and on to UIScene / PauseScene / end screens). */
export type RunMode = 'campaign' | 'endless';

export interface RunOptions {
  mode: RunMode;
}

export const DEFAULT_RUN: RunOptions = { mode: 'campaign' };

/** Scene data is untyped at runtime (and empty on a plain `scene.start`), so always go through this. */
export const readRun = (data: Partial<RunOptions> | undefined): RunOptions => ({ ...DEFAULT_RUN, ...data });
