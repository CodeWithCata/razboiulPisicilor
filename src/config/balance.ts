import type Phaser from 'phaser';
/**
 * ALL gameplay numbers live here. Tweak, save, the browser reloads.
 * Sizes are in game pixels (the game is 1280x720), NOT texture pixels,
 * so swapping placeholder art for real sprites never changes gameplay.
 */
/**
 * Screen size. Phaser's Scale.EXPAND (main.ts) treats 1280x720 as the BASE size and then grows ONE side so the canvas fills the whole
 * screen with no bars: a long phone gets a wider canvas (e.g. 1600x720), a tablet a taller one (1280x960). The size can change while
 * the game runs (turning the phone, fullscreen), so `GAME` is live: it reads the scale manager every time. Scenes read it when they are
 * created; core/relayout.ts and the fullscreen wait in MenuScene make sure they are created at the final size.
 * Things hugging the RIGHT or BOTTOM edge use `shiftRight` / `shiftDown` on their 1280x720 position; centered things use GAME.width / 2.
 * Never write a bare 1280 or 720 in layout code.
 */
export const GAME_BASE_WIDTH = 1280;
export const GAME_BASE_HEIGHT = 720;

let scaleManager: Phaser.Scale.ScaleManager | null = null;
/** main.ts hands the game's scale manager over once, right after creating the game. */
export function bindGameSize(scale: Phaser.Scale.ScaleManager): void {
  scaleManager = scale;
}

export const GAME = {
  get width(): number {
    return scaleManager?.width ?? GAME_BASE_WIDTH;
  },
  get height(): number {
    return scaleManager?.height ?? GAME_BASE_HEIGHT;
  },
};
/** An x from the 1280x720 layout that hugs the right edge, moved to the real right edge. */
export const shiftRight = (x: number): number => x + (GAME.width - GAME_BASE_WIDTH);
/** A y from the 1280x720 layout that hugs the bottom edge, moved to the real bottom edge. */
export const shiftDown = (y: number): number => y + (GAME.height - GAME_BASE_HEIGHT);

export const PLAYER = {
  speed: 260,
  maxHp: 100,
  size: 72, // displayed size of Varu
  hitRadius: 20, // hurtbox
  invincibleMs: 700, // i-frames after getting hit
  hurtKnockback: 320,
} as const;

export type BeltAttackId = 'swing' | 'spin' | 'throw';

/** Normal swing: a quick arc in front of Varu. */
export const BELT = {
  range: 75, // how far the belt reaches (from Varu's center, measured to the edge of the cat)
  arcDeg: 80, // width of the swing
  swingMs: 220, // how long the swing takes
  cooldownMs: 300, // pause between swings
  damage: 0.7,
  knockback: 280,
  /** A spin/throw press made while busy is remembered this long and fires as soon as it can. */
  inputBufferMs: 250,
} as const;

/** Spin: a full 360 degree sweep around Varu. Shorter reach, long cooldown, big shove. Good when surrounded. */
export const BELT_SPIN = {
  range: 115,
  arcDeg: 720, // two full turns
  spinMs: 1100,
  cooldownMs: 2200,
  damage: 1.5,
  knockback: 620,
} as const;

/**
 * Throw: the belt flies out where Varu aims, pierces everything, turns around at max range
 * (or when it hits the arena edge) and flies back like a boomerang. Hurts on both legs.
 * While it is away the swing and the spin are unavailable.
 */
export const BELT_THROW = {
  maxRange: 300, // how far it flies before turning around
  outSpeed: 680,
  backSpeed: 780,
  maxOutMs: 900, // safety: turns around after this long even if it somehow has not reached max range
  maxBackMs: 1600, // safety: snaps back to Varu after this long
  hitRadius: 18, // how fat the flying belt is
  catchRadius: 34, // Varu catches it this close
  size: 46, // displayed size
  spinDegPerSec: 1080,
  damage: 0.7,
  knockback: 240,
  cooldownMs: 1200, // starts when Varu catches the belt
  maxFrameMs: 50, // a lag spike never makes the belt jump further than this much time
} as const;

export interface EnemyStats {
  hp: number;
  speed: number;
  size: number;
  hitRadius: number;
  contactDamage: number;
  score: number;
  /** 0 = flies back when hit, 1 = never moves when hit. */
  knockbackResist: number;
}

export const ENEMIES = {
  normal: { hp: 2, speed: 170, size: 56, hitRadius: 16, contactDamage: 8, score: 10, knockbackResist: 0 },
  fat: { hp: 8, speed: 85, size: 100, hitRadius: 38, contactDamage: 14, score: 30, knockbackResist: 0.75 },
  ninja: { hp: 2, speed: 200, size: 54, hitRadius: 15, contactDamage: 10, score: 25, knockbackResist: 0 },
  kamikaze: { hp: 1, speed: 265, size: 52, hitRadius: 15, contactDamage: 0, score: 20, knockbackResist: 0 },
  flying: { hp: 2, speed: 140, size: 60, hitRadius: 17, contactDamage: 6, score: 25, knockbackResist: 0 },
  // Bosses (their attack numbers are in config/bosses.ts). Armor makes belt hits weaker, see BOSS.armor.
  queen: { hp: 30, speed: 70, size: 150, hitRadius: 52, contactDamage: 14, score: 300, knockbackResist: 0.9 },
  mafia: { hp: 36, speed: 80, size: 140, hitRadius: 48, contactDamage: 14, score: 400, knockbackResist: 0.9 },
  federer: { hp: 60, speed: 90, size: 150, hitRadius: 50, contactDamage: 14, score: 1000, knockbackResist: 0.95 },
} as const satisfies Record<string, EnemyStats>;

export type EnemyType = keyof typeof ENEMIES;

export const BOSS_TYPES = ['queen', 'mafia', 'federer'] as const satisfies readonly EnemyType[];
export type BossType = (typeof BOSS_TYPES)[number];

export const isBossType = (type: EnemyType): type is BossType => (BOSS_TYPES as readonly string[]).includes(type);

/** Per-cat special behavior numbers. */
export const NINJA = {
  teleportMinMs: 2400,
  teleportMaxMs: 3800,
  minDistance: 150, // only teleports when farther than this
  vanishMs: 380,
  behindDistance: 110, // lands this far behind Varu's back
} as const;

export const KAMIKAZE = {
  triggerRange: 110, // starts the fuse this close to Varu
  fuseMs: 650,
  fuseSpeedFactor: 0.35,
  blastRadius: 80,
  blastDamage: 22,
} as const;

export const FLYER = {
  preferredDistance: 300,
  shotMinMs: 1700,
  shotMaxMs: 2800,
  projectileSpeed: 270,
} as const;

export interface ProjectileStats {
  size: number;
  hitRadius: number;
  damage: number;
  spinPerSec: number; // degrees
  lifetimeMs: number;
  /** True = the belt sends it back (and it can stun a boss). False = the belt just destroys it. */
  deflectable: boolean;
}

export const PROJECTILES = {
  yarn: { size: 30, hitRadius: 11, damage: 7, spinPerSec: 540, lifetimeMs: 4000, deflectable: false },
  tennis: { size: 36, hitRadius: 13, damage: 10, spinPerSec: 720, lifetimeMs: 5000, deflectable: true },
  smoke: { size: 44, hitRadius: 16, damage: 9, spinPerSec: 120, lifetimeMs: 3500, deflectable: false },
} as const satisfies Record<string, ProjectileStats>;

export type ProjectileKind = keyof typeof PROJECTILES;

export const WAVE_TIMING = {
  firstWaveDelayMs: 1600,
  betweenWavesMs: 3200,
  spawnIntervalMs: 420, // cats trickle in instead of all at once
  maxAlive: 28,
  maxAliveWithSummons: 40, // boss summons stop when this many cats are alive
  clearHeal: 12, // HP restored when a wave is cleared
} as const;

// ---------------------------------------------------------------------------
// Pickups, buffs, laser pointer, Crow Rain
// ---------------------------------------------------------------------------

export type PickupKind = 'crochete' | 'lapte' | 'monster' | 'goldenBelt' | 'laser' | 'crow';

/** Timed effects. Crochete (instant heal) and the crow (one-off event) are not buffs. */
export type BuffKind = 'lapte' | 'monster' | 'goldenBelt' | 'laser';

export interface BuffStats {
  durationMs: number;
  speed?: number; // movement multiplier
  damage?: number; // belt damage multiplier
  range?: number; // belt reach multiplier
}

export const BUFFS: Record<BuffKind, BuffStats> = {
  lapte: { durationMs: 6000, speed: 1.45 },
  monster: { durationMs: 8000, damage: 2 },
  goldenBelt: { durationMs: 7000, damage: 2.5, range: 1.25 },
  laser: { durationMs: 6000 }, // cats chase the red dot, see LASER
};

export const PICKUPS = {
  crocheteHeal: 30,
  size: 52, // displayed size
  hitRadius: 26, // how close Varu needs to be
  lifetimeMs: 13000, // disappears after this long
  blinkMs: 2500, // blinks during the last stretch
} as const;

export const PICKUP_SPAWN = {
  firstDelayMs: 7000,
  minIntervalMs: 9000,
  maxIntervalMs: 15000,
  maxOnField: 3,
  killDropChance: 0.07, // chance a dead cat drops something
  /** The golden belt is guaranteed: first one after this long, then one every `goldenBeltEveryMs`. It ignores `maxOnField`. */
  goldenBeltFirstMs: 12000,
  goldenBeltEveryMs: 25000,
  /** Higher = more common. */
  weights: { crochete: 3, lapte: 2, monster: 2, goldenBelt: 5, laser: 1.5, crow: 1.5 } satisfies Record<PickupKind, number>,
  lowHpThreshold: 0.4, // below this HP fraction...
  lowHpHealBoost: 3, // ...crochete is this many times more likely
} as const;

export const LASER = {
  stopRadius: 22, // cats stop when this close to the dot, so they bunch up
  dotRadius: 9,
} as const;

export type CrowVariant = 'normal' | 'golden' | 'kamikaze' | 'miss';

export const CROW_RAIN = {
  durationMs: 5000,
  dropIntervalMs: 220,
  telegraphMs: 650, // growing shadow = warning time before impact
  targetEnemyChance: 0.7, // otherwise a random spot in the arena
  targetJitter: 60,
  knockback: 520,
  size: 84, // displayed crow size when it lands
  /** Chance per crow; whatever is left over is a normal crow. */
  chances: { miss: 0.1, golden: 0.08, kamikaze: 0.12 },
  variants: {
    normal: { damage: 3, radius: 80 },
    golden: { damage: 10, radius: 115 },
    kamikaze: { damage: 5, radius: 150 },
    miss: { damage: 0, radius: 0 },
  } satisfies Record<CrowVariant, { damage: number; radius: number }>,
} as const;
