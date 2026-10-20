/** @file Hit-stop (tiny freeze on strong hits) timings per enemy type. */
import type { EnemyType } from './balance';

/**
 * Hit-stop: the game freezes for a split second on strong hits, so they feel heavy.
 * Only the physics (movement) freezes; particles and screen shake keep going, which is what sells it.
 * All times in ms. Set `enabled` to false to turn the whole thing off.
 */
export const HIT_STOP = {
  enabled: true,
  /** Killing one of these cats is a "heavy" kill. */
  heavyKills: ['fat'] as readonly EnemyType[],
  durations: {
    heavyKill: 55,
    playerHurt: 70,
    bossStunned: 110,
    bossDefeated: 240,
  },
  /** After a freeze, the next one can't start for this long. Stops a crowd of hits from freezing the game over and over. */
  minGapMs: 160,
} as const;
