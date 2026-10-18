import type { PickupKind } from './balance';

/**
 * Procedural animation for the placeholder cats (no sprite sheets needed).
 * Walking cats sway side to side and squash with every step, flying cats flap, bosses lumber slowly,
 * and everyone breathes a little when standing still. All visual only.
 * When real animated sprites arrive, set `enabled` to false.
 */
export const ANIM = {
  enabled: true,
  /** Walk cycle phase advances by this many radians per pixel walked. Bigger = quicker legs. */
  stridePerPx: 0.07,
  walk: { swayDeg: 11, squash: 0.07 },
  /** Wings: a fast pulse that does not depend on speed. `rate` is radians per ms. */
  flyer: { rate: 0.022, squash: 0.1, swayDeg: 4 },
  boss: { swayDeg: 3, squash: 0.03 },
  /** Standing still. `rate` is radians per ms. */
  idle: { rate: 0.004, squash: 0.03 },
  /** Below this speed (px/s) a cat counts as standing still. */
  idleSpeed: 12,
} as const;

/**
 * Varu's walk: a smooth waddle. The whole body rocks left and right like a stiff cutout,
 * fading in when he starts and out when he stops. Rotation only, so the hitbox never changes.
 */
export const VARU_ANIM = {
  enabled: true,
  /** Rock cycle advances this many radians per pixel walked. Bigger = quicker waddle. */
  radPerPx: 0.09,
  /** Rock angle, in degrees. */
  tiltDeg: 7,
  /** How fast the rock fades in/out when starting/stopping (per second, bigger = quicker). */
  blendPerSec: 12,
  /** Legs swing this far forward/back (texture px, the sprite is 128 wide). */
  legSwing: 7,
  /** Below this speed (px/s) Varu counts as standing still. */
  idleSpeed: 12,
} as const;

/** Small smoke puffs from the tip of Varu's cigarette. Visual only. */
export const CIG_SMOKE = {
  enabled: true,
  /** Cigarette tip in the 128x128 body texture, relative to its center. */
  tipOffset: { x: -50, y: -9 },
  /** One puff this often (ms). */
  everyMs: 150,
  lifespanMs: { min: 700, max: 1100 },
  /** Drift speed (px/s) and direction (degrees, -90 = up the screen). */
  speed: { min: 8, max: 20 },
  angleDeg: { min: -125, max: -55 },
  scale: { start: 0.18, end: 0.55 },
  alpha: { start: 0.5, end: 0 },
  tint: [0xe6e6ee, 0xffffff, 0xcfd3dc],
} as const;

/**
 * Gooey milk: thick teardrops that fall as they fly (a trail behind the thrown belt, a splash on every hit)
 * and leave little puddles that linger and fade. Visual only.
 */
export const MILK_FX = {
  enabled: true,
  tint: [0xffffff, 0xfffaf0, 0xf1efff],
  /** The drops sag downward the longer they fly (px/s squared). */
  gravity: 320,
  trail: {
    /** One small burst this often (ms) while the belt flies. */
    everyMs: 40,
    count: 1,
    lifespanMs: { min: 600, max: 950 },
    speed: { min: 6, max: 40 },
    scale: { start: 0.5, end: 0.12 },
    alpha: { start: 1, end: 0 },
    /** Random offset around the belt (px). */
    jitter: 6,
    /** Every Nth burst also leaves a puddle on the ground. */
    puddleEvery: 3,
  },
  splash: {
    count: 9,
    lifespanMs: { min: 450, max: 800 },
    speed: { min: 60, max: 210 },
    scale: { start: 0.62, end: 0.15 },
    alpha: { start: 1, end: 0 },
    /** Puddles left where it hit, and how far they spread (px). */
    puddles: 3,
    puddleSpread: 22,
  },
  /** The spin flings a LOT more milk: drops along the whole strap every few ms, and puddles around him. */
  spin: {
    everyMs: 16,
    count: 5,
    lifespanMs: { min: 650, max: 1100 },
    speed: { min: 50, max: 200 },
    scale: { start: 0.62, end: 0.12 },
    alpha: { start: 1, end: 0 },
    /** Every Nth burst also leaves a puddle where the strap is. */
    puddleEvery: 2,
  },
  puddle: {
    lifespanMs: { min: 1300, max: 2000 },
    scale: { start: 0.14, end: 0.34 },
    alpha: { start: 0.9, end: 0 },
  },
} as const;

/**
 * Drinking the milk (lapte buff): Varu smears a white milk ribbon on the ground behind him while the buff lasts.
 * It is a thick line along his path with a soft outline, uneven splotches beside it, and it thins out with age.
 * Standing still, a puddle spreads under him. A big white splat when he grabs the milk. Visual only (no drop particles).
 */
export const MILK_TRAIL = {
  enabled: true,
  color: 0xffffff,
  edgeColor: 0xd9d4ee,
  /** 1 = solid, lower = more see-through. */
  alpha: 0.68,
  outline: 2,
  /** How long the ribbon lasts (ms) and how thick it is at its freshest (px). */
  lifeMs: 1900,
  width: 15,
  /** A new ribbon point every this many px of travel (smaller = smoother). */
  sampleDist: 5,
  /** Splotches beside the ribbon: how often per point, how big, how far out (px). */
  blobChance: 0.55,
  blobRadius: { min: 3, max: 7.5 },
  blobSpread: 15,
  /** Standing still: a new puddle splotch this often (ms). */
  idleEveryMs: 140,
  /** The splat when he grabs the milk. */
  splash: {
    blobs: 16,
    spread: 40,
    radius: { min: 5, max: 13 },
    lifeMs: { min: 1800, max: 3000 },
  },
} as const;

/**
 * The energy drink (MONSTER) trail: while the buff lasts, small green "Z z z" letters drift up off the ground behind
 * him, like he is sleepwalking on caffeine. Each drop takes the next size of the cycle (big Z, then smaller z, z).
 * Visual only.
 */
export const ENERGY_TRAIL = {
  enabled: true,
  /** Monster green with the navy outline the rest of the game uses. */
  color: 0xb4ff1a,
  outline: 0x1b2340,
  /** The letters in order, with the font size (px) and outline thickness of each. Then it starts over. */
  cycle: [
    { letter: 'Z', sizePx: 22, strokePx: 4 },
    { letter: 'z', sizePx: 17, strokePx: 3.5 },
    { letter: 'z', sizePx: 13, strokePx: 3 },
  ],
  /** A new letter every this many px of travel. */
  everyPx: 30,
  /** Standing still: one letter every this many ms (so he keeps snoring). */
  idleEveryMs: 420,
  /** Sideways wobble of where the letter appears (px) and its start tilt (degrees). */
  jitterPx: 8,
  tiltDeg: { min: -18, max: 18 },
  /** It floats up (px) while swaying and fades out. */
  riseY: { min: 26, max: 40 },
  swayPx: 7,
  lifeMs: { min: 900, max: 1200 },
  alpha: 0.95,
  /** Under Varu (depth 20), over the floor and the milk trail. */
  depth: 18,
} as const;

/**
 * How the Crow Rain crows fall (visuals only; damage and timing are CROW_RAIN in balance.ts).
 * A crow swoops in from above and to one side, flapping, grows from big (close to the camera) to its landing size,
 * tucks its wings for the last stretch of the dive, sheds feathers on the way and lands with a squash and a dust puff.
 */
export const CROW_FALL = {
  /** Where it starts, relative to the landing spot (px): this far up, and this far to a random side. */
  fromAbove: 300,
  fromSide: 150,
  /** Scale at the start, as a multiple of the landing size. */
  startScale: 3,
  /** Wing flap: ms per frame, and the share of the fall after which the wings tuck in. */
  flapMs: 85,
  tuckAt: 0.7,
  /** The body sways side to side while falling (radians), less and less as it nears the ground. */
  swayRad: 0.2,
  swayMs: 65,
  /** A feather drops off the crow this often (ms) while it falls. */
  featherEveryMs: 75,
  /** The landing squash: wider and flatter for a moment, then it fades. */
  squash: { x: 1.3, y: 0.68, ms: 95, fadeDelayMs: 140, fadeMs: 200 },
  dust: { count: 12, tint: [0xe6d9b3, 0xc2b48c, 0xf5ecd0] },
} as const;

/** Pickups that make Varu take a drag of his cigarette (visual only). Add 'lapte' here to make milk do it too. */
export const SMOKE_BREAK_ON: readonly PickupKind[] = ['crochete', 'monster'];

/**
 * The cigarette drag: his left arm swings up (3 body frames: Tex.Varu, Tex.VaruDrag1, Tex.VaruDrag2),
 * the tip glows, then he blows a cloud of smoke out in the direction he faces. Visual only.
 */
export const SMOKE_BREAK = {
  enabled: true,
  raiseMs: 200,
  holdMs: 520,
  lowerMs: 240,
  /** Cigarette tip and mouth while the arm is up, in the 128x128 body texture, relative to its center. */
  tipOffset: { x: -19, y: -30 },
  mouthOffset: { x: -2, y: -19 },
  ember: { tint: 0xff7a2a, scale: { min: 0.55, max: 1.15 }, pulseMs: 70 },
  exhale: {
    puffs: 16,
    staggerMs: 28,
    /** Cone of the cloud (radians) and how far it drifts (px). */
    spreadRad: 0.38,
    distance: { min: 55, max: 130 },
    durationMs: { min: 700, max: 1100 },
    scale: { start: 0.7, end: 2.4 },
    alpha: { start: 0.8, end: 0 },
    tint: [0xffffff, 0xe6e6ee, 0xcfd3dc],
  },
  /** The little line above his head, relative to him. */
  textOffsetY: -64,
} as const;

/**
 * The golden belt (CUREAUA DE AUR): the strap turns gold and gets coated in thick, white, sticky goo like
 * expired milk: blobs and stretching strands on the strap, a much gooier trail, big slow drops and long-lasting
 * puddles. Visual only.
 */
export const GOLD_BELT = {
  enabled: true,
  gold: 0xf5c518,
  goldShade: 0xc9930f,
  goldShine: 0xfff0a8,
  /** Expired milk: yellowish-white, thick. */
  gooBody: 0xf6f0c8,
  gooShade: 0xddd38c,
  goo: [0xf6f0c8, 0xeae2a4, 0xfffcea],
  /** The inner streak of the swing trail (the outer one is gold). */
  trailInner: 0xfffcea,
  strap: {
    /** Strap points (0..10) that carry a hanging strand of goo. Every 3rd point has no blob, so the gold shows through. */
    strands: [2, 4, 6, 8, 10],
    pulseMs: 230,
    strandLen: { min: 5, max: 13 },
    strandWidth: 2.7,
    blobRadius: { min: 0.17, max: 0.27 },
    outline: 1.2,
  },
  /** Drops from the golden belt versus the normal milk. */
  drops: { scaleMult: 1.55, lifeMult: 1.5, gravityMult: 0.55, countMult: 2 },
  /** The belt in his fist drips now and then. */
  held: {
    everyMs: 110,
    lifespanMs: { min: 800, max: 1400 },
    speed: { min: 3, max: 18 },
    scale: { start: 0.6, end: 0.16 },
    alpha: { start: 1, end: 0 },
    /** Under the buckle, in the 128x128 body texture, relative to its center. */
    dripOffset: { x: 52, y: 12 },
  },
  /** The moment he grabs it: a gold flash on the belt and a goo splat. */
  flourish: {
    drops: 18,
    flashMs: 150,
    flashTint: 0xfff0a8,
    speed: { min: 40, max: 150 },
    lifespanMs: { min: 600, max: 1000 },
    scale: { start: 0.85, end: 0.2 },
    alpha: { start: 1, end: 0 },
    burstOffset: { x: 40, y: -16 },
  },
} as const;
