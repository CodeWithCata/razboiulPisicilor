/** What happens when the screen size changes (core/relayout.ts, core/fullscreen.ts). */
export const RELAYOUT = {
  /** Scenes that hold no run state and are rebuilt at the new size. */
  sceneKeys: ['MenuScene', 'AlmanacScene', 'GameOverScene', 'VictoryScene'],
  /** Wait this long (ms) after the last resize event before rebuilding. */
  debounceMs: 160,
  /** Fullscreen is asked for during the menu tap and takes a moment: the run waits at most this long (ms) for the new size. */
  fullscreenWaitMs: 700,
  /** After the first size change the run waits this much longer (ms) for the burst of resize events to end. */
  fullscreenSettleMs: 160,
} as const;
