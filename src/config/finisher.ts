/** @file The belt combo finisher: swing, swing, then a bigger third hit. Rhythm numbers, finisher shape, feel, HUD dots. No Phaser. */
import { shiftDown, shiftRight } from './balance';

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
  /** The word over Varu when the finisher swings, and the HUD pips that show the chain. */
  word: { color: '#ffd166', size: 40 },
  pips: {
    r: 7,
    gap: 20,
    y: 150,
    doneColor: 0xf5c518,
    readyColor: 0xff7a59,
    emptyColor: 0x4a5275,
    outlineColor: 0x1b2340,
    /** Phones: the dots sit up-left of the attack button (this is the DEFAULT spot, 1280x720; they follow the button when the player moves or resizes it, see `chainPipsSpot`). */
    touch: { get x() { return shiftRight(1086); }, get y() { return shiftDown(516); }, rScale: 1.25 },
    /** The ready dot pulses; after the finisher all dots flash and clear. */
    readyPulse: { scale: 0.35, ms: 380 },
    flashMs: 260,
    /** How visible the dots are when there is no chain: 0 = hidden until the first swing that hits a cat. */
    idleAlpha: 0,
    /** A dot that was just filled pops from this scale. */
    popFrom: 1.7,
    popMs: 150,
    /** The whole row of dots shakes up and down when a dot fills or the finisher fires (`px` at first, fading out over `ms`, `hz` shakes a second). */
    wobble: { ms: 260, px: 3, hz: 14 },
  },
} as const;
