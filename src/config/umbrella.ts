/** @file The umbrella power-up: what it blocks, how the canopy over Varu looks and moves. Duration lives in BUFFS (balance.ts). */

export const UMBRELLA = {
  /** Which petard-style blasts the umbrella stops (the `source` of the `Explosion` event). Other blasts (kamikaze, boss attacks) still hurt. */
  blockedBlastSources: ['petard'] as readonly string[],
  /** The tennis cat's ball rain (`BallLanded`) is stopped too: the umbrella is over his head. */
  blocksBallRain: true,
  canopy: {
    /** Displayed width and height (px) of the canopy seen from above. */
    size: 124,
    alpha: 0.9,
    /** Where it sits relative to Varu (px; negative = up). */
    offsetY: -6,
    /** Draw order: just above Varu's body parts (they use 19-22). */
    depth: 23,
    /** Turns slowly while it is open (degrees per second). */
    spinDegPerSec: 28,
    /** Pops open from this fraction of its size, in this many ms. */
    popFrom: 0.2,
    popMs: 220,
    /** The last stretch blinks: the umbrella is about to close. */
    blinkMs: 1500,
    blinkEveryMs: 140,
    /** A block makes the canopy jump to this scale and settle back. */
    blockBump: 1.12,
    blockBumpMs: 110,
  },
} as const;
