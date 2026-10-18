/**
 * The game clock (core/clock.ts) counts only the time the game is really running.
 * It stops while the pause menu is open, so timers (waves, buffs, cooldowns, boss attacks) wait with it.
 */
export const CLOCK = {
  /**
   * If two frames are further apart than this (ms), the game was not running in between
   * (hidden tab, pause menu, a long freeze) and that gap is NOT counted as game time.
   */
  maxStepMs: 250,
} as const;
