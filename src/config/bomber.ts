/** @file Numbers for Pisica Bombardier (the bomber cat): where she stands, how she winds up and lobs the fans' petard. No Phaser. */
import { Tex } from '../assets/keys';
import { ANIM } from './animation';

/**
 * Pisica Bombardier (`entities/enemies/BomberCat.ts`): the strongest walking cat. She keeps her distance, strafes, stops, lifts a petard
 * over her head (the wind-up Varu can read) and lobs it at him. It is the SAME petard the fans throw (`FAN_THROW.petard` in
 * config/fanThrow.ts: ring, fuse, blast, damage): `systems/FanThrowSystem.ts` flies and explodes it. Her own stats are in `ENEMIES.bomber`.
 * All times are game ms, all sizes game px.
 */
export const BOMBER = {
  /** She walks closer when farther than preferredDistance + band, backs off when closer than preferredDistance - band, else circles Varu. */
  preferredDistance: 380,
  band: 70,
  retreatSpeedFactor: 0.8,
  retreatStep: 200,
  /** Time between throws (random in the range); the first one is a bit later so a fresh cat does not throw at once. */
  throwMinMs: 3200,
  throwMaxMs: 4600,
  firstThrowMs: { min: 1800, max: 3200 },
  /** She stops and lifts the petard this long before the throw (orange flash). */
  windUpMs: 800,
  windUpColor: 0xff8a3c,
  /** She throws only from `minRangePx` out to `maxRangePx` away from Varu (the lob flies over walls, so no clear line is needed). */
  minRangePx: 200,
  maxRangePx: 640,
  /** After a throw she may lob a second petard at once, after a shorter wind-up. */
  volley: { chance: 0.3, windUpMs: 450 },
  /** She aims ahead of a walking Varu (`factor` of his walk during the flight, never more than `maxPx`) and misses by up to `scatterPx`. */
  lead: { factor: 0.5, maxPx: 110 },
  scatterPx: 45,
  /** The petard never lands closer than this to the fence. */
  wallMargin: 70,
  turnRate: 0.15,
  /** While she waits for the next throw she circles Varu sideways, turning the other way now and then. */
  strafe: { speedFactor: 0.5, stepPx: 120, flipMs: { min: 1000, max: 2000 } },
  /** The petard she holds up during the wind-up: it sits `aboveHandPx` above her raised paw (upright, in world space) and throbs. */
  held: { tex: Tex.Petard, sizePx: 40, aboveHandPx: 22, throb: { amount: 0.1, hz: 6 } },
} as const;

/**
 * v170 The bomber's throwing arm (`entities/enemies/BomberCatRig.ts`), a loose layer like the tennis cat's racket arm. Angles in degrees:
 * 0 = the arm hangs at her side, negative = turned counter-clockwise, up and forward. Distances in texture px (96 wide, drawn at 72 game px).
 */
export const BOMBER_RIG = {
  /** Above her body (depth 10) and below Varu (20). */
  depth: 12,
  /** A small idle sway and a bob while she walks (degrees); the walk bob keeps the pace of her body sway. */
  arm: { idleDeg: 3, idleRate: 0.003, walkDeg: 5, radPerPx: ANIM.stridePerPx * ANIM.walk.stride },
} as const;

/** Poses of the arm: `squash` (+ = crouch, - = stretch) and `tiltDeg` are read by her body. */
export const BOMBER_POSES = {
  ready: { armDeg: 0, squash: 0, tiltDeg: 0 },
  /** The wind-up: the arm goes up beside her head (the petard sits above the paw). */
  raise: { armDeg: -78, squash: 0.04, tiltDeg: -2 },
  /** Just before the throw: the arm cocks back a little further and she crouches. */
  cock: { armDeg: -92, squash: 0.09, tiltDeg: -5 },
  /** The throw: the arm whips forward, a stretch. */
  throw: { armDeg: -128, squash: -0.12, tiltDeg: 4 },
} as const;

/** Timings (ms). The raise takes `raiseShare` of the wind-up, the cock the rest. */
export const BOMBER_POSE_MS = {
  raiseShare: 0.75,
  throw: 80,
  /** After the throw: hold the follow-through a moment, then lower the arm. */
  backDelay: 130,
  back: 380,
  /** The throw was called off: the arm comes back down. */
  relax: 240,
} as const;
