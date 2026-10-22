/** @file Procedural animation numbers (cat sway / squash / flap, Varu walk, smoke break, milk and crow FX, golden belt, rust flakes off the rusty belt, blasts). */
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
  /** `stride` scales how fast the legs go for that look (1 = normal, smaller = slow and heavy). */
  walk: { swayDeg: 11, squash: 0.07, stride: 1 },
  /** Fat cats waddle: slow, heavy steps with a big rock side to side and a deep belly squash. */
  fat: { swayDeg: 19, squash: 0.1, stride: 0.7 },
  /** Wings: a fast pulse that does not depend on speed. `rate` is radians per ms. */
  flyer: { rate: 0.022, squash: 0.1, swayDeg: 4 },
  /** Wing flap (FlyingCatRig): `rate` = radians per ms, `foldX` = how narrow a wing gets at the top of the beat (1 = no change), `swingDeg` = how far it lifts, `lag` = the far wing is this many radians behind (0 = both together). */
  wing: { rate: 0.03, foldX: 0.45, swingDeg: 14, lag: 0.25, depth: 9 },
  boss: { swayDeg: 3, squash: 0.03, stride: 0.6 },
  /** Which drawing a boss shows (front / back / side, `entities/bosses/BossViews.ts`). The side look wins when the way it faces is more sideways than up or down by `sideEnter` (1.25 = clearly sideways) and is kept until it is less than `sideExit` (below 1.25 so it never flickers on a diagonal). `dashSpeedPx`: a boss locked into a charge or dash looks the way it moves once it is faster than this. */
  views: { sideEnter: 1.25, sideExit: 0.8, dashSpeedPx: 40 },
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
  /** Depth of the ribbon (under Varu). */
  depth: 3,
  /** A new ribbon point every this many px of travel (smaller = smoother). */
  sampleDist: 5,
  /** Most ribbon points and splotches alive at once (fixed buffers: no allocation per frame). Varu at 260 px/s needs about 100 points for 1.9 s. */
  maxPoints: 160,
  maxBlobs: 160,
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
/** How a floating "Z z z" looks and moves (the energy drink trail, `Player.dropZ`). */
export interface ZLook {
  readonly color: number;
  readonly outline: number;
  readonly cycle: readonly { readonly letter: string; readonly sizePx: number; readonly strokePx: number }[];
  readonly jitterPx: number;
  readonly tiltDeg: { readonly min: number; readonly max: number };
  readonly riseY: { readonly min: number; readonly max: number };
  readonly swayPx: number;
  readonly lifeMs: { readonly min: number; readonly max: number };
  readonly alpha: number;
  readonly depth: number;
}

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
 * The EMO bad buff: Varu pulls his hood up (the hooded body textures `Tex.VaruEmo*`, see `drawVaru(g, pose, 'up')`; the hood slides back while he smokes) and little broken
 * hearts (`Tex.Heart`) drift up over his head, slowly, now and then. Visual only; the slow swings are `BUFFS.emo`.
 */
export const EMO_FX = {
  /** A new heart every this many ms, starting this far above his center (px, negative = up). */
  everyMs: 650,
  offsetY: -34,
  jitterPx: 12,
  /** Displayed size of a heart (px). */
  sizePx: { min: 16, max: 24 },
  tiltDeg: { min: -20, max: 20 },
  riseY: { min: 40, max: 60 },
  swayPx: 10,
  lifeMs: { min: 1400, max: 1900 },
  alpha: 0.95,
  /** Over Varu (depth 20). */
  depth: 24,
} as const;

/**
 * The RUSTY belt (BAD buff, `BUFFS.rusty`): while it lasts, rust flakes come off the strap of the belt in his fist, drop to the
 * floor, tumble and fade. The flakes start at a random point along the strap (`strapPath`, the 128x128 belt texture, relative to
 * its center), so they really come off the belt. Colors are the rust of the belt icon (assets/art/items.ts), lightened so they show.
 * Visual only; the slow spins are `BUFFS.rusty`.
 */
export const RUST_FX = {
  enabled: true,
  /** A new drop every this many ms while he walks; standing still it is slower (`idleEveryMs`). Each drop is `perDrop` flakes. */
  everyMs: 70,
  idleEveryMs: 180,
  perDrop: 2,
  /** The strap as points in the 128x128 belt texture, from the loop end, past the fist, down to the buckle. */
  strapPath: [[84, 20], [92, 24], [99, 32], [104, 42], [111, 44], [115, 54], [116, 66]] as readonly (readonly [number, number])[],
  /** A flake starts this many px off the exact strap point (so it sits on the leather). */
  jitterPx: 1.5,
  /** Displayed size (px). It pops in bigger and settles to this size. */
  sizePx: { min: 6, max: 9.75 },
  popScale: 1.35,
  colors: [0x8a3b17, 0xc4602a, 0xe8843a, 0xffb36b] as readonly number[],
  /** How far it falls (px) and sways sideways (px), and how long it takes. */
  fallPx: { min: 36, max: 64.8 },
  driftPx: 14,
  lifeMs: { min: 900, max: 1300 },
  spinDeg: { min: 160, max: 340 },
  alpha: 1,
  /** Over the belt and Varu (the belt is depth 21), so the flakes visibly leave it. */
  depth: 22,
} as const;

/** The numbers a somersault needs (Player.advanceBackflip): the energy drink's back flip (`ENERGY_FLIP`) and the dodge roll (`DODGE.anim`). */
export interface FlipLook {
  ms: number;
  jumpPx: number;
  hop: number;
  takeoff: number;
  touchdown: number;
  launch: number;
  crouch: { x: number; y: number };
  stretch: { x: number; y: number };
  landing: { x: number; y: number };
  turns: number;
  minLength: number;
  /** Optional: how small the body gets at the top of the turn (1 = same size, 0.8 = a tucked ball). Default 1. */
  tuck?: number;
  shadowSize: number;
  shadowAlpha: number;
  ghost: { everyMs: number; lifeMs: number; alpha: number; tint: number; depth: number };
}

/**
 * The energy drink back flip: the moment Varu grabs the can he plants his feet, crouches, springs UP the screen and does one full
 * somersault, then lands with a squash, a green shockwave ring, a puff of dust and a small shake. He keeps full control the whole time
 * (walk, aim, swing): the flip rides along with him, only the jump lifts it up the screen. `rooted: true` plants him instead.
 * The view is top-down, so the somersault is drawn the way the game draws everything: the body squashes and stretches along the way
 * he faces (a head-over-heels turn seen from above gets short, flat, flips over, and comes back), it grows a little at the top
 * (it comes closer to the camera) while its shadow stays on the ground, small and faint, and green ghosts trail behind.
 * His hitbox, speed and the buff are untouched. The Z z z trail (ENERGY_TRAIL) is separate and stays.
 */
export const ENERGY_FLIP = {
  enabled: true,
  /** The whole thing: crouch, jump and spin, landing. */
  ms: 720,
  /** False (default) = he keeps full control while he flips: walking, aiming and swinging, the flip follows him. True = he is planted and cannot walk while it runs. */
  rooted: false,
  /** How high the body rises on the screen at the top of the jump (px), and how much bigger it is there (0.25 = 25 percent). */
  jumpPx: 54,
  hop: 0.22,
  /** Share of the time (0 to 1) when the crouch ends and the jump starts, and when he touches down again. The jump is a parabola between them. */
  takeoff: 0.2,
  touchdown: 0.8,
  /** How long (share of the time) the push-off stretch lasts, right after takeoff. */
  launch: 0.07,
  /** Extra squash as a share of the size, `x` across his body and `y` along it (negative = smaller). Crouch before the jump, stretch as he leaves the floor, squash on landing. */
  crouch: { x: 0.14, y: -0.18 },
  stretch: { x: -0.07, y: 0.12 },
  landing: { x: 0.2, y: -0.22 },
  /** Full turns in the air (head over the back). */
  turns: 1,
  /** The somersault never gets thinner than this share of his length (so he does not vanish edge on). */
  minLength: 0.1,
  /** The shadow at the top of the jump: this share of its size, and how see-through. */
  shadowSize: 0.55,
  shadowAlpha: 0.45,
  /** Green ghosts left behind in the air: one every `everyMs`, fading out over `lifeMs`. */
  ghost: { everyMs: 50, lifeMs: 280, alpha: 0.42, tint: 0xb4ff1a, depth: 19 },
  /** The landing (systems/Effects.ts): a green ring that spreads on the floor, dust, a small shake, a word. */
  land: {
    ring: { color: 0xb4ff1a, startPx: 18, endPx: 92, width: 5, ms: 340, alpha: 0.85 },
    dust: { count: 10 },
    shake: { ms: 120, intensity: 0.004 },
    word: { color: '#b4ff1a', size: 30, offsetY: -52 },
  },
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

/** Pickups that make Varu take a drag of his cigarette (visual only). Add 'lapte' here to make milk do it too, or 'monster' to put the drag back next to the back flip. */
export const SMOKE_BREAK_ON: readonly PickupKind[] = ['crochete']; // the energy drink does a back flip now (ENERGY_FLIP), not a drag

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
  /** The golden spin: a swirling gold tornado around Varu (Ninjago "Spinjitzu" style). Looks only; the hit area is the spin's own reach. */
  tornado: {
    enabled: true,
    /** Varu hides inside the tornado while it spins (the belt stays visible). */
    hideVaru: true,
    /** Rings stacked from the narrow bottom (at his feet) to the wide top, and loose strands per ring. */
    rings: 38,
    strandsPerRing: 2,
    /** Funnel height and widest width as a share of the spin's reach (it hugs Varu, not the whole arena). */
    heightFactor: 0.72,
    widthFactor: 0.46,
    /** How far below his center the point of the funnel sits (px). */
    baseDrop: 24,
    /** Narrowest ring (at the bottom) as a share of the widest. */
    baseWidth: 0.07,
    /** Squash of each ring (1 = round, small = seen from the side). */
    squash: 0.3,
    /** Turn speed of the rings (rad/s), faster near the bottom. */
    spinSpeed: 7,
    /** Long tapered ribbons twisting up the funnel. */
    ribbons: 6,
    /** Big loose rings that swing out past the rim at the top (the flare in the photos). */
    flareRings: 5,
    /** Colors from the dark orange edge to the white-hot core. */
    colors: { glow: 0xff8a00, edge: 0xffa51a, deep: 0xffc21a, body: 0xffd83a, light: 0xffec7a, core: 0xfffbe0 },
    /** The funnel grows in over this share of the spin, and fades out over the last share. */
    growShare: 0.16,
    fadeShare: 0.2,
    sparkles: 64,
  },
} as const;

/** The extra shockwave on a kamikaze cat's blast (systems/Effects.ts, `ExplosionPayload.shockwave`): two thin rings that race outward, a scorch mark and a big word. */
export const KAMIKAZE_BLAST = {
  word: { text: 'BOOM!', color: '#ffd166', size: 56, offsetY: -36 },
  ringMs: 440,
  /** Outer ring reaches this share of the blast radius (it flies a bit past the real edge, so it feels big). */
  outerReach: 1.2,
  innerReach: 0.8,
  outerWidth: 14,
  innerWidth: 6,
  outerColor: 0xffffff,
  innerColor: 0xffd166,
  /** A dark scorch mark that fades on the floor. */
  scorch: { radiusFactor: 0.5, alpha: 0.28, color: 0x1b2340, fadeMs: 3500 },
  shake: { ms: 260, intensity: 0.016 },
} as const;

/** A ninja cat's teleport: a bigger smoke puff at both ends, and a small word where it lands. */
export const NINJA_POOF = {
  smokeCount: 18,
  /** A soft grey puff that swells and fades. */
  puff: { radius: 14, grow: 3.2, alpha: 0.4, color: 0xcfd0e0, ms: 380 },
  word: { color: '#e6e6ee', size: 22, offsetY: -26 },
  /** At most one word this often (game ms), so a pack of ninjas does not spam the screen. */
  wordGapMs: 260,
} as const;

/**
 * Regina Pisicilor's moving parts (`entities/bosses/QueenRig.ts`): the cape lags behind her, the feet step, the crown bobs and
 * tilts, the scepter arm sways and swings, sparkles twinkle on the jewels. Visual only. Distances in texture px (the sprite is 128 wide).
 */
export const QUEEN_RIG = {
  depth: { aura: 6, cape: 13, foot: 14, crown: 16, scepter: 17, glow: 18 },
  feet: { swing: 9, radPerPx: 0.07 },
  scepter: { idleDeg: 3, idleRate: 0.0028, walkDeg: 2.5 },
  crown: { bobPx: 1.8, tiltDeg: 5, idleTiltDeg: 1.2, idleRate: 0.0017 },
  cape: { lagPerSpeed: 0.05, maxLagPx: 13, swayDeg: 7, flareX: 0.12, flareY: 0.16 },
  glow: { sizePx: 64, maxAlpha: 0.55, gold: 0xffd84a, red: 0xff6b6b, pulseRate: 0.018, furyMin: 0.35 },
  aura: { sizePx: 300, alpha: 0.16, pulseAlpha: 0.07, color: 0xff3d5a, pulseRate: 0.006 },
  sparkle: { everyMs: { min: 700, max: 1500 }, sizePx: 16, lifeMs: 480 },
  burst: { count: 9, reachPx: 90, lifeMs: 520 },
  /** Dust puffs behind her (`Tex.FxPuff`, a cartoon cloud, 24 px radius at scale 1): scales are of that picture. */
  dust: { everyMs: 45, behindPx: 38, startScale: 0.5, endScale: 1.5, lifeMs: 420, alpha: 0.8, color: 0xefe3cf, spinDeg: 40 },
  /** The gold magic circle on the floor while she spins (`Tex.FxRing`). `color` is also the default color of `pulse`. */
  ring: {
    color: 0xffd166, alpha: 0.95, spinRate: 0.03,
    /** The gold diamonds that circle it (`RingDiamonds`): `orbit` = share of the ring radius, `rate` rad/ms, `flipRate` rad/ms of the glint, `texH` = height of the picture. `h` = size in game px (spin ring / scepter ring). */
    diamonds: { count: 10, hoverCount: 6, orbit: 0.83, rate: 0.0016, flipRate: 0.006, h: 20, hoverH: 14, texH: 32 },
  },
  dizzy: { stars: 3, headPx: 62, orbitPx: 48, rate: 0.0038, crownTiltDeg: 16, crownRate: 0.011, scepterDroopDeg: 38 },
  death: { crownRisePx: 90, crownSpinDeg: 420, lifeMs: 1000 },
  /** The bubble around her while her elite guards live (she takes half damage). */
  shield: { radius: 96, alpha: 0.9, pulseAlpha: 0.1, pulseRate: 0.008, breathe: 0.025, sparkleEveryMs: 420, sparkleSizePx: 14, sparkleLifeMs: 520 },
} as const;

/** Poses of Regina's loose parts per attack moment (see `QueenPose` in `entities/bosses/QueenRig.ts`), and how long each change takes (ms). */
export const QUEEN_POSES = {
  relaxed: { scepterDeg: 0, scepterScale: 1, crownLift: 0, crownTiltDeg: 0, glow: 0, capeFlare: 0, squash: 0 },
  decreeRaise: { scepterDeg: -22, scepterScale: 1.25, crownLift: 8, glow: 1, squash: -0.06 },
  decreeSlam: { scepterDeg: 40, squash: 0.1, crownLift: -3 },
  chargeWindup: { scepterDeg: 55, scepterScale: 1.1, crownLift: -4, glow: 1, squash: 0.12 },
  chargeRush: { scepterDeg: 0, scepterScale: 1.35, crownLift: 3, capeFlare: 1, squash: -0.14 },
  spinWindup: { scepterDeg: 100, scepterScale: 1.4, crownLift: -3, glow: 1, capeFlare: 0.3, squash: 0.08 },
  spinGo: { crownTiltDeg: -18, capeFlare: 1, squash: -0.05 },
  furyPop: { crownLift: 10, scepterDeg: -20, glow: 1 },
  scepterWind: { scepterDeg: -35, scepterScale: 1.3, crownLift: 6, glow: 1, squash: 0.06 },
  scepterThrow: { scepterDeg: 75, scepterScale: 1.5, squash: -0.1, glow: 0 },
} as const;

export const QUEEN_POSE_MS = {
  decreeRaise: 600, decreeSlam: 110, decreeBackDelay: 130, decreeBack: 520,
  chargeWindup: 650, chargeRush: 120, chargeEnd: 350,
  spinWindup: 600, spinGo: 200, spinEnd: 400,
  furyPop: 200, furyBack: 600, furyBackDelay: 700,
  scepterWind: 600, scepterThrow: 140, scepterBack: 400,
} as const;

/**
 * The emo cat's sadness (`entities/bosses/EmoRig.ts`): he slumps, sighs, trudges, and cries all the time. A small rain cloud
 * follows him and drizzles on his head. Tears come out of the visible eye (and from under the fringe). Visual only.
 * Distances in texture px (the sprite is 128 wide) unless it says game px.
 */
export const EMO_RIG = {
  /** Where the eyes are, relative to the texture center (the sprite faces UP). Left one is hidden under the fringe: tears just leak out from it. */
  eye: { x: 14, y: -14 },
  fringeEye: { x: -17, y: -10 },
  /** The same for his side drawing (it faces right; mirrored when he looks left): the one eye and the mouth. From behind there is no eye. */
  eyeSide: { x: 22, y: -21 },
  mouthSide: { x: 38, y: -4 },
  /** Mouth, where sighs come out. */
  mouth: { x: 0, y: 8 },
  /** Always-on slump (squash) and the slow sway of his head, in degrees. */
  slump: { squash: 0.045, swayDeg: 2.6, swayRate: 0.0013, bobSquash: 0.018, bobRate: 0.0021 },
  /** Walking: slow, heavy, hunched shuffle. Used instead of the normal boss gait. */
  gait: { swayDeg: 4.5, squash: 0.02, stride: 0.42 },
  walkLeanDeg: 5,
  /** Shaking while sobbing (pose `sob` 0 to 1): rate in radians per ms. */
  sob: { rate: 0.052, tiltDeg: 3.2, squash: 0.03 },
  /** Tears: game px for sizes and speeds. `everyMs` is the gap at cry level 1 (the level divides it). */
  tear: {
    everyMs: 230,
    fringeEveryMs: 520,
    w: 7, h: 11,
    colors: [0x9fd8ff, 0xcdeeff, 0x9fd8ff, 0x15151c], // every 4th one is black mascara
    outline: 0x1b2340,
    gravity: 520,
    spread: { vx: 34, vy: 22 },
    lifeMs: { min: 520, max: 760 },
    maxAlive: 34,
    depth: 18,
  },
  /** A spurt of tears that fly out and fall (getting hit, scream, phase 2). Count is per burst. */
  spray: { speed: { min: 90, max: 230 }, upBias: 0.45, lifeMs: { min: 600, max: 900 } },
  /** A pale puff of breath and a tiny "..." now and then. */
  sigh: { everyMs: { min: 3600, max: 6200 }, sinkSquash: 0.085, sinkTiltDeg: 6, sinkMs: 650, backMs: 900, puffMs: 1100, puffColor: 0xcfd3dc, puffAlpha: 0.55 },
  /** The gloom cloud (game px). It hovers above his head and lags a little behind him. */
  cloud: {
    hoverPx: 98, lag: 6, bobPx: 3, bobRate: 0.0022,
    puffs: [[-13, 3, 11], [0, -3, 15], [14, 2, 12], [3, 6, 11]] as const, // x, y, radius
    color: 0x6a6f8a, darkColor: 0x40445c, flashColor: 0xf777b9, outline: 0x1b2340, outlineW: 2.2,
    alpha: 0.95, depth: 19,
    rain: { everyMs: 120, w: 5, h: 9, color: 0x9fd8ff, speed: 190, lifeMs: 460, jitter: 16 },
    /** Phase 2: darker, rains harder, and flashes pink now and then. */
    stormRainMult: 2.2,
    /** v172 rainy mood: at full gloom (he has lost all his health) the cloud is this many times bigger and rains this many times more. */
    gloomScale: 1.9,
    gloomRainMult: 2.5,
    /** The lavender soap bubble round him while he hides (cry for help, `Tex.FxBubbleEmo`): game px radius, it breathes a little. */
    hideBubble: { radius: 66, alpha: 0.95, depth: 17, breathe: 0.03, breatheRate: 0.006 },
    flashEveryMs: { min: 1800, max: 3600 },
    flashMs: 110,
  },
  death: { tears: 16, cloudSinkPx: 46, cloudMs: 900 },
} as const;

/** Poses of the emo cat per moment (see `EmoPose` in `entities/bosses/EmoRig.ts`). */
export const EMO_POSES = {
  slump: { squash: 0, tiltDeg: 0, sob: 0, cry: 1 },
  heartsWind: { squash: 0.1, tiltDeg: -4, sob: 1, cry: 2.4 },
  heartsFire: { squash: -0.1, tiltDeg: 0, sob: 0, cry: 3 },
  screamWind: { squash: 0.14, tiltDeg: 0, sob: 0.7, cry: 3.2 },
  screamFire: { squash: -0.17, tiltDeg: 0, sob: 0, cry: 5 },
  crewWind: { squash: 0.06, tiltDeg: 9, sob: 0.3, cry: 1.8 },
  crewFire: { squash: -0.05, tiltDeg: -9, sob: 0, cry: 2.4 },
  stunned: { squash: 0.2, tiltDeg: 13, sob: 1, cry: 4.5 },
  breakdown: { squash: 0.12, tiltDeg: 0, sob: 1, cry: 4 },
  /** v172 cry for help: curled up small behind his hood. */
  hide: { squash: 0.3, tiltDeg: 0, sob: 1, cry: 6 },
} as const;

export const EMO_POSE_MS = {
  hide: 220, hideBack: 500,
  heartsWind: 520, heartsFire: 130, heartsBack: 650, // v143: fires and recoveries a little slower and eased both ways (was 90 / 500)
  screamWind: 700, screamFire: 120, screamBack: 800,
  crewWind: 560, crewFire: 150, crewBack: 650,
  stunned: 300, stunBack: 600,
  breakdown: 250, breakdownBack: 700, breakdownBackDelay: 800,
  hurt: 70, hurtBack: 260,
} as const;

/**
 * Pisica Federer's moving parts (`entities/bosses/FedererRig.ts`): the racket arm and the racket on its wrist, the tail,
 * the feet (they hop on their toes while she waits), the tennis ball in her other paw (it is dribbled, tossed and hit),
 * a racket swoosh and a lime aura in phase 2. Visual only. Distances in texture px (the sprite is 128 wide) unless it says game px.
 */
export const FEDERER_RIG = {
  depth: { aura: 6, tail: 13, foot: 14, racket: 16, arm: 17, ball: 18, trail: 16 },
  feet: { swing: 8, radPerPx: 0.07, hopPx: 2.6, hopRate: 0.0085, hopRatePhase2: 0.0125 },
  /** The racket arm's idle sway and walking bob (degrees), and the wrist's own small sway. */
  arm: { idleDeg: 3, idleRate: 0.0031, walkDeg: 3.5, wristIdleDeg: 5, wristIdleRate: 0.0047 },
  /** Tail: slow wag (degrees), swing with her steps, and how far it stretches when she dashes (see `tailStretch` in the poses). */
  tail: { idleDeg: 9, idleRate: 0.0021, walkDeg: 14, stretchY: 0.3 },
  /** The ball in her left paw: a dribble (px) while she waits, size in game px, and how it grows while tossed (per px of lift). */
  ball: { sizePx: 17, dribblePx: 5, dribbleRate: 0.0075, growPerPx: 0.011, spinPerMs: 0.35, popMs: 150 },
  /** `flick` and `kick` jump by hand (every swat) and fade by themselves: `fadePerSec` is the share left after one second (smaller = fades faster). */
  swat: { wristDeg: -62, armDeg: -14, squashKick: -0.07, fadePerSec: 0.0004 },
  /** A swoosh behind the racket head when it moves faster than `minSpeed` px/s: a puff every `everyMs`. Game px. */
  trail: { minSpeed: 520, everyMs: 28, sizePx: 20, color: 0xe9ff7a, alpha: 0.5, lifeMs: 230, maxAlive: 14 },
  /** The little pop where the racket meets the ball. */
  hit: { ringPx: 46, ringMs: 260, color: 0xf1fba0, stars: 5, starReachPx: 54, starMs: 380 },
  /** Phase 2: a lime aura, and she bounces on her toes faster. */
  aura: { sizePx: 280, color: 0xd7f03a, alpha: 0.13, pulseAlpha: 0.06, pulseRate: 0.0065 },
  /** The racket twirl of the phase 2 roar. */
  twirl: { ms: 620 },
  /** v147 tie-break rage: her loose parts are tinted red, the aura turns red. The towel: size and where it hangs (texture px from her middle). */
  rage: { tint: 0xff9a9a, auraColor: 0xff3d3d, auraAlpha: 0.17 },
  towel: { widthPx: 46, heightPx: 15, offsetY: -6 },
  /** The broken racket that flies off when she smashes it (game px, ms). */
  broken: { flyPx: 150, spinDeg: 720, ms: 650 },
  /** She is beaten: the racket flies off spinning, the ball bounces away. */
  death: { racketRisePx: 110, racketSpinDeg: 540, ballHopPx: 70, lifeMs: 1000 },
  /** Dropped ball when she is stunned (a few bounces on the spot). */
  drop: { hopPx: 34, ms: 300, lifeMs: 900 },
} as const;

/** Poses of the tennis cat's loose parts per attack moment (see `FedererPose` in `entities/bosses/FedererRig.ts`). Degrees: positive arm / wrist = turned clockwise (racket swung out to her right and back), negative = swung across the front. */
export const FEDERER_POSES = {
  ready: { armDeg: 0, wristDeg: 0, squash: 0, tiltDeg: 0, ballLift: 0, ballShow: 1, tailStretch: 0, tailDeg: 0 },
  volleyWind: { armDeg: 40, wristDeg: 26, squash: 0.05, tiltDeg: -3 },
  volleyHold: { armDeg: 10, wristDeg: 0, squash: 0, tiltDeg: 2 },
  serveToss: { armDeg: 72, wristDeg: 52, squash: 0.1, tiltDeg: -6, ballLift: 64 },
  serveSmash: { armDeg: -52, wristDeg: -72, squash: -0.14, tiltDeg: 6 },
  lobToss: { armDeg: 66, wristDeg: 58, squash: 0.12, tiltDeg: -5, ballLift: 96 },
  lobSmash: { armDeg: -46, wristDeg: -78, squash: -0.16, tiltDeg: 4 },
  lobHold: { armDeg: -20, wristDeg: -30, squash: -0.04, tiltDeg: 0 },
  dashWind: { armDeg: 82, wristDeg: 40, squash: 0.14, tiltDeg: 0, tailStretch: 0.1 },
  dashGo: { armDeg: 34, wristDeg: 8, squash: -0.14, tiltDeg: 0, tailStretch: 0.8 },
  dashSwing: { armDeg: -78, wristDeg: -84, squash: -0.06, tiltDeg: 8 },
  callUp: { armDeg: 18, wristDeg: -14, squash: -0.05, tiltDeg: 0 },
  stunned: { armDeg: 58, wristDeg: 64, squash: 0.2, tiltDeg: 13, tailStretch: -0.25, ballShow: 0 },
  roar: { armDeg: -10, wristDeg: -20, squash: -0.1, tiltDeg: 0, tailStretch: 0.5 },
  /** The sidestep away from a swatted ball (v146 rally): low and stretched, tail streaming. */
  dodge: { armDeg: 30, wristDeg: 10, squash: -0.1, tiltDeg: 8, tailStretch: 0.6 },
  /** v147 towel break: slumped, racket drooping, no ball (a towel hangs over her shoulders, see `FedererRig.setTowel`). */
  towel: { armDeg: 58, wristDeg: 70, squash: 0.16, tiltDeg: 6, tailStretch: -0.3, ballShow: 0 },
  /** v147 the tie-break racket smash: racket way up and back, then down hard. */
  rageWind: { armDeg: 100, wristDeg: 62, squash: 0.16, tiltDeg: -6, ballShow: 0, tailStretch: 0.2 },
  rageSmash: { armDeg: -92, wristDeg: -98, squash: -0.2, tiltDeg: 9, tailStretch: 0.7 },
} as const;

export const FEDERER_POSE_MS = {
  volleyWind: 380, volleyHold: 220, volleyBack: 380,
  serveToss: 760, serveSmash: 80, serveBackDelay: 170, serveBack: 520,
  lobToss: 720, lobSmash: 85, lobHold: 260, lobBackDelay: 160, lobBack: 560,
  dashWind: 480, dashGo: 110, dashSwing: 100, dashBackDelay: 120, dashBack: 520,
  callUp: 380, callBack: 460, callBackDelay: 160,
  stunned: 200, stunBack: 520,
  roar: 220, roarBack: 600, roarBackDelay: 700,
  dodge: 110, dodgeBack: 340, dodgeBackDelay: 200,
  towel: 420, towelBack: 520,
  rageWind: 640, rageSmash: 90, rageBackDelay: 180, rageBack: 620,
} as const;

/**
 * The tennis cat's sky lobs (`systems/BallLobSystem.ts`): the ball leaves the racket and soars up out of sight, hangs in the
 * sky, then comes down on a spot that is marked by a growing shadow and a ring (like the crows of the Crow Rain, but they
 * hurt Varu and stay a lot longer in the air). The damage numbers and the how-many are `FEDERER.lob` in `config/bosses.ts`.
 */
export const BALL_LOB = {
  sizePx: 40,
  /** Up: how high it climbs (px), the scale at the top (closer to the camera), and how long it takes. */
  riseMs: 380,
  riseHeightPx: 640,
  apexScale: 2.3,
  /** Hang: out of sight. The marker on the floor is faint and small. */
  hangMs: 300,
  /** Down: it starts this far above and to a random side of the spot, and shrinks to normal size while the marker grows. */
  fallMs: 820,
  fromAbove: 560,
  fromSide: 110,
  startScale: 2.5,
  spinPerMs: 0.9,
  /** The marker: a shadow that grows with the fall and a ring that shows how far the blow reaches. */
  marker: { shadowW: 1.15, shadowH: 0.58, startShare: 0.25, startAlpha: 0.2, endAlpha: 0.85 },
  ring: { color: 0xd7f03a, fill: 0.07, stroke: 0.65, soonColor: 0xff4d4d, soonAt: 0.7 },
  /** After the landing: two hops with a squash, then it fades. */
  squash: { x: 1.35, y: 0.66, ms: 70 },
  hops: [{ heightPx: 54, ms: 230, driftPx: 26 }, { heightPx: 22, ms: 150, driftPx: 14 }] as const,
  fade: { delayMs: 220, ms: 260 },
  fuzz: { count: 10, tint: [0xd7f03a, 0xf1fba0, 0xffffff] },
  dust: { count: 8, tint: [0xe6d9b3, 0xc2b48c, 0xf5ecd0] },
  /** The pop on the ground: a ring (game px) that spreads. */
  pop: { ringMs: 300, color: 0xf1fba0 },
  depth: { marker: 26, ball: 50, fuzz: 49, dust: 11 }, // marker 26: above the lights-out dark sheet (24.6) so the landing warning stays readable
} as const;

/** The fireball's little flames (`systems/ProjectileSystem.ts`): a few embers leave the ball every `everyMs` and rise while they fade. Visual only. */
export const FIREBALL_FX = {
  depth: 24,
  everyMs: 28,
  perTick: 2,
  /** Embers start this far (px) behind the ball and scatter this much sideways. */
  backPx: 7,
  jitterPx: 5,
  lifespanMs: { min: 220, max: 420 },
  speed: { min: 10, max: 50 },
  gravityY: -90,
  scale: { start: 0.9, end: 0 },
  alpha: { start: 0.95, end: 0 },
  tint: [0xfff3a0, 0xffb347, 0xff7a2a, 0xe0402a],
} as const;

/** The word and pop when the tennis cat smashes Varu's ball back (`systems/Effects.ts`). */
export const TENNIS_RETURN_FX = {
  word: { text: 'CONTRA!', color: '#ffe066', size: 26 },
  sparks: 9,
  shake: { ms: 60, intensity: 0.003 },
} as const;

/** The juice of a landing ball of the tennis cat's rain (`systems/Effects.ts`): a small shake, and a word every `gapMs` at most. */
export const BALL_FX = {
  shake: { ms: 70, intensity: 0.003 },
  word: { gapMs: 140, offsetY: 30, size: 24, color: '#d7f03a' },
} as const;

/**
 * Flinch: a cat the belt is about to hit squashes and flashes for a moment, so you can SEE the hit coming.
 * Visual only: the cat does not move, so it stays inside the reach and no damage is lost (hop-back dodging could come later).
 */
export const FLINCH = {
  enabled: true,
  /** Which attacks warn the cats: the spin yes, the quick swing no. */
  spin: true,
  swing: false,
  /** The cat flinches when the belt tip is this many degrees away from it (the spin whips fast, so this is a wide angle). */
  leadDeg: 100,
  /** Extra squash (wider and shorter) that fades out over `ms`. Keep it small: the hitbox follows the scale a little. */
  squash: 0.14,
  ms: 200,
  flashColor: 0xfff3d6,
  flashMs: 70,
} as const;

/**
 * Idle habits: after a few seconds of standing still Varu does a small thing: takes a drag (the cigarette pose above),
 * checks his belt, or cracks his neck. Visual only; any move, swing or hit ends it at once.
 */
export const IDLE_HABITS = {
  enabled: true,
  /** The first habit comes after this long standing still (ms), the next ones after a random gap. */
  afterMs: 4000,
  gapMs: { min: 5500, max: 9500 },
  /** How often each habit is picked (bigger = more often). It never repeats the one before. */
  weights: { drag: 1, belt: 1, neck: 1 },
  /** He looks the belt over: it lifts and turns twice, with a little glint. `tiltDeg` follows `times` (0..1 of `ms`). */
  belt: { ms: 1000, times: [0, 0.18, 0.4, 0.58, 0.8, 1], tiltDeg: [0, 18, 8, 20, 6, 0] },
  /** He cracks his neck: the body leans left, then right, then settles. */
  neck: { ms: 800, times: [0, 0.22, 0.4, 0.62, 0.78, 1], tiltDeg: [0, -9, -9, 7, 7, 0] },
  /** Where the little glint of the belt shows, relative to the fist (px, before the body turn). */
  glintCount: 4,
} as const;

/**
 * The bed cage show (systems/props/PropFx.ts, listens to CatCaged / CatReleased / BedRearmed). All code-drawn, visual only:
 * bars + a padlock over the bed with the cat behind them, a fluff burst when it gets out, a pillow that drops back with a squash.
 * Sizes are px around the bed's center (a bed is 2x2 tiles = 80 px).
 */
export const BED_CAGE_FX = {
  /** Above the bed, below the actors (they start at 10). */
  depth: 9.6,
  /** Cage box: half width / half height, and how far down from the bed's center it sits. */
  box: { halfW: 32, halfH: 22, offsetY: 4 },
  bars: { count: 5, width: 5, rail: 6, fill: 0xb9c4d6, light: 0xeaf0fa, outline: 0x1b2340, outlinePx: 3 },
  /** The padlock hangs on the bottom rail. */
  lock: { w: 16, h: 13, shackleR: 5, fill: 0xf5c518, keyhole: 0x1b2340, popDelayMs: 130, popMs: 170 },
  /** The bars drop in from above when the cat is caged. */
  drop: { fromPx: 28, ms: 220 },
  /** The whole cage shakes when it slams shut (and the camera nudges). */
  slam: { px: 5, ms: 55, repeats: 5, cameraMs: 80, cameraIntensity: 0.003 },
  /** The cat behind the bars: smaller, dim, and shaking a little all the time (muffled). */
  cat: { fitW: 54, fitH: 38, tint: 0xaeb2d6, alpha: 0.9, shakePx: 1.5, wobbleDeg: 3, shakeMs: 70 },
  /** A small "miau" from inside now and then. */
  miau: { firstMs: 450, everyMs: { min: 900, max: 1500 }, color: '#d9d9f2', size: 15, offsetY: 8 },
  /** The word when the cage shuts. */
  word: { color: '#ffe9a0', size: 30, offsetY: -58 },
  /** The cat gets out: fluff (more if it escaped by itself), the bars lift away. */
  release: {
    fluff: 14, fluffEscaped: 32, glintEscaped: 5,
    liftPx: 26, liftMs: 190,
    shakeMs: 90, shakeIntensity: 0.004,
    word: { color: '#ffb3cf', size: 34, offsetY: -48 },
  },
  /** The rest is over: a pillow drops onto the bed, squashes, springs back and fades into the real one. */
  rearm: {
    pillow: { w: 56, h: 30, fill: 0xffd6dc, shade: 0xf2a9bd, seam: 0xe58aa4, outline: 0x1b2340, outlinePx: 3 },
    startPx: 48, restOffsetY: -4, fallMs: 240,
    squashX: 1.3, squashY: 0.6, squashMs: 100,
    springMs: 380, hopPx: 8,
    holdMs: 120, fadeMs: 180,
    pop: { glint: 5, fluff: 6 },
    word: { color: '#ffd1e0', size: 22, offsetY: -40 },
  },
} as const;

/** The queen's red carpet attack drawn as a real carpet (`systems/CarpetRoll.ts`). Sizes in game px, times in ms. */
export const CARPET_FX = {
  navy: 0x1b2340,
  gold: 0xffd166,
  rollColor: 0x8f0d18,
  /** Thickness of the gold trim along the long edges, and of the roll at the tip while the carpet unrolls. */
  trimPx: 12,
  rollPx: 22,
  /** The carpet is a bit see-through while it warns, solid when it strikes (flash, hold, then fade). */
  warnAlpha: 0.72,
  flashAlpha: 0.45,
  flashMs: 140,
  holdMs: 140,
} as const;
