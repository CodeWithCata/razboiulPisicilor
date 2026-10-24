/** @file The frame-rate limit (core/fpsLimit.ts) and the pause-menu slider that sets it (scenes/PauseScene.ts). */

export const FPS_LIMIT = {
  /**
   * The slider's steps, left to right. One block per step, so keep exactly `AUDIO.volumeSteps` (10) values: the pause menu draws
   * the same blocks as the volume bars. `0` = no limit (the last block, shown as MAX): the game draws on every refresh of the screen.
   * Everything above the screen's refresh rate (a 60 Hz phone with 144 chosen) simply does nothing.
   */
  choices: [30, 40, 50, 60, 75, 90, 120, 144, 165, 0] as readonly number[],
  /** Used until the player moves the slider (saved on the device after that). Phones and tablets: 60 (battery, heat). Computers: no limit. */
  default: { touch: 60, desktop: 0 },
  /**
   * A frame is drawn once at least this share of the wanted frame time has passed. A bit under 1 on purpose: a 60 Hz screen
   * hands out frames 16.6 ms apart (give or take 0.5 ms), and waiting for a full 16.67 ms would sometimes skip one and drop to 30.
   */
  earlyShare: 0.9,
  /** Slow-phone relief (`PERF.adapt`) and the slow-frame counter judge frames against the limit: at 60 fps a frame is 16.7 ms by design. */
  slowShare: 1.4,
  fastShare: 1.1,
} as const;
