/** @file Living-arena numbers: prop springs, FX, kickables, rock cracks, hide-and-seek, bed cages, hp / smash, gold leaf, fence splinters. */
import type { SoundId } from '../assets/audioKeys';
import { Tex, type TexKey } from '../assets/keys';
import type { ObjectName } from './arena';
import type { CrowVariant } from './balance';

/**
 * Living arena: bushes, rocks, boxes, scratchers, beds, fences, cans and the ball react when something touches them.
 * All numbers live here (the code is in systems/props/). Set `PROP_TUNING.enabled` to false to get the old still arena back.
 * Sizes are game pixels, times are ms, angles are degrees unless the name says otherwise.
 */

/** Everything in the arena that reacts. The 2x2 objects use their `OBJECTS` names (config/arena.ts). */
export type PropKind = ObjectName | 'fence' | 'cans' | 'ball' | 'barrel' | 'lamp';
/** Props that wobble on springs (the kickable cans and ball use KICKABLE instead). */
export type SpringKind = ObjectName | 'fence';
/** Decor you can kick across the floor. */
export type KickKind = 'cans' | 'ball';

/** Particle recipes, see PROP_FX. */
export type FxId = 'leaf' | 'stone' | 'wood' | 'cardboard' | 'fluff' | 'fiber' | 'dust' | 'glint' | 'goo';
/** Little things props do all by themselves. */
export type AmbientAction = 'leaf' | 'glint' | 'zzz' | 'purr';

export const PROP_TUNING = {
  enabled: true,
  /** A long frame (tab in the background) never makes the springs jump: time steps are capped here. */
  maxFrameMs: 50,
  /** Springs swing a bit less than the speed they are kicked with: this makes a kick of "peak X" really peak near X. */
  kickGain: 1.1,
  /** Gravity for the little hop a box makes (px/s squared). */
  hopGravity: 2400,
  /** Things this far outside the screen still animate (so nothing pops in when the camera arrives). */
  viewMargin: 120,
  /** One prop can only be hit this often by walking/projectiles (the belt hits once per swing instead). */
  hitCooldownMs: 140,
  /** A hit weaker than this is ignored. */
  minPower: 0.08,
  /** The belt reaches a prop this much farther than its listed range (props are big, the range is measured to the edge). */
  reachSlack: 6,
  /** Floating words ("FÂȘ!"). Quiet hits (rolling, landing) never show one. */
  words: { minPower: 0.3, cooldownMs: 110, size: 20 },
  /** Walking into a prop. Speeds in px/s. */
  bump: { minSpeed: 70, fullSpeed: 260, power: 0.55, probe: 48, flyerPower: 0.3, flyerCooldownMs: 450 },
  /** Belt: power of a swing and of a spin on props. */
  sweep: { swing: 0.85, spin: 1 },
  /** The thrown belt passes through props. */
  flight: { power: 0.8, cooldownMs: 300 },
  /** Blasts (explosions, crows). The wave travels outward at `speed` px/s, so far props react later. */
  shock: {
    speed: 900,
    reachFactor: 1.25,
    explosion: 1,
    /** A ball of the tennis cat's rain. */
    ball: 0.45,
    crow: { normal: 0.6, golden: 0.9, kamikaze: 0.8, miss: 0.25 } satisfies Record<CrowVariant, number>,
  },
  /** Fence: a hit shakes that piece, then the neighbors along the fence one after another. */
  fence: { rippleSteps: 3, falloff: 0.6, stepDelayMs: 50, cooldownMs: 160 },
} as const;

/** How a springy prop moves. `hz` is swings per second, `damping` 0 = rings forever, 1 = no wobble at all. */
export interface PropFeel {
  hz: number;
  damping: number;
  /** Peak lean (degrees) when hit at full power from the side. */
  tiltDeg: number;
  /** Peak squash (0.2 = 20% flatter, then it overshoots into a stretch). */
  squash: number;
  /** Peak shove in px, away from the hit. */
  nudge: number;
  /** Height (px) of the hop at full power. 0 = stays on the ground. */
  hop: number;
  /** Where it turns, 0 = top edge, 1 = bottom edge of its picture. */
  pivot: number;
  /** Idle wind: leans left and right all the time. */
  sway?: { deg: number; hz: number };
  /** Idle breathing: squashes a tiny bit up and down. */
  breathe?: { amount: number; hz: number };
}

export const PROP_FEEL: Record<SpringKind, PropFeel> = {
  bush: { hz: 3.2, damping: 0.16, tiltDeg: 9, squash: 0.15, nudge: 3, hop: 0, pivot: 0.86, sway: { deg: 0.9, hz: 0.42 } },
  rock: { hz: 10, damping: 0.24, tiltDeg: 1.6, squash: 0.035, nudge: 2.6, hop: 0, pivot: 0.86 },
  box: { hz: 4.6, damping: 0.2, tiltDeg: 7, squash: 0.18, nudge: 4, hop: 9, pivot: 0.86 },
  scratcher: { hz: 2.5, damping: 0.1, tiltDeg: 12, squash: 0.06, nudge: 2, hop: 0, pivot: 0.9 },
  bed: { hz: 3, damping: 0.14, tiltDeg: 2, squash: 0.27, nudge: 2, hop: 0, pivot: 0.84, breathe: { amount: 0.012, hz: 0.33 } },
  bedCushion: { hz: 3.2, damping: 0.13, tiltDeg: 2.5, squash: 0.3, nudge: 2, hop: 0, pivot: 0.84, breathe: { amount: 0.014, hz: 0.3 } },
  fence: { hz: 6.5, damping: 0.17, tiltDeg: 6, squash: 0.03, nudge: 2.4, hop: 0, pivot: 0.9 },
};

/** What a hit looks and sounds like, per kind. */
export interface PropLook {
  sound: SoundId;
  /** Pitch multiplier for the sound (1 = as written). */
  pitch: number;
  /** CSS color of the floating word. */
  wordColor: string;
  /** Particle bursts at full power: [recipe, count]. */
  fx: ReadonlyArray<readonly [FxId, number]>;
  /** Screen shake at full power (0 = none). Only for heavy things. */
  shake?: number;
  /** What it does by itself now and then, and how often it is picked (bigger = more often). */
  ambient?: { action: AmbientAction; weight: number };
}

export const PROP_LOOK: Record<PropKind, PropLook> = {
  bush: { sound: 'rustle', pitch: 1, wordColor: '#b8f0a0', fx: [['leaf', 7]], ambient: { action: 'leaf', weight: 3 } },
  rock: { sound: 'thud', pitch: 1, wordColor: '#e6e6ee', fx: [['stone', 5], ['glint', 3], ['dust', 3]], shake: 0.0014, ambient: { action: 'glint', weight: 1 } },
  box: { sound: 'knock', pitch: 1, wordColor: '#f0d9a8', fx: [['cardboard', 6], ['dust', 3]], ambient: { action: 'purr', weight: 0.6 } },
  scratcher: { sound: 'knock', pitch: 1.25, wordColor: '#ffd9a8', fx: [['fiber', 8], ['dust', 2]] },
  bed: { sound: 'boing', pitch: 0.9, wordColor: '#ffb3cf', fx: [['fluff', 9]], ambient: { action: 'zzz', weight: 1 } },
  bedCushion: { sound: 'boing', pitch: 1.1, wordColor: '#ffd1e0', fx: [['fluff', 12]], ambient: { action: 'zzz', weight: 1 } },
  fence: { sound: 'knock', pitch: 0.7, wordColor: '#f0d9a8', fx: [['wood', 4], ['dust', 2]], shake: 0.0012 },
  cans: { sound: 'clank', pitch: 1, wordColor: '#bfe6ff', fx: [['glint', 5]], ambient: { action: 'glint', weight: 0.8 } },
  ball: { sound: 'boing', pitch: 1.35, wordColor: '#ffe066', fx: [] },
  barrel: { sound: 'knock', pitch: 0.7, wordColor: '#ffd84a', fx: [['goo', 5]] },
  lamp: { sound: 'clank', pitch: 0.8, wordColor: '#ffe9a0', fx: [['glint', 6]], shake: 0.0012 },
};

/** Particle recipes. Same shape as the other emitters in systems/Effects.ts. */
export interface FxDef {
  tex: TexKey;
  tint: readonly number[];
  lifespan: { min: number; max: number };
  speed: { min: number; max: number };
  gravityY: number;
  scale: { start: number; end: number };
  alpha: { start: number; end: number };
  /** Tumbles while it flies. */
  spin: boolean;
}

export const PROP_FX: Record<FxId, FxDef> = {
  leaf: { tex: Tex.Leaf, tint: [0x8fdc72, 0x6cbd58, 0xa9d982, 0x58a84c], lifespan: { min: 800, max: 1300 }, speed: { min: 50, max: 200 }, gravityY: 150, scale: { start: 0.85, end: 0.45 }, alpha: { start: 1, end: 0 }, spin: true },
  stone: { tex: Tex.Chip, tint: [0x9aa0b0, 0xc6cad6, 0x7d8497], lifespan: { min: 380, max: 580 }, speed: { min: 90, max: 230 }, gravityY: 560, scale: { start: 1, end: 0.4 }, alpha: { start: 1, end: 0 }, spin: true },
  wood: { tex: Tex.Chip, tint: [0xc98f4f, 0xe0b070, 0x8b5a2b], lifespan: { min: 380, max: 600 }, speed: { min: 80, max: 210 }, gravityY: 520, scale: { start: 1, end: 0.4 }, alpha: { start: 1, end: 0 }, spin: true },
  cardboard: { tex: Tex.Chip, tint: [0xd9a766, 0xc6925a, 0xe8c48c], lifespan: { min: 450, max: 700 }, speed: { min: 70, max: 190 }, gravityY: 380, scale: { start: 1.15, end: 0.5 }, alpha: { start: 1, end: 0 }, spin: true },
  fluff: { tex: Tex.Particle, tint: [0xffffff, 0xfff3d6, 0xffd6dc], lifespan: { min: 650, max: 1000 }, speed: { min: 30, max: 110 }, gravityY: -35, scale: { start: 0.55, end: 0.1 }, alpha: { start: 0.95, end: 0 }, spin: false },
  fiber: { tex: Tex.Chip, tint: [0xd8b779, 0xc9a45f, 0xeed39a], lifespan: { min: 450, max: 750 }, speed: { min: 50, max: 150 }, gravityY: 200, scale: { start: 0.7, end: 0.3 }, alpha: { start: 1, end: 0 }, spin: true },
  dust: { tex: Tex.Particle, tint: [0xd9c7a0, 0xc8b68c], lifespan: { min: 420, max: 640 }, speed: { min: 25, max: 90 }, gravityY: 0, scale: { start: 0.4, end: 1.2 }, alpha: { start: 0.5, end: 0 }, spin: false },
  goo: { tex: Tex.Particle, tint: [0xf2b632, 0xf8d56b, 0xe9b02e, 0xc98a1a], lifespan: { min: 450, max: 750 }, speed: { min: 70, max: 230 }, gravityY: 520, scale: { start: 1, end: 0.35 }, alpha: { start: 1, end: 0 }, spin: false },
  glint: { tex: Tex.Star, tint: [0xffffff, 0xfff3a0], lifespan: { min: 300, max: 440 }, speed: { min: 40, max: 150 }, gravityY: 0, scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 }, spin: true },
};

/** Things props do by themselves, so the arena is never frozen. */
export const PROP_AMBIENT = {
  /** One small thing somewhere on screen this often. Only props that are on screen are picked. */
  everyMs: { min: 650, max: 1500 },
  /** A bush lets go of a leaf. It sways down and fades. */
  leaf: { fallPx: 74, swayPx: 15, ms: { min: 1900, max: 2800 }, scale: 0.62, depth: 9 },
  /** A sleepy "z Z" rises from a bed. */
  zzz: { sizes: [16, 22], gapMs: 260, risePx: 38, driftPx: 9, ms: 1300, color: '#dfe6ff', depth: 41 },
  /** A twinkle on a rock or a can. */
  glint: { ms: 240, scale: 0.55, depth: 39 },
  /** The box says something, and wiggles as if the cat inside moved. */
  purr: { color: '#f0d9a8', size: 18, wiggle: 0.22 },
  /** Now and then a gust of wind runs across the arena from left to right: bushes lean one after the other. */
  gust: { everyMs: { min: 15000, max: 26000 }, msPerPx: 0.9, power: 0.4, leaves: 3 },
} as const;

/** Kickable decor (cans, ball): a little physics. Speeds px/s, friction is the share of speed lost per second. */
export interface KickDef {
  radius: number;
  friction: number;
  /** Bounce off the floor (1 = never loses height). */
  restitution: number;
  /** Bounce off walls. */
  wall: number;
  /** Floor bounces slower than this do not bounce at all (vertical speed). */
  minBounce: number;
  /** Fastest spin (rad/s) a kick gives. The ball rolls instead. */
  spin: number;
  spinDamp: number;
  /** Little pop (vertical speed) it gets when kicked, so it hops. */
  pop: number;
  /** The soft shadow that appears under it while it is in the air. */
  shadow: { w: number; h: number; drop: number };
}

export const KICKABLE = {
  gravity: 1700,
  airDrag: 0.35,
  /** Slower than this and on the floor = asleep (no more work per frame). */
  sleepSpeed: 10,
  /** A landing this fast (vertical speed) is a full-loud bounce. */
  loudImpact: 520,
  depthLift: 0.5,
  shadowDepthLift: 0.25,
  /** Belt kicks, px/s. */
  belt: { swing: 420, spin: 560, flight: 380 },
  /** Blast kick at full power. */
  shock: 640,
  /** A wall hit this soft makes no sound and shakes nothing. */
  wallMinSpeed: 90,
  cans: { radius: 13, friction: 5.5, restitution: 0.28, wall: 0.5, minBounce: 120, spin: 14, spinDamp: 4, pop: 250, shadow: { w: 34, h: 14, drop: 10 } } satisfies KickDef,
  ball: { radius: 12, friction: 1.1, restitution: 0.72, wall: 0.82, minBounce: 90, spin: 0, spinDamp: 0, pop: 160, shadow: { w: 28, h: 12, drop: 10 } } satisfies KickDef,
} as const;

/**
 * Flying cans and balls hurt cats, and cats smash the ones lying still. Nobody kicks them with a foot any more: only the belt,
 * blasts and thrown things set them moving (systems/props/PropSystem.ts, `kickablesVsCats`).
 */
export const KICK_HIT = {
  /** A can or ball moving at least this fast (px/s) hurts the cat it hits. */
  minSpeed: 170,
  /** Too high above the floor (still in its hop) and it flies over the cat's head. */
  maxHeightPx: 30,
  damage: { cans: 0.2, ball: 0.2 } as const,
  knockback: 280,
  /** The same cat can be hit by flying things this often. */
  gapMs: 400,
  /** It keeps this share of its speed after hitting a cat, and flies back the other way. */
  rebound: 0.4,
  /** A cat that walks into a can pile or ball lying still smashes it. */
  catsSmash: true,
  /** It comes back where it was after this long (so the arena never runs out of balls). */
  respawnMs: { min: 18000, max: 30000 },
  popMs: 350,
} as const;

/** Rocks crack the more they are hit. Each number is the hit count that adds the next crack (3 numbers = 3 stages). */
export const ROCK_CRACKS = {
  enabled: true,
  /** Soft bumps do not count, only real hits. */
  minPower: 0.45,
  stages: [4, 9, 15] as readonly number[],
  /** Extra bits when a new crack opens. */
  burst: { stone: 10, dust: 6 },
  shake: { ms: 120, intensity: 0.003 },
  word: { color: '#e6e6ee', size: 26 },
} as const;

/** Hide and seek: now and then a cat does not walk in from a spawn point, it jumps out of a bush or a box near Varu (beds are cages now, they never spawn cats). */
export const HIDEOUT = {
  enabled: true,
  /** Chance that a normal cat uses a hideout (when one fits). */
  chance: 0.3,
  kinds: ['bush', 'box'] as readonly PropKind[],
  /** The prop shakes this long before the cat jumps out, in pulses this far apart (the warning). */
  telegraphMs: 800,
  pulseMs: 200,
  pulsePower: 0.4,
  /** After one cat hid, the next hideout waits at least this long. */
  cooldownMs: 1800,
  /** The cat appears this many px beyond the prop's edge, on the side facing Varu. */
  exitGap: 8,
  /**
   * How the cat comes out (visual + a short hop; Enemy.popOut): it springs out stretched and small, grows to full size with a
   * little overshoot, lands with a squash and settles. It hops toward Varu at `hopSpeed` times its walking speed, with no thinking
   * for `ms`, and fades in over the first part. Bushes also lose a few more leaves (`leaves`).
   * The cheeky bit: when it lands (`tauntAt`, share of `ms`) it wobbles (`wiggleDeg` each way, `wiggleCycles` swings, dying out)
   * and says a taunt line above its head (content/lines.ts HIDEOUT_TAUNTS, shown by systems/CatChatter.ts).
   */
  exit: {
    ms: 460,
    hopSpeed: 1.15,
    startScale: 0.5,
    stretch: -0.24,
    landSquash: 0.3,
    fadeInShare: 0.2,
    leaves: 1,
    tauntAt: 0.6,
    wiggleDeg: 12,
    wiggleCycles: 2,
  },
} as const;

/**
 * Bed cages. A bed is a trap with two looks: READY = the pillow variant (`bedCushion`), EMPTY = the variant without the pillow (`bed`).
 * A cat flung into a READY bed is locked in and the bed shows EMPTY. When the cat gets out (time is up, the bed is hit, or it is destroyed)
 * the bed stays EMPTY for `rearmCooldownMs` and traps nothing; then the pillow comes back and it is READY again.
 * Beds never spawn cats (see HIDEOUT). Logic: systems/props/BedCageSystem.ts.
 */
export const BED_CAGE = {
  enabled: true,
  /** Both kinds are the same bed with two looks (the kind picked on the map is only where it starts). */
  kinds: ['bed', 'bedCushion'] as readonly PropKind[],
  /** The look while the bed can trap a cat (the pillow). */
  readyKind: 'bedCushion' as ObjectName,
  /** The look while it holds a cat or rests after one (no pillow). */
  emptyKind: 'bed' as ObjectName,
  /** Beds on the map that start READY: all of them, or only the ones whose map kind is the pillow variant. */
  startReady: true,
  /** A cat must be flung at least this fast (px/s) to be caged. A slower one just bumps the bed like any prop. */
  captureSpeed: 60,
  /** Reaction starts this far (px) before the body would touch, plus the distance one frame at its speed. A wide probe makes the bed a magnet: a cat flung NEAR it is pulled in too. */
  probe: 6,
  /** How many cats one bed holds. */
  maxCagedPerBed: 1,
  /** A caged cat gets out by itself after this long (ms). */
  holdMs: 8000,
  /** Hits on the bed that shake a caged cat loose (belt, blast...). 0 = only time frees it. */
  escapeShakes: 4,
  /** The freed cat flies out at this speed (px/s) for `releaseFlingMs`; it counts as flung only if the bed was hit hard. */
  releaseFlingSpeed: 260,
  releaseFlingMs: 300,
  /** After a cat is gone the bed rests (no pillow, traps nothing) this long (ms), then the pillow is back. */
  rearmCooldownMs: 2500,
  /** Power (0..1) of the bed's squash when it traps a cat, frees it, and when the pillow comes back. */
  power: { trap: 1, release: 0.7, rearm: 0.5 },
  /**
   * v170 THE REASON TO CAGE: a cat that is still locked in a bed when the wave ends (every other cat gone) does not count for the wave
   * any more (the wave ends without waiting for it) and is jailed for good: Varu gets `scoreFactor` x that cat's kill score (no kill is counted),
   * and with `pickupChance` the bed also drops a pickup (the usual random kind). So a strong cat (the bomber: 80) is worth more behind bars.
   */
  jail: { scoreFactor: 1.5, pickupChance: 0.6 },
} as const;

/** Destroying the arena. Fences never break. Rocks and the rest only break to bosses; bushes also to Varu. */
export const PROP_HP: Record<ObjectName, { hp: number; byPlayer: boolean; byBoss: boolean }> = {
  bush: { hp: 5, byPlayer: true, byBoss: true },
  box: { hp: 5, byPlayer: false, byBoss: true },
  rock: { hp: 9, byPlayer: false, byBoss: true },
  scratcher: { hp: 6, byPlayer: false, byBoss: true },
  bed: { hp: 4, byPlayer: false, byBoss: true },
  bedCushion: { hp: 4, byPlayer: false, byBoss: true },
};

/**
 * A bush that is hit gets smaller (only its picture: the solid part stays). `sizeSteps[n]` is its size (1 = full) after it lost n whole hp:
 * with 5 hp that is full, then 4 smaller steps, the last one just before it breaks. It shrinks smoothly (`ease` = how fast, per second).
 * A bush that grows back is full size again.
 */
export const BUSH_STATES = {
  enabled: true,
  sizeSteps: [1, 0.925, 0.85, 0.775, 0.7] as readonly number[],
  ease: 14,
  /** A few extra leaves fly off every time it gets a size smaller (colored like the bush). */
  burst: { leaf: 5 },
} as const;

/** A smashed bush grows back on its spot after a while (systems/props/PropSystem.ts). It waits while Varu or a cat stands there. */
export const BUSH_REGROW = {
  delayMs: { min: 25000, max: 40000 },
  /** The sapling grows from nothing to full size over this long. */
  growMs: 900,
  /** Blocked by someone standing on the spot: try again after this long. */
  retryMs: 1000,
  /** Extra space around the bush that must be free of Varu and the cats, in px. */
  clearPx: 10,
} as const;

export const SMASH = {
  /** Damage to a prop per belt hit (times Varu's damage buff). A bush has 5 hp. */
  player: { swing: 1, spin: 1.5, flight: 1 },
  /** Bosses: running into a prop at `minSpeed` (charges and dashes), and their blasts. They look `lookAheadSec` ahead so a fast charge cannot skip a prop. */
  boss: { contact: 4, blast: 4, minSpeed: 300, lookAheadSec: 0.06, cooldownMs: 350 },
  /** A hurt prop shrinks up to this much (0.1 = 10%) as its hp runs out. */
  shrink: 0.1,
  /** The burst when it breaks: the kind's usual bits times this. */
  burstFactor: 2.5,
  dust: 8,
  shake: { ms: 170, intensity: 0.005 },
  word: { size: 30 },
  /** Bits left lying on the floor. Never more than `max` in a run (the oldest vanish). */
  debrisMax: 70,
  debrisSpreadPx: 34,
} as const;

/** What a broken prop leaves on the floor. */
export const PROP_DEBRIS: Record<ObjectName, { tex: TexKey; tint: readonly number[]; count: number }> = {
  bush: { tex: Tex.Leaf, tint: [0x8fdc72, 0x6cbd58, 0xa9d982, 0x58a84c], count: 7 },
  box: { tex: Tex.Chip, tint: [0xd9a766, 0xc6925a, 0xe8c48c], count: 6 },
  rock: { tex: Tex.Chip, tint: [0x9aa0b0, 0xc6cad6, 0x7d8497], count: 7 },
  scratcher: { tex: Tex.Chip, tint: [0xd8b779, 0xc9a45f, 0xeed39a], count: 6 },
  bed: { tex: Tex.Particle, tint: [0xffffff, 0xfff3d6, 0xe05a6a], count: 5 },
  bedCushion: { tex: Tex.Particle, tint: [0xffffff, 0xfff3d6, 0xffd6dc], count: 6 },
};

/** Name of the extra tile layer that draws the fences while the real `walls` layer is hidden (it only collides). */
export const PROP_LAYER_NAME = 'walls_visual';

/**
 * Bush colors. Every bush keeps one look for the whole run (picked from its spot on the map), so the same bush always
 * throws the same colored leaves. `bodyTint` lightly colors the bush picture itself (null = untouched green).
 */
export interface BushVariant {
  name: string;
  /** How often it is picked (bigger = more bushes). */
  weight: number;
  leafTint: readonly number[];
  /** Light multiply tint on the picture (null = none). Kept for compatibility; the real recolor is `hueShift`. */
  bodyTint: number | null;
  /** Degrees the bush's greens are turned around the color wheel when its picture is baked (0 = untouched). The navy outline stays. */
  hueShift: number;
  /** Multiplies the saturation of the turned greens (1 = same). */
  saturation: number;
}

export const BUSH_VARIANTS: readonly BushVariant[] = [
  { name: 'green', weight: 1, leafTint: [0x8fdc72, 0x6cbd58, 0xa9d982, 0x58a84c], bodyTint: null, hueShift: 0, saturation: 1 },
  { name: 'autumn', weight: 1, leafTint: [0xffb347, 0xf28c28, 0xe0562b, 0xf5d04c], bodyTint: null, hueShift: -70, saturation: 1.3 },
  { name: 'blossom', weight: 1, leafTint: [0xffd1e8, 0xffa6cf, 0xff7fb8, 0xffe6f2], bodyTint: null, hueShift: 205, saturation: 0.85 },
  { name: 'lilac', weight: 1, leafTint: [0xe0c8ff, 0xc19bff, 0xa476f0, 0xf0e4ff], bodyTint: null, hueShift: 150, saturation: 0.8 },
];

/**
 * Which variant the bush at this tile gets. Same tile = same answer, so it never changes during a run.
 * All four variants have the same weight, and this mix is checked against the 8 bushes of the arena map so that every
 * variant shows up (twice each). A bush that grows back on its tile keeps its look.
 */
export function bushVariantFor(col: number, row: number): number {
  const hash = (Math.imul(col + 1, 40503) ^ Math.imul(row + 1, 668265263)) >>> 0;
  return (hash >>> 7) % BUSH_VARIANTS.length;
}

/** The rare gold leaf: it drifts down from a bush, lies on the floor for a while, and heals a little when Varu steps on it. */
export const GOLD_LEAF = {
  /** Chance that a leaf coming loose by itself (or in a gust) is gold. */
  ambientChance: 0.07,
  /** Chance that a real hit on a bush shakes a gold one loose. */
  hitChance: 0.04,
  /** Never more than one on the floor, and at least this long between two (game ms). */
  cooldownMs: 15000,
  heal: 4,
  /** How long it waits on the floor (game ms); it blinks for the last `blinkMs`. */
  lifeMs: 7000,
  blinkMs: 1800,
  pickupRadius: 34,
  fallPx: 74,
  fallMs: { min: 1400, max: 1900 },
  scale: 0.95,
  tint: 0xffd23c,
  depth: 9,
  /** Twinkle on the floor every so often (ms). */
  glintEveryMs: 520,
  word: { color: '#ffe066', size: 24, offsetY: -22 },
} as const;

/** A hard hit on a fence (the belt, a spin, the thrown belt, a boss) knocks splinters onto the floor. Soft bumps do not. */
export const FENCE_SPLINTERS = {
  minPower: 0.7,
  count: { min: 2, max: 4 },
  /** How far they land, away from the hit (px), and how much they scatter sideways. */
  throwPx: { min: 16, max: 44 },
  sidewaysPx: 26,
  tint: [0xc98f4f, 0xe0b070, 0x8b5a2b],
  /** Thin slivers: the chip picture squashed to this size. */
  scaleX: { min: 0.25, max: 0.4 },
  scaleY: { min: 0.7, max: 1.1 },
  /** Never more than this many lie around (the oldest vanish). */
  max: 30,
} as const;
