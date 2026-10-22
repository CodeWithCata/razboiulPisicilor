/** @file Dodge roll numbers: key, cooldown, distance, i-frames and the look of the somersault. No Phaser. */
import type { FlipLook } from './animation';

/**
 * Varu's dodge roll (a move, not a pickup): Space on a computer, the "Tumbă" button on a phone.
 * He rolls a short way in the direction he walks (or the way he faces when standing still), cannot be hit while rolling,
 * and has to wait `cooldownMs` (counted from the start of the roll) before the next one.
 * Three phases: WIND-UP (he keeps walking while he crouches and turns toward the roll, the way can still be changed: he never stops),
 * ROLL (starts at the speed he was walking, swells to a push and eases to 0; the push is worked out so `distancePx` is exactly how far he
 * goes if no wall is in the way) and RECOVER (he uncurls and settles).
 */
const WINDUP_MS = 120;
const ROLL_MS = 380;
const RECOVER_MS = 100;
const TOTAL_MS = WINDUP_MS + ROLL_MS + RECOVER_MS;

export const DODGE = {
  enabled: true,
  /** Phaser key name of the desktop key. (Space no longer swings the belt: click does.) */
  key: 'SPACE',
  cooldownMs: 2000,
  /** The three phases (ms) and the whole move. Cannot be hit from `safeFromMs` (inside the wind-up) until the end of the roll + `graceMs`. */
  windupMs: WINDUP_MS,
  rollMs: ROLL_MS,
  recoverMs: RECOVER_MS,
  ms: TOTAL_MS,
  safeFromMs: 70,
  /** How far the roll phase carries him (px). Shorter than before: he rolls, he does not dash. */
  distancePx: 140,
  /** A quick speed boost right after the roll ends: `ms` long, `mult` times his walk speed, full for the first `holdShare` of it, then it eases back to normal. */
  boost: { ms: 500, mult: 1.4, holdShare: 0.5 },
  /** Safe for this long after the roll ends (a hit landing on the last frame still misses). */
  graceMs: 70,
  /** A press made while recharging (or busy) is remembered this long and fires as soon as it can. */
  inputBufferMs: 150,
  /** The "Ratat!" word when a hit misses because of the roll: at most one per this many ms. */
  saveWordEveryMs: 450,
  dust: { count: 8 },
  /**
   * The look: a deep crouch (wind-up), then he tucks into a smaller ball and turns over once along the way he rolls, then a soft landing.
   * Same shape as `ENERGY_FLIP` (config/animation.ts): takeoff / touchdown are the shares of `ms` where the roll phase starts and ends.
   */
  anim: {
    ms: TOTAL_MS,
    jumpPx: 3,
    hop: 0,
    takeoff: WINDUP_MS / TOTAL_MS,
    touchdown: (WINDUP_MS + ROLL_MS) / TOTAL_MS,
    launch: 0.06,
    crouch: { x: 0.2, y: -0.28 },
    stretch: { x: -0.06, y: 0.1 },
    landing: { x: 0.1, y: -0.12 },
    turns: 1,
    minLength: 0.3,
    tuck: 0.82,
    shadowSize: 0.9,
    shadowAlpha: 0.8,
    ghost: { everyMs: 70, lifeMs: 260, alpha: 0.22, tint: 0x9fd3ff, depth: 19 },
  } satisfies FlipLook,
} as const;
