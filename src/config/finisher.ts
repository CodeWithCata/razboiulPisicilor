/** @file The belt combo finisher: swing, swing, then a bigger third hit. Rhythm numbers, finisher shape, feel. No Phaser. */

/**
 * The swing chain. Two plain swings in rhythm, then the THIRD swing is the finisher: a wide, heavy arc that flings cats.
 *
 * Rhythm, not mashing, and still one button:
 *  - Holding the attack button (or tapping steadily) keeps the beat: the next swing starts the moment the pause is over.
 *  - The beat breaks if the next swing starts more than `lateMs` after the pause ended (too slow), or if the button is tapped AGAIN
 *    inside the first `mashShare` of the pause (frantic mashing). A break starts the count over at swing one.
 *  - Using the spin or the throw also starts the count over.
 */
export const BELT_CHAIN = {
  enabled: true,
  /** The finisher is swing number `steps` of a chain. */
  steps: 3,
  /** The next swing must start this long (game ms) after the swing pause ended, at the latest. */
  lateMs: 420,
  /** A fresh tap during this share of the swing pause (from the start of the swing) counts as mashing and breaks the chain. */
  mashShare: 0.45,
  finisher: {
    /** Times the normal swing's reach. */
    rangeFactor: 1.3,
    arcDeg: 160,
    durationMs: 300,
    /** Pause after the finisher (a heavy blow needs a breath), before the next swing. */
    cooldownMs: 520,
    /** Times the normal swing's damage and knockback (the knockback is what flings the cats). */
    damageFactor: 2.4,
    knockbackFactor: 2.6,
    trailDeg: 130,
    back: 1.2,
  },
  /** The word over Varu when the finisher swings. (The three HUD dots that showed the chain were removed in v235.) */
  word: { color: '#ffd166', size: 40 },
} as const;
