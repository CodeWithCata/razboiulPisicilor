/** @file Hit feel: screen shake and tiny freezes per kind of hit, scaled by the combo tier. No Phaser. */

/**
 * "Juice" numbers. Shake = camera shake (ms, intensity as Phaser takes it: a share of the view, so 0.005 is clearly felt).
 * Freeze = the physics pauses for this long (ms, game time) through HitStop; a freeze never starts within `HIT_STOP.minGapMs` of the last one,
 * so a crowd of kills cannot lock the game. `byTier` lists are indexed by the combo tier (0 = no chain ... 5 = LEGENDAR).
 * A new shake replaces a running one only when it is stronger, so a big hit is never drowned by a small one.
 */
export const HIT_FEEL = {
  enabled: true,
  /** The white blink on a cat when a hit lands (it has always blinked, 80 ms; a little longer now so a hit freeze cannot eat it). */
  flash: { color: 0xffffff, ms: 100 },
  /** Any belt hit that does not kill: barely there, it must not tire the eyes at 8 hits a second. */
  hit: { shakeMs: 45, shake: 0.0014 },
  /** A kill: the shake grows with the combo tier, and the freeze comes in from tier 1. */
  kill: {
    shakeMs: 75,
    shake: 0.003,
    shakePerTier: 0.0007,
    freezeByTier: [0, 18, 24, 32, 42, 54] as readonly number[],
  },
  /** A heavy kill (the fat cat): HitStop already freezes 55 ms for it; the shake is bigger. */
  heavyKill: { shakeMs: 130, shake: 0.0075 },
  /** The third swing of the chain landing on a cat. */
  finisher: { shakeMs: 170, shake: 0.011, freezeMs: 90 },
  /** A hit inside a boss's weak-point window, and the window opening. */
  weakHit: { shakeMs: 130, shake: 0.0085, freezeMs: 75 },
  weakOpen: { shakeMs: 90, shake: 0.003 },
  /** The combo reaching a new tier. */
  tierUp: { shakeMs: 130, shake: 0.004, shakePerTier: 0.001, freezeMs: 55 },
  /** No freeze is ever longer than this (ms). */
  maxFreezeMs: 120,
} as const;
