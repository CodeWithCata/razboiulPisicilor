import type { BossType } from './balance';

/** Which boss ends the game when beaten. */
export const FINAL_BOSS: BossType = 'federer';

/** Pick the phase-1 or phase-2 value from a pair. */
export const byPhase = <T>(pair: readonly [T, T], phase: number): T => pair[phase >= 2 ? 1 : 0];

export const BOSS = {
  introMs: 1800, // walks in and can't attack yet
  phase2At: 0.5, // phase 2 starts below this HP fraction
  phasePauseMs: 1000,
  stunMs: 2600, // stun from a deflected tennis ball
  stunnedDamageFactor: 2, // belt hits count double while stunned
  /** Multiplier on belt and crow damage. Lower = tougher. */
  armor: { queen: 0.8, mafia: 0.75, federer: 0.5 } satisfies Record<BossType, number>,
  deflectedBallDamage: 8, // a returned ball ignores armor
} as const;

export const QUEEN = {
  preferredDistance: 230,
  cooldownMs: [2300, 1500] as const,
  summonCount: [3, 5] as const,
  summonRadius: 120,
  chargeTelegraphMs: 800,
  chargeMs: 650,
  chargeSpeed: [520, 650] as const,
  chargeDamage: 20,
  phase2Summon: 4,
} as const;

export const MAFIA = {
  keepDistance: 320,
  cooldownMs: [2400, 1600] as const,
  ringCount: [5, 7] as const,
  ringSpreadDeg: 70,
  ringSpeed: 230,
  secondVolleyDelayMs: 450, // phase 2 fires a second volley
  slamTelegraphMs: 800,
  slamRadius: 190,
  slamDamage: 20,
  guardTelegraphMs: 700,
  phase2Summon: 2,
} as const;

export const FEDERER = {
  keepDistance: 380,
  cooldownMs: [1900, 1300] as const,
  ballSpeed: [340, 480] as const, // phase 2 = faster balls
  ballsPerVolley: [3, 5] as const,
  ballIntervalMs: 300,
  volleyTelegraphMs: 450,
  serveTelegraphMs: 950,
  serveRadius: 95,
  serveDamage: 24,
  dashTelegraphMs: 550,
  dashMs: 360,
  dashDistance: 280,
  swingRadius: 150,
  swingDamage: 16,
  ballBoyCount: 3,
  phase2Summon: 2,
} as const;
