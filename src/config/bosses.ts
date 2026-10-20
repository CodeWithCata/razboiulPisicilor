/** @file Boss numbers: shared BOSS timings, QUEEN (decree, charge, scepter spin), MAFIA (emo cat), FEDERER attack values (volley, serve, dash, ball rain), and which boss is final. */
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
  /** Bosses never turn upside down: they stay upright and only lean this far (degrees) toward Varu, or toward where they dash. 0 = no lean at all. */
  maxLeanDeg: 30,
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
  // Scepter spin: she whirls with her scepter held out. Standing inside the ring hurts every tick.
  spinTelegraphMs: 650,
  spinMs: [700, 950] as const,
  spinTurns: [2, 3] as const,
  spinRadius: 145,
  spinTickMs: 230,
  spinDamage: 9,
  spinDriftSpeed: 150, // she slides toward Varu while spinning
  spinStopDistance: 60, // ...but stops this close so she never sits on top of him
  spinFirstHitMs: 140, // the first damage tick comes this long after the spin starts
  spinRecoverMs: 1500, // dizzy afterwards: the moment to hit her
} as const;

/** The emo cat (internal key `mafia`): broken-heart fans, a screamo shockwave, a ninja crew. */
export const MAFIA = {
  keepDistance: 320,
  cooldownMs: [2400, 1600] as const,
  heartCount: [5, 7] as const,
  heartSpreadDeg: 70,
  heartSpeed: 230,
  secondVolleyDelayMs: 450, // phase 2 fires a second volley
  heartFlash: 0xf777b9, // hot pink glow while it winds up the hearts
  screamTelegraphMs: 800,
  screamRadius: 190,
  screamDamage: 20,
  screamColor: 0xe0409a, // the warning circle on the ground (pink instead of red)
  crewTelegraphMs: 700,
  crewCount: [2, 4] as const, // ninjas only, never other cat types
  crewRadius: 140,
  crewFlash: 0x6a4c93, // dark purple glow while it calls the ninjas
  phase2Summon: 2, // ninjas that jump in when phase 2 starts
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
  /** Ball rain: she smashes balls into the sky and they come down on marked spots (`systems/BallLobSystem.ts`, look in `BALL_LOB`). */
  lob: {
    weight: 1.1,
    telegraphMs: 820,
    balls: [5, 8] as const,
    intervalMs: [210, 150] as const,
    recoverMs: 1300,
    radius: 62, // the ring on the ground = where it hurts
    damage: 11,
    aimEvery: 3, // every 3rd ball comes down where Varu is heading, the others anywhere around him
    leadMs: 430,
    aimJitter: 28,
    scatterMin: 80,
    scatterMax: 340,
    spacing: 84, // balls of one volley land at least this far apart (when there is room)
    edgeMargin: 70,
  },
} as const;
