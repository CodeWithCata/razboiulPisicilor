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

/** One confetti burst of the boss kill finale: when it goes off (REAL ms after the beat starts) and how many pieces fly. */
export interface BossKillBurstDef {
  atMs: number;
  confetti: number;
}

/**
 * The last hit on a boss: the whole game crawls (same machinery as the last cat of a wave, see `SLOW_MO`), the camera pushes in
 * hard on the boss, then confetti bursts out and hang in the air while the game speeds back up.
 * Times are REAL ms (the beat does not stretch with the slow-mo). The final boss waits for the beat before the victory screen.
 * `enabled: false` = the old boss kill: a freeze (`HIT_STOP.durations.bossDefeated`) and an immediate burst.
 */
export const BOSS_KILL = {
  enabled: true,
  minScale: 0.1,
  zoom: 2.1,
  focus: 0.9,
  inMs: 90,
  holdMs: 1300,
  outMs: 650,
  /** Bursts in order. The first one goes off just after the blow lands, the second when the slow-mo is at its deepest. */
  bursts: [
    { atMs: 120, confetti: 70 },
    { atMs: 650, confetti: 50 },
  ] as readonly BossKillBurstDef[],
} as const;

/** The confetti of the boss kill finale (systems/CelebrationFx.ts). Sizes in px, times in ms (they slow down with the slow-mo). */
export const CONFETTI = {
  depth: 42,
  colors: [0xf5c518, 0xff5ac8, 0x6ee7ff, 0x9be28f, 0xff7a59, 0xffffff] as readonly number[],
  lifespan: { min: 1500, max: 2400 },
  speed: { min: 260, max: 700 },
  /** Degrees, 0 = right, -90 = straight up: a fountain. */
  angle: { min: -130, max: -50 },
  gravityY: 520,
  /** A piece is this wide and tall; it flips over while it falls. */
  widthPx: 18,
  heightPx: 9,
  flipSpeed: 16,
} as const;
