/** @file Boss weak-point windows: a short moment after a boss's big attack when hits do extra damage. No Phaser. */
import type { BossType } from './balance';

/**
 * Each boss opens a window right after its big attack (the queen after the red carpet, the emo cat after the scream, Federer after the
 * racket smash). While it is open the boss takes `damageFactor` times the damage, a ring pulses on it, and a hit shows "PUNCT SLAB!".
 * It is a reward for learning the pattern: dodge the big one, then go in. The emo cat already is wide open after a scream
 * (`MAFIA.shield.exhaustedFactor`), so his extra factor here is small: the two multiply.
 */
export const WEAK_POINT = {
  enabled: true,
  /** How long the window stays open (game ms). */
  windowMs: { queen: 1500, mafia: 1600, federer: 1300 } satisfies Record<BossType, number>,
  /** Damage multiplier while it is open (on top of armor). */
  damageFactor: { queen: 1.8, mafia: 1.25, federer: 1.7 } satisfies Record<BossType, number>,
  marker: {
    color: 0xffe066,
    hitColor: 0xffffff,
    /** Ring size as a multiple of the boss's displayed size, and its pulse. */
    sizeFactor: 0.95,
    pulse: 0.1,
    pulseMs: 260,
    alpha: 0.9,
    depth: 16,
    /** The last share of the window the ring blinks (it is about to close). */
    blinkShare: 0.25,
  },
  /** Look of the words (the words themselves are in content/juice.ts) and the sparks of a hit. */
  fx: { wordColor: '#ffe066', wordSize: 40, openSize: 34, sparks: 16, wordGapMs: 350 },
} as const;
