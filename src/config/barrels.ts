/** @file Mustard barrel numbers: how many, size, hits to break, the burst, the puddle and how much it slows (systems/props/BarrelSystem.ts). */
import { ARENA } from './arena';

/** Sizes are game pixels, times are ms. The textures are 96x96 (assets/art/barrel.ts). */
export const BARREL = {
  /** How many barrels a run starts with (picked at random each run). */
  count: { min: 4, max: 7 },
  /** Texture 96x96 drawn at this scale (the barrel body ends up about 48 px wide). */
  scale: 0.8,
  /** Where the barrel stands on the floor, as a share of the picture height (its base). */
  originY: 0.92,
  /** Drawn like the other arena props: above the floor, below Varu and the cats. */
  depth: ARENA.depth.walls,
  /** Soft ground shadow under the barrel. */
  shadow: { width: 58, height: 20, offsetY: -3, depthGap: 0.1 },
  /** Keep this far from the world edge. */
  margin: 110,
  /** A circle this big must be free of walls and props, so the barrel never stands in one. */
  clearRadius: 34,
  /** Not right on top of Varu (at the start and when a new one pops up). */
  minFromPlayer: 260,
  /** Barrels keep this far from each other, so they are spread over the arena. */
  minGap: 200,
  /** Random spots tried per barrel before it gives up (the arena is big, this is plenty). */
  tries: 60,
  /** A barrel is solid: Varu and walking cats cannot walk through it (flying cats pass over). The belt, blasts and bosses break it, and so does a walking cat that runs into it. */
  hp: 2,
  /** The solid part: a rectangle (px) covering the whole barrel body from its base up (`offsetY` above its spot), so Varu can never stand on top of the barrel, not even behind it. */
  solid: { w: 46, h: 54, offsetY: -29 },
  /** A cat breaks the barrel when its edge is this close (px) to the barrel's hit box, so a cat stopped by the solid part (which is a bit bigger than the hit box at the top) still breaks it. */
  catBreakSlackPx: 6,
  /** The part the belt can touch: half width and height above its base. */
  hitbox: { halfWidth: 26, height: 54 },
  /** A walking cat that runs into a barrel breaks it too (and leaves the puddle). */
  catsBreak: true,
  /** The thrown belt hits a barrel at most this often. */
  flightCooldownMs: 300,
  /** A blast (explosion, crow, tennis ball) breaks every barrel within its radius plus this. */
  blastSlackPx: 16,
  /** A hit that does not break it: it wobbles and squashes. */
  wobble: { deg: 9, ms: 320, squash: 0.1, squashMs: 90 },
  /** The burst when it breaks: the broken picture pops and fades, mustard flies (PropFx). */
  burst: { ms: 650, fadeDelayMs: 120, popScale: 1.08, goo: 22, shake: { ms: 150, intensity: 0.004 } },
  /** A new barrel pops up now and then (never more than `count.max` standing). */
  respawn: { everyMs: { min: 25000, max: 40000 }, popMs: 350 },
  puddle: {
    /** Texture 96x96 drawn at this scale; its middle is at `centerY` (share of the height) and sits `offsetY` above the barrel's base. */
    scale: 1.8, // bigger again (was 1.35, before that 0.9); the sticky zone below grows with it
    centerY: 0.656,
    offsetY: -4,
    depth: ARENA.depth.decor + 0.15,
    growMs: 380,
    /** It does not stay as big as it was: from the end of its growth it shrinks steadily to this share of its size by the time it starts to dry (the sticky zone shrinks with it). */
    shrinkTo: 0.3,
    /** Never more than this many at once (the oldest dry up first). */
    max: 14,
    /** A puddle dries up on its own: it stays this long (game ms), then fades away over `dryMs` and stops slowing anyone. */
    lifeMs: 16000,
    dryMs: 4000,
    /** Fade time of the oldest puddle when `max` is exceeded. */
    fadeMs: 600,
    /** The sticky part: an ellipse around its middle, in px (it grows with the puddle). */
    zone: { rx: 72, ry: 36 },
    /** Speed left while standing in it: 0.5 = half speed. Flying cats ignore it. */
    slow: { player: 0.55, cat: 0.5, boss: 0.7 },
    /** A cat that is flung (belt hit, pinball bump) while it stands in a puddle slips: faster, spinning, sliding on. Bosses never slip. */
    slip: {
      ms: 1100,
      boost: 1.5,
      maxBoost: 3,
      minSpeed: 260,
      /** Share of the speed left after one second of sliding. */
      friction: 0.3,
      turns: { min: 1, max: 2 },
      /** After a slide the cat cannot slip again for this long. */
      cooldownMs: 1500,
      /** The floating word over a slipping cat, at most this often (it is the same word channel for all cats). */
      word: { color: '#ffd84a', size: 24, cooldownMs: 350 },
    },
    /** Mustard drops that fly off whoever walks in it. */
    goo: { everyMs: 140, depth: 11, tint: [0xf2b632, 0xf8d56b, 0xe9b02e] as readonly number[], lifespanMs: { min: 320, max: 560 }, speed: { min: 20, max: 80 }, gravityY: 260 },
  },
} as const;
