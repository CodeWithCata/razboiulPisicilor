/** @file ALL gameplay numbers (player, belt, enemies, bosses, waves timing, pickups, buffs, laser, crow rain) and the live GAME size getters. */
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
  /** How fast Varu grows / shrinks to the size a bad buff asks for (the "Big Varu" pickup): share of the way per second. */
  sizeEasePerSec: 6,
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
  /** Pisica Norocoasă (see LUCKY): never hurts, only runs. Two swings, a spin or a throw catch her. Not in any wave table: systems/LuckyCatSystem.ts sends her. */
  lucky: { hp: 1, speed: 215, size: 56, hitRadius: 16, contactDamage: 0, score: 150, knockbackResist: 0 },
  /** Pisica de Tenis (see TENNIS): a walking ranged cat. Keeps her distance and serves tennis balls the belt can swat back. */
  tennis: { hp: 2, speed: 150, size: 64, hitRadius: 16, contactDamage: 6, score: 30, knockbackResist: 0 },
  // Bosses (their attack numbers are in config/bosses.ts). Armor makes belt hits weaker, see BOSS.armor.
  queen: { hp: 30, speed: 70, size: 150, hitRadius: 52, contactDamage: 14, score: 300, knockbackResist: 0.9 },
  mafia: { hp: 46, speed: 80, size: 140, hitRadius: 48, contactDamage: 14, score: 400, knockbackResist: 0.9 },
  federer: { hp: 75, speed: 90, size: 150, hitRadius: 50, contactDamage: 14, score: 1000, knockbackResist: 0.95 },
} as const satisfies Record<string, EnemyStats>;

export type EnemyType = keyof typeof ENEMIES;

export const BOSS_TYPES = ['queen', 'mafia', 'federer'] as const satisfies readonly EnemyType[];
export type BossType = (typeof BOSS_TYPES)[number];

export const isBossType = (type: EnemyType): type is BossType => (BOSS_TYPES as readonly string[]).includes(type);

/** Per-cat special behavior numbers. */
export const NINJA = {
  teleportMinMs: 4200, // v141 nerf: was 2400 to 3800 (a teleport roughly every 5 s instead of every 3 s)
  teleportMaxMs: 6500,
  minDistance: 220, // only teleports when farther than this (was 150)
  vanishMs: 520, // gone this long before it lands (was 380): more time to see it coming
  behindDistance: 170, // lands this far behind Varu's back (was 110): not right on top of him
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

/**
 * Pisica de Tenis (`entities/enemies/TennisCat.ts`): walks (no flying), keeps `preferredDistance` from Varu and serves a tennis ball
 * (the same deflectable `tennis` projectile Federer uses). Before each serve she stops and winds up (a yellow-green flash) so Varu can
 * react. She only serves with a clear line to Varu (walls stop balls), and follows the laser dot like the ground cats (no serving then).
 * All times are game ms.
 */
export const TENNIS = {
  /** She walks closer when farther than preferredDistance + band, backs off when closer than preferredDistance - band, else holds and faces Varu. */
  preferredDistance: 340,
  band: 60,
  /** Backing off is a bit slower than walking, and aims this far (px) behind her. */
  retreatSpeedFactor: 0.8,
  retreatStep: 220,
  /** Time between serves (random in the range), the first one is a bit later so a fresh cat does not fire at once. */
  shotMinMs: 2200,
  shotMaxMs: 3400,
  firstShotMs: { min: 1200, max: 2400 },
  /** She stops and winds up this long before the ball leaves (flash color = the ball's). */
  windUpMs: 450,
  windUpColor: 0xc9e33a,
  /** Serves only from this far (px) out to this far; the ball leaves her racket, `muzzle` px in front of her. */
  minShotRange: 160,
  maxShotRange: 620,
  muzzle: 28,
  projectileSpeed: 340,
  /** Aim error (degrees, +/-), so she is not a perfect shot. */
  spreadDeg: 4,
  /** The corners of the world stay this far away from her backing-off target (px). */
  wallMargin: 80,
  /** How often she re-checks that nothing blocks the line to Varu (ms), and how fast she turns to face him (radians per frame). */
  sightMs: 150,
  turnRate: 0.15,
  /** She does not stand still while she waits for the next serve: she circles Varu sideways, and turns the other way now and then. */
  strafe: { speedFactor: 0.55, stepPx: 120, flipMs: { min: 900, max: 1900 } },
  /** She aims ahead of a walking Varu: `factor` = how much of his walk during the ball's flight she leads (1 = perfect shot), never more than `maxPx`. */
  lead: { factor: 0.6, maxPx: 110 },
  /**
   * A ball Varu swatted back at her (a friendly tennis ball coming straight at her): when it is `senseRange` away she decides, once per ball:
   * return it (`chance`: she stops and smashes it back at Varu, faster, once it is inside `reachPx`), jump out of the way (`dodgeChance`), or take it.
   * A returned ball is a normal tennis ball again, Varu can swat it back again (a rally), but she returns one ball at most `maxReturns` times.
   * `chance` grows with the waves (see `scale`): `base` at the tennis cat's first wave, `perWave` more each wave after it, never above `max`.
   * If she could NOT answer a ball she gets angry: her next serve is the fireball.
   */
  ret: {
    chance: { base: 0.4, perWave: 0.035, max: 0.6 },
    dodgeChance: 0.3,
    senseRange: 240,
    /** The ball must be flying at her: not more than this far (px) off her middle. */
    lateralPx: 45,
    reachPx: 56,
    /** The racket starts to swing this far (px) before the ball is in reach, so the hit lands on time. */
    swingLeadPx: 32,
    speedFactor: 1.15,
    maxSpeed: 560,
    maxReturns: 3,
    /** After a return she cannot return again for this long (ms). */
    cooldownMs: 1200,
    dodgeMs: 380,
    dodgeSpeedFactor: 1.5,
  },
  /** Wave numbers: the return and fireball chances start growing from the tennis cat's first wave (config/waves.ts). */
  scale: { fromWave: 8 },
  /** The fireball: a longer windup (red flash) so Varu can see it coming; picked at random, and always after a ball she could not answer. */
  fire: { chance: { base: 0.2, perWave: 0.035, max: 0.4 }, minGapMs: 5000, windUpMs: 700, windUpColor: 0xff4a2a, projectileSpeed: 340, spreadDeg: 3 },
} as const;

/**
 * Cat pinball: a cat flung by the belt that slams into another cat hurts it (systems/PinballSystem.ts).
 * Each bump passes on only `transfer` of the speed, so a swing bumps once and a spin can chain two or three.
 */
export const PINBALL = {
  enabled: true,
  /** The flung cat must be at least this fast (px/s) to count. A plain swing flings at BELT.knockback (280). */
  minSpeed: 200,
  /** Damage to the cat that gets hit. */
  damage: 1,
  /** The cat that gets hit is shoved at this share of the flung cat's speed (below 1, so chains die out). */
  transfer: 0.6,
  /** One cat can be bumped again only after this long, so a pile-up isn't damage every frame. */
  victimGapMs: 350,
} as const;

/**
 * "Predarea pisicilor": when only a few cats are left, there is a SMALL chance they give up, wave a white flag, walk off and the wave
 * counts as cleared (systems/SurrenderSystem.ts decides WHEN, `Enemy.surrender()` is the cat itself). A rare, funny reward, not a way to win.
 * All times are game ms (the game clock, so the pause menu stops them).
 */
export const SURRENDER = {
  enabled: true,
  // --- WHEN (checked every frame; one roll per wave, the first moment all of these are true) ---
  /** Chance of the one roll. */
  chance: 0.15,
  /** At most this many cats alive, AND Varu killed at least `minKills` of this wave's cats. */
  maxAlive: 2,
  minKills: 5,
  /** The wave must have run this long, with every cat already spawned (queue empty, none still hiding in a bush). */
  minWaveMs: 15000,
  /** Waves started in this run before the first one that may roll (2 = never in the first wave; an endless run counts from its own first wave). Bosses and the final wave never roll. */
  minRunWave: 2,
  /** Never in the wave right after a surrender, and at most this many per run. */
  maxPerRun: 3,
  /** Not while Varu is below this share of his health (a surrender while he is dying would feel like a cheat). */
  minVaruHpFraction: 0.3,
  /** Points for the wave's surrender (once, not per cat). */
  score: 50,
  // --- HOW the cat leaves ---
  /** Stands still waving the flag (and says its line) before it walks. flagMs + fadeMs must stay above SLOW_MO.windowMs (config/slowMo.ts): that is why the last-cat slow-mo never fires after a surrender. */
  flagMs: 1500,
  /** Walking speed: this share of the cat's own speed, but never slower than `minWalkSpeed` (px/s, so a fat cat still gets somewhere). */
  walkSpeedFactor: 0.7,
  minWalkSpeed: 120,
  /** It counts as gone once it is this close to its exit (px). */
  exitRadius: 28,
  /** Safety: after this long walking, it fades where it stands, so a stuck cat can never hold the wave. */
  walkTimeoutMs: 4000,
  /** Fade-out before the cat is removed. */
  fadeMs: 600,
  /** Without enemy spawn points in the map the exit is the nearest world edge, this far inside it (px). */
  edgeInset: 40,
  /** The line above the cat (Effects): how long it stays put before it floats up and fades, its size and colour, and its height above the cat (px). */
  line: { holdMs: 1200, size: 26, color: '#ffffff', offsetY: -64 },
  /** The little white flag, drawn in code: the anchor is a share of the cat's size from its centre, then a pole and a cloth that ripples. */
  flag: {
    depth: 12,
    anchorX: 0.3,
    anchorY: -0.15,
    poleLen: 34,
    poleWidth: 3,
    poleColor: 0xb98a4f,
    clothW: 24,
    clothH: 15,
    clothColor: 0xffffff,
    outlineColor: 0x1b2340,
    outlineWidth: 2,
    /** The wave: how fast it flutters (Hz), how far the pole top sways sideways and how far the cloth's free edge ripples up and down (px). */
    waveHz: 2.2,
    swayPx: 4,
    ripplePx: 3,
  },
} as const;

/**
 * Pisica Norocoasă (the lucky cat): now and then a golden cat shows up in a normal wave and RUNS from Varu. Catch her before she
 * gets away and she drops a pile of pickups. She never hurts and the wave never waits for her (`Enemy.isBonus`).
 * systems/LuckyCatSystem.ts decides WHEN (game clock), `entities/enemies/LuckyCat.ts` is the cat. All times are game ms.
 */
export const LUCKY = {
  enabled: true,
  /** One roll per wave, at the start of the wave. Never in boss waves, the final wave or the first wave of the run. */
  chance: 0.12,
  minRunWave: 2,
  /** At least this many waves without her between two visits, and at most this many visits per run. */
  minWavesBetween: 2,
  maxPerRun: 4,
  /** She shows up this long after the wave starts (random in the range), and only if that wave is still going. */
  delayMs: { min: 4000, max: 10000 },
  /** She runs for this long, then vanishes in a puff. */
  lifeMs: 10000,
  /** Running away: every `retargetMs` she looks at the directions below (degrees off straight-away-from-Varu), keeps the ones with a clear line
   *  of `fleeStep` px (at least `minStep` of real travel) and takes the one that ends up farthest from Varu, minus `turnPenalty` px per 45 degrees of turning. */
  retargetMs: 200,
  fleeStep: 280,
  minStep: 80,
  turnPenalty: 45,
  turnStepsDeg: [0, 45, -45, 90, -90, 135, -135],
  /** Her targets stay this far inside the world edge (px). */
  wallMargin: 70,
  /** Catching her: this many pickups (the usual random ones) land in a ring of this radius around the spot. */
  dropCount: 3,
  dropRadius: 46,
  /** The show: gold sparks when she appears and when she is caught, and the camera shake of a catch. */
  fx: { appearSparks: 18, catchSparks: 34, catchShakeMs: 160, catchShake: 0.007 },
} as const;

export interface ProjectileStats {
  size: number;
  hitRadius: number;
  damage: number;
  spinPerSec: number; // degrees
  lifetimeMs: number;
  /** True = the belt sends it back (and it can stun a boss). False = the belt just destroys it. */
  deflectable: boolean;
  /** True = the belt cannot touch it at all (it neither sends it back nor breaks it). Walls, its lifetime and Varu still end it. */
  indestructible?: boolean;
  /** How many hits of the THROWN belt it takes to break it (default 1). A swing or a spin always breaks it in one. The belt flies out and back, so 2 = out and back. */
  throwHits?: number;
  /** Homing (only for the ones the boss spawns with `homing: true`): it turns toward Varu at `turnRadPerSec` for `followMs`, then flies straight; `lifetimeMs` replaces its normal life. */
  homing?: { readonly turnRadPerSec: number; readonly followMs: number; readonly lifetimeMs: number };
}

export const PROJECTILES = {
  yarn: { size: 30, hitRadius: 11, damage: 7, spinPerSec: 540, lifetimeMs: 4000, deflectable: false },
  tennis: { size: 36, hitRadius: 13, damage: 10, spinPerSec: 720, lifetimeMs: 5000, deflectable: true },
  /** The tennis cat's red serve: a little harder than the green ball. The belt can neither send it back nor break it. */
  fireball: { size: 36, hitRadius: 13, damage: 13, spinPerSec: 720, lifetimeMs: 5000, deflectable: false, indestructible: true },
  /** The emo cat's broken heart. v148: the thrown belt needs 2 hits (out and back) to break it; the slow "sad" hearts home in on Varu for a while. */
  heart: { size: 42, hitRadius: 15, damage: 11, spinPerSec: 100, lifetimeMs: 3500, deflectable: false, throwHits: 2, homing: { turnRadPerSec: 1.5, followMs: 3200, lifetimeMs: 5200 } },
  sparkle: { size: 28, hitRadius: 10, damage: 7, spinPerSec: 360, lifetimeMs: 2600, deflectable: false }, // the queen's scepter sparkles (spin and scepter throw)
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

export type PickupKind = 'crochete' | 'lapte' | 'monster' | 'goldenBelt' | 'laser' | 'crow' | 'mystery' | 'snail' | 'dumbbell' | 'emo' | 'rusty' | 'big' | 'smoke';

/** The BAD pickups: they only ever come out of the question mark (their spawn weight is 0), never lie on the floor by themselves. */
export const BAD_PICKUPS = ['snail', 'dumbbell', 'emo', 'rusty', 'big', 'smoke'] as const;
export type BadKind = (typeof BAD_PICKUPS)[number];
export type GoodPrize = Exclude<PickupKind, 'mystery' | BadKind>;
export const isBadPickup = (kind: PickupKind): kind is BadKind => (BAD_PICKUPS as readonly string[]).includes(kind);

/** What the question mark can turn into: every pickup except itself, good or bad. */
export type MysteryPrize = GoodPrize | BadKind;

/** Timed effects. Crochete (instant heal), the crow (one-off event) and the question mark (turns into one of the others) are not buffs. The snail, dumbbell, emo, rusty belt and big Varu are timed BAD effects (`bad: true`); the smoke break is a bad one-off (Varu freezes, `SMOKE_FREEZE`). */
export type BuffKind = 'lapte' | 'monster' | 'goldenBelt' | 'laser' | 'snail' | 'dumbbell' | 'emo' | 'rusty' | 'big';

export interface BuffStats {
  durationMs: number;
  speed?: number; // movement multiplier
  damage?: number; // belt damage multiplier
  range?: number; // belt reach multiplier
  /** A bad effect: speed / damage / range are BELOW 1 and the worst one wins (a good buff takes the best). Good and bad then multiply. */
  bad?: boolean;
  /** Bad effects only, ABOVE 1 (higher = worse, the highest wins): the pause between plain swings, the cooldown of the spin and the throw, and Varu's size (body and hurtbox). */
  swingCooldown?: number;
  specialCooldown?: number;
  size?: number;
}

export const BUFFS: Record<BuffKind, BuffStats> = {
  lapte: { durationMs: 6000, speed: 1.45 },
  monster: { durationMs: 8000, damage: 2 },
  goldenBelt: { durationMs: 7000, damage: 2.5, range: 1.25 },
  laser: { durationMs: 6000 }, // cats chase the red dot, see LASER
  snail: { durationMs: 6000, speed: 0.55, bad: true }, // the snail: Varu crawls
  dumbbell: { durationMs: 6000, damage: 0.5, bad: true }, // the dumbbell: the belt feels heavy and hits for half
  emo: { durationMs: 7000, swingCooldown: 2, specialCooldown: 1.5, bad: true }, // emo: he can't be bothered, slow swings (300 -> 600 ms), slow spin and throw; hood up and broken hearts over his head
  rusty: { durationMs: 7000, specialCooldown: 2.5, bad: true }, // the rusty belt: the spin and the throw take 2.5x as long to come back
  big: { durationMs: 8000, size: 1.4, speed: 0.85, bad: true }, // Big Varu: a bigger body and hurtbox (easier to hit), a bit slower
};

/** The smoke break (a bad one-off, no timer): Varu freezes (no walking, no new swings) while he takes a drag of his cigarette. */
export const SMOKE_FREEZE = {
  ms: 1000,
} as const;

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
  weights: { crochete: 3, lapte: 2, monster: 4, goldenBelt: 5, laser: 1.5, crow: 1.5, mystery: 2, snail: 0, dumbbell: 0, emo: 0, rusty: 0, big: 0, smoke: 0 } satisfies Record<PickupKind, number>, // the bad ones never spawn alone: only the question mark gives them
  lowHpThreshold: 0.4, // below this HP fraction...
  lowHpHealBoost: 3, // ...crochete is this many times more likely
} as const;

/** The question mark is a GAMBLE: Varu grabs it, a beat later it turns into a good OR a bad pickup and that one takes effect. */
export const MYSTERY = {
  /** The pause (game ms) between grabbing the "?" and the reveal (the suspense). */
  revealMs: 700,
  /** Chance (0..1) that the prize is a BAD one (the snail, dumbbell, emo, rusty belt, big Varu or the smoke break). 0 = never, 1 = always. */
  badChance: 0.4,
  /** When the prize is good: higher = more likely. Equal = every good prize is as likely as the others. */
  goodWeights: { crochete: 1, lapte: 1, monster: 1, goldenBelt: 1, laser: 1, crow: 1 } satisfies Record<GoodPrize, number>,
  /** When the prize is bad: which one. */
  badWeights: { snail: 1, dumbbell: 1, emo: 1, rusty: 1, big: 1, smoke: 1 } satisfies Record<BadKind, number>,
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
