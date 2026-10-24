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
  /**
   * The third swing of the chain landing on a cat. The hit event comes once PER CAT the arc touches, so the freeze is asked for only once per
   * swing (`freezeOnceMs` covers the whole 300 ms arc): before v254 every cat restarted the freeze and a crowd froze the game for most of the swing.
   */
  finisher: { shakeMs: 170, shake: 0.011, freezeMs: 60, freezeOnceMs: 450 },
  /** A hit inside a boss's weak-point window, and the window opening. */
  weakHit: { shakeMs: 130, shake: 0.0085, freezeMs: 75 },
  weakOpen: { shakeMs: 90, shake: 0.003 },
  /** The combo reaching a new tier. */
  tierUp: { shakeMs: 130, shake: 0.004, shakePerTier: 0.001, freezeMs: 55 },
  /** No freeze is ever longer than this (ms). */
  maxFreezeMs: 120,
} as const;

/**
 * A tiny camera push-in when the finisher lands on a cat. `SlowMoSystem` owns the camera zoom, so this multiplies with the slow-mo beats
 * instead of fighting them. Times are REAL ms (a hit freeze or the slow-mo never stretches or eats the punch).
 */
export const FINISHER_ZOOM = {
  enabled: true,
  /** The zoom at the peak (1 = none). 1.05 = the view gets 5% closer: it is felt, it does not read as a camera move. */
  peak: 1.05,
  /** Ease in, hold, ease out. */
  inMs: 70,
  holdMs: 60,
  outMs: 260,
  /** A slow-mo beat (last cat of a wave, boss kill) already pushes in hard: no new punch starts while one runs. */
  skipDuringBeat: true,
  /** Players who ask their system for less motion get no punch (shake and freezes stay: they are not a camera move). */
  respectReducedMotion: true,
} as const;

/**
 * The squash a cat gets when a hit lands and it survives: pressed flat ALONG the direction of the blow, bulging sideways, a lean away from
 * the side it came from, then a springy settle with one small overshoot. On top of the white flash (`HIT_FEEL.flash`), it tells you
 * which way the hit came from. Visual only (the hitbox follows the scale by a few percent, like the walk cycle).
 */
export const HIT_SQUASH = {
  enabled: true,
  /** How long it lasts (game ms). */
  ms: 170,
  /** The press reaches its full depth this share of `ms` after the hit (fast: the hit must feel instant). */
  attackShare: 0.22,
  /** 0.3 = a plain cat is 30% shorter along the blow at the deepest point. */
  press: 0.3,
  /** The sideways bulge as a share of the press (1 keeps the volume). */
  bulge: 0.8,
  /** Lean in degrees at full power, away from the side the blow came from. */
  leanDeg: 9,
  /** The settle after the press: `damping` bigger = fewer wobbles, `cycles` = how many swings it makes (1 = one overshoot). */
  settle: { damping: 4, cycles: 1 },
  /** The blow's knockback (before the cat's resistance) divided by this = its power; a plain swing (280) is 1, the finisher about 2.6. */
  refKnockback: 280,
  minPower: 0.7,
  maxPower: 1.5,
  /** Heavy cats squash less (a boss barely, the fat cat some). */
  heavy: { boss: 0.35, fat: 0.6 },
} as const;
