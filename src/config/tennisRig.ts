/** @file Numbers for the tennis cat's little rig (racket arm, racket, ball): sway, toss, swing and pop poses. Visual only. */
import { ANIM } from './animation';

/**
 * The tennis cat's moving parts (`entities/enemies/TennisCatRig.ts`). Distances in texture px (her sprite is 96 wide) unless it says game px
 * (she is drawn at 64 game px, so a texture px is about two thirds of a game px).
 */
export const TENNIS_RIG = {
  /** Right above her body (depth 10) and below Varu (20). */
  depth: { racket: 11, arm: 12, ball: 13 },
  /** The racket arm: a small idle sway and a bob while she walks (degrees). The walk bob keeps the pace of her body sway. */
  arm: { idleDeg: 3, idleRate: 0.003, walkDeg: 6, wristIdleDeg: 5, wristIdleRate: 0.0045, radPerPx: ANIM.stridePerPx * ANIM.walk.stride },
  /** The ball in her left paw: a small dribble (game px) while she waits, its size (game px), and how it grows while tossed (per px of lift). */
  ball: { sizePx: 13, dribblePx: 2.5, dribbleRate: 0.008, growPerPx: 0.014, spinPerMs: 0.4 },
  /** The pop where racket meets ball: a ring and a few stars at the strings (game px). */
  hit: { ringPx: 30, ringMs: 220, color: 0xf1fba0, stars: 4, starSizePx: 10, starReachPx: 30, starMs: 320 },
  /** She is beaten: the racket flies off spinning and fades (game px). */
  death: { racketRisePx: 60, racketSpinDeg: 420, lifeMs: 700 },
} as const;

/** Poses of the loose parts. Degrees: positive arm / wrist = turned clockwise (racket swung out to her right and back), negative = swung across the front. */
export const TENNIS_POSES = {
  ready: { armDeg: 0, wristDeg: 0, squash: 0, tiltDeg: 0, ballLift: 0, ballShow: 1 },
  /** The toss: ball up in the air above her left paw, racket cocked way back. */
  toss: { armDeg: 40, wristDeg: 55, squash: 0.07, tiltDeg: -4, ballLift: 30, ballShow: 1 },
  /** The swing: racket whips across the front, a little stretch. */
  smash: { armDeg: -40, wristDeg: -85, squash: -0.12, tiltDeg: 5 },
} as const;

/** Timings (ms). The toss itself takes the rest of her windup (`TENNIS.windUpMs` minus `smash`), so the swing ends the moment the ball leaves. */
export const TENNIS_POSE_MS = {
  smash: 70,
  /** After the hit: hold the follow-through a moment, then lower the racket. */
  backDelay: 140,
  back: 360,
  /** A fresh ball pops into her paw. */
  refillDelay: 220,
  refill: 160,
  /** Serve called off: the ball comes back down and the racket relaxes. */
  relax: 240,
} as const;
