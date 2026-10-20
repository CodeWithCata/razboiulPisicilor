/** @file Slow-mo numbers for the last cat of a wave (Clone Drone style: long crawl, hard push-in on the final kill). No Phaser. */
export const SLOW_MO = {
  enabled: true,
  /** The wave must end this soon (game ms) after the kill for it to count as "the last cat". */
  windowMs: 800,
  /** Speed during the beat (1 = normal): the WHOLE game runs this fast: Varu, cats, physics, timers, tweens, particles, the crowd. */
  minScale: 0.12,
  /** The crowd in the stands crawls too (false = it keeps roaring at full speed while the game crawls). */
  slowCrowd: true,
  /** Camera zoom at the deepest point (1 = none). */
  zoom: 1.7,
  /** How far the camera slides from Varu toward the cat that just fell (0 = stays on Varu, 1 = centred on the kill). */
  focus: 0.55,
  /** Real time, ms: ease into the slow-motion, hold it, ease back out. */
  inMs: 140,
  holdMs: 1500,
  outMs: 700,
} as const;
