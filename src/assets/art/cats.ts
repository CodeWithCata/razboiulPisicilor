/** @file Code-drawn cat sprites: normal (and the stands' fan, in any fur color), fat, ninja, kamikaze, flying, lucky, tennis, bomber (96x96, facing up). The tennis cat is layered: body, racket arm, racket. */
import { COLORS } from '../../config/style';
import { drawPetard } from './items';
import { C, E, P, R, T, Tpart, ellipsePts, flat, heart, ink, layer, sparkle, type G, type Pt, type Shape } from './shapes';

interface CatLook {
  fur: number;
  inner: number;
  bodyW?: number;
  bodyH?: number;
  tail?: Pt[];
  tailW?: number;
  /** Leave out the right front paw (a loose arm layer takes its place, e.g. the bomber's). */
  noRightFrontPaw?: boolean;
}

const TAIL: Pt[] = [[48, 70], [47, 81], [52, 88], [60, 86], [63, 79]];

/** Shared top-down cat, seen from behind (96x96 canvas, facing UP): tail, body with four paws, head with ears. */
function cat(g: G, o: CatLook): void {
  const w = o.bodyW ?? 38;
  const h = o.bodyH ?? 44;
  const side = w / 2 + 1;
  layer(g, [T(o.tail ?? TAIL, o.tailW ?? 7)], o.fur);
  const paws: Shape[] = [E(48 - side, 66, 10, 14), E(48 + side, 66, 10, 14), E(48 - side - 1, 38, 10, 12), E(48 + side + 1, 38, 10, 12)];
  if (o.noRightFrontPaw) paws.pop(); // the right front paw is the last one
  layer(g, [E(48, 55, w, h), ...paws], o.fur);
  layer(g, [E(48, 26, 38, 32), P([[32, 24], [27, 4], [46, 13]]), P([[64, 24], [69, 4], [50, 13]])], o.fur);
  flat(g, [P([[33, 19], [31, 9], [40, 14]]), P([[63, 19], [65, 9], [56, 14]])], o.inner);
}

/** What a fan wears. Soccer: scarf, jersey (striped shirt). Colosseum: toga, caesar (toga + laurel wreath), centurion (red cape + crested helmet), gladiator (leather harness + plumed bronze helmet). */
export type FanOutfit = 'none' | 'scarf' | 'jersey' | 'toga' | 'caesar' | 'centurion' | 'gladiator';

/** The look of one lovestruck tabby: fur, the darker stripes, the inside of the ears, an outfit (with its two team colors) and maybe a flag. */
export interface FanLook {
  fur: number;
  dark: number;
  inner: number;
  outfit?: FanOutfit;
  /** The outfit's two colors (scarf and jersey stripes). */
  colors?: readonly [number, number];
  /** Color of a little flag held up in one paw. */
  flag?: number;
  /** `hearts` (the game's lovestruck tabby, the default), `happy` (^ ^ cheering) or `wide` (big excited eyes looking up at the field). */
  eyes?: 'hearts' | 'happy' | 'wide';
}

/**
 * Which picture of a fan: `idle` (paws down), `cheerA` and `cheerB` (arms up, mouth wide open). The crowd swaps A and B to pump the
 * arms; on a fan with a flag, the flag swings from one side to the other.
 */
export type FanPose = 'idle' | 'cheerA' | 'cheerB';

const ORANGE_TABBY: FanLook = { fur: 0xf59a3c, dark: 0xd9731a, inner: 0xf4a5a0 };
const GOLD = COLORS.gold;
const PURPLE = 0x7a4fb5;
const LEATHER = 0x7b4a22;
const NAVY_EYE = COLORS.navy;

/** Soccer scarf: round the neck, one end hanging down the back with two stripes. */
function fanScarf(g: G, [a, b]: readonly [number, number]): void {
  layer(g, [R(52, 44, 9, 22, 2)], a, 2.2);
  layer(g, [T([[31, 45], [48, 49], [65, 45]], 7)], a, 2.2);
  flat(g, [T([[40, 46.5], [41, 52]], 2.6), T([[55, 46.5], [54, 52]], 2.6), R(52, 54, 9, 3.5, 1), R(52, 61, 9, 3.5, 1)], b);
}

/** Soccer jersey: a shirt over the back in team stripes. */
function fanJersey(g: G, [a, b]: readonly [number, number]): void {
  layer(g, [E(48, 59, 36, 34)], a, 2.2);
  flat(g, [T([[40, 50], [40, 70]], 5), T([[56, 50], [56, 70]], 5)], b);
}

/** Roman toga: a cream wrap with a purple sash and a gold brooch. */
function fanToga(g: G): void {
  layer(g, [E(48, 59, 36, 34)], COLORS.cream, 2.2);
  layer(g, [T([[34, 47], [48, 60], [60, 70]], 6)], PURPLE, 2);
  flat(g, [C(36, 49, 2.6)], GOLD);
}

/** Laurel wreath round the head, drawn before the heart eyes so they stay in front. */
function fanLaurel(g: G): void {
  const pts = ellipsePts(48, 25, 25, 20, 0, 16);
  layer(g, pts.map(([x, y]) => C(x, y, 3.6)), 0x5fa34a, 1.8);
  flat(g, pts.map(([x, y]) => C(x - 1, y - 1, 1.4)), 0x8fcf6e);
}

/** Centurion: a red cape with gold clasps, a silver helmet with a red crest across the top. */
function fanCenturionBody(g: G): void {
  layer(g, [P([[33, 43], [63, 43], [69, 75], [27, 75]])], 0xc82e2e, 2.2);
  for (const [x1, x2] of [[48, 48], [40, 37], [56, 59]] as const) ink(g, [[x1, 47], [x2, 73]], 1.6, 0x8f1f1f);
  flat(g, [C(36, 44.5, 2.6), C(60, 44.5, 2.6)], GOLD);
}
function fanCenturionHead(g: G): void {
  layer(g, [E(48, 22, 24, 22)], 0xc9ced8, 2.2);
  layer(g, [R(32, 9, 32, 8, 3)], 0xc82e2e, 2.2);
  for (const x of [38, 44, 50, 56]) ink(g, [[x, 10.5], [x, 15.5]], 1.6, 0x8f1f1f);
}

/** Gladiator: a leather harness crossed over the back with a silver shoulder plate, a bronze helmet with a tall gold plume. */
function fanGladiatorBody(g: G): void {
  layer(g, [T([[33, 46], [63, 71]], 4.5), T([[63, 46], [33, 71]], 4.5)], LEATHER, 2);
  flat(g, [C(48, 58.5, 3.2)], GOLD);
  layer(g, [E(32, 47, 15, 11)], 0xc9ced8, 2);
  ink(g, [[27, 47], [37, 47]], 1.4, 0x8a92a6);
}
function fanGladiatorHead(g: G): void {
  layer(g, [E(48, 22, 24, 22)], 0xb8893f, 2.2);
  layer(g, [T([[48, 3], [48, 36]], 8)], GOLD, 2.2);
  for (const y of [8, 15, 22, 29]) ink(g, [[44, y], [52, y]], 1.6, 0xc99a10);
}

/** The face. Hearts: the eyes ARE hearts (no eye whites), huge pink hearts that overflow the head a bit. The cheering faces get a nose, an open mouth and pink cheeks. */
function fanFace(g: G, eyes: 'hearts' | 'happy' | 'wide', cheer: boolean): void {
  if (eyes === 'hearts') {
    for (const x of [33, 63]) {
      layer(g, heart(x, 27, 11), 0xff3d71, 1.8);
      flat(g, [C(x - 4.2, 21.5, 2.2)], 0xffffff);
    }
    if (cheer) fanShout(g);
    return;
  }
  flat(g, [C(31, 34, 4), C(65, 34, 4)], 0xff8fa3, 0.8);
  if (eyes === 'happy') {
    ink(g, [[31, 29], [38, 21], [45, 29]], 3.6);
    ink(g, [[51, 29], [58, 21], [65, 29]], 3.6);
  } else {
    for (const x of [38, 58]) {
      layer(g, [E(x, 25, 13, 15)], 0xffffff, 2);
      flat(g, [C(x, 22, 4.2)], NAVY_EYE);
      flat(g, [C(x - 1.6, 20, 1.4)], 0xffffff);
    }
  }
  flat(g, [P([[44.5, 30], [51.5, 30], [48, 34]])], 0xf4a5a0);
  if (cheer) {
    fanShout(g);
    return;
  }
  layer(g, [E(48, 38, 11, 8)], NAVY_EYE, 1.2);
  flat(g, [E(48, 40, 6, 3.6)], 0xff6b81);
}

/** The cheering mouth: wide open, with a pink tongue (it fits inside the chin). */
function fanShout(g: G): void {
  layer(g, [E(48, 37.5, 14, 10)], NAVY_EYE, 1.2);
  flat(g, [E(48, 40.5, 8, 4.5)], 0xff6b81);
}

/** A little flag held up in a paw. */
function fanFlag(g: G, color: number): void {
  layer(g, [T([[71, 42], [82, 11]], 3)], LEATHER, 1.6);
  layer(g, [P([[82, 11], [94, 15], [82, 23]])], color, 1.8);
}

/**
 * One raised arm for the cheer frames: a fur tube from the shoulder up to a paw with a pink pad. `high` reaches almost to the top of
 * the picture, the other height stays lower. The paw's middle comes back so a flag can be stuck in it.
 */
function fanArm(g: G, look: FanLook, left: boolean, high: boolean): readonly [number, number] {
  const mirror = (x: number): number => (left ? x : 96 - x);
  const tip: readonly [number, number] = high ? [mirror(22), 12] : [mirror(15), 23];
  layer(g, [T([[mirror(32), 46], [mirror(21), 34], tip], 9, 8), E(tip[0], tip[1], 12, 13)], look.fur);
  flat(g, [C(tip[0], tip[1] + 0.5, 2.6)], look.inner);
  return tip;
}

/** The flag of a cheering fan, held up in the right paw: pole leaning one way and the flag trailing the other, so A and B make it wave. */
function fanFlagWave(g: G, color: number, tip: readonly [number, number], flip: boolean): void {
  const [x, y] = tip;
  if (flip) {
    layer(g, [T([[x, y - 2], [x + 7, y - 20]], 3)], LEATHER, 1.6);
    layer(g, [P([[x + 7, y - 20], [x - 8, y - 16], [x + 6, y - 8]])], color, 1.8);
  } else {
    layer(g, [T([[x, y - 2], [x - 5, y - 21]], 3)], LEATHER, 1.6);
    layer(g, [P([[x - 5, y - 21], [x + 11, y - 17], [x - 4, y - 9]])], color, 1.8);
  }
}

/**
 * The lovestruck tabby in any fur color, with an outfit from the soccer stands or the Colosseum (used by the supporters in the stands).
 * `pose` picks the frame: paws down (default) or the two cheering frames with both arms up (see `FanPose`).
 */
export function drawCatFan(g: G, look: FanLook, pose: FanPose = 'idle'): void {
  const { fur, dark, inner, outfit = 'none', colors = [COLORS.red, COLORS.cream] } = look;
  const cheer = pose !== 'idle';
  const tail = TAIL;
  cat(g, { fur, inner, tail });
  flat(g, [Tpart(tail, 7, 0.25, 0.4), Tpart(tail, 7, 0.55, 0.7), Tpart(tail, 7, 0.85, 1)], dark);
  for (const [y, w] of [[46, 20], [55, 22], [64, 20]] as const) flat(g, [T([[48 - w / 2, y], [48, y + 3], [48 + w / 2, y]], 4)], dark);
  for (const x of [44, 48, 52]) ink(g, [[x, 13], [x, x === 48 ? 21 : 19]], 2.6, dark);
  // Cheering: both arms go up behind the clothes (A: the left one higher, B: the right one higher; a flag arm stays low and waves).
  let rightPaw: readonly [number, number] = [81, 23];
  if (cheer) {
    fanArm(g, look, true, pose === 'cheerA');
    rightPaw = fanArm(g, look, false, pose === 'cheerB' && look.flag === undefined);
  }
  // Clothes on the body, then gear on the head, then the heart eyes in front of everything.
  if (outfit === 'scarf') fanScarf(g, colors);
  if (outfit === 'jersey') fanJersey(g, colors);
  if (outfit === 'toga' || outfit === 'caesar') fanToga(g);
  if (outfit === 'centurion') fanCenturionBody(g);
  if (outfit === 'gladiator') fanGladiatorBody(g);
  if (outfit === 'caesar') fanLaurel(g);
  if (outfit === 'centurion') fanCenturionHead(g);
  if (outfit === 'gladiator') fanGladiatorHead(g);
  fanFace(g, look.eyes ?? 'hearts', cheer);
  if (look.flag !== undefined) {
    if (cheer) fanFlagWave(g, look.flag, rightPaw, pose === 'cheerB');
    else fanFlag(g, look.flag);
  }
}

/** Orange tabby. */
export function drawCatNormal(g: G): void {
  drawCatFan(g, ORANGE_TABBY);
}

/** Fat cat: huge round grey blob with a small head bump, tiny paws and a stub tail. */
export function drawCatFat(g: G): void {
  const fur = 0x8f9096;
  layer(g, [T([[48, 78], [47, 85], [51, 90]], 6)], fur);
  layer(g, [E(11, 36, 10, 12), E(85, 36, 10, 12), E(23, 75, 12, 9), E(73, 75, 12, 9)], 0x7d7e84);
  layer(g, [E(48, 49, 80, 66), E(48, 15, 42, 22), P([[32, 16], [29, 3], [44, 10]]), P([[64, 16], [67, 3], [52, 10]])], fur);
  flat(g, [P([[34, 12], [33, 7], [40, 10]]), P([[62, 12], [63, 7], [56, 10]])], 0x7d7e84);
}

/** Ninja cat: black, purple headband with flying ribbons, two katanas crossed on the back. */
export function drawCatNinja(g: G): void {
  const fur = 0x2e3040;
  const purple = 0x7a4fb5;
  cat(g, { fur, inner: 0x5a4a78, bodyW: 34, bodyH: 50 });
  // Katanas: scabbards crossed over the back, hilts above the shoulders.
  layer(g, [T([[33, 35], [68, 80]], 5)], 0x4b4f66, 2.5);
  layer(g, [T([[63, 38], [36, 78]], 4)], 0x5a4590, 2.5);
  layer(g, [T([[31, 33], [35, 38]], 5)], 0x8b5a2b, 2.5);
  flat(g, [C(37, 40, 2.2)], COLORS.gold);
  // Headband and ribbons.
  layer(g, [P([[64, 24], [80, 19], [93, 25], [80, 28]]), P([[64, 28], [79, 32], [90, 40], [76, 35]])], purple, 2.5);
  layer(g, [T([[34, 25], [48, 28], [62, 25]], 6)], purple, 2.5);
}

/** Kamikaze cat: white, red bandana, paws up, dynamite with a lit fuse. */
export function drawCatKamikaze(g: G): void {
  const fur = 0xf7f7f7;
  cat(g, { fur, inner: 0xf4b6b6, tail: [[48, 78], [48, 86], [47, 92]], tailW: 6 });
  // Paws raised beside the head and little panic lines.
  layer(g, [E(24, 24, 10, 15), E(72, 24, 10, 15)], fur);
  for (const [x, y, dx] of [[16, 14, -1], [16, 22, -1], [80, 14, 1], [80, 22, 1]] as const) ink(g, [[x, y], [x + dx * 5, y - 3]], 1.8);
  // Bandana with a knot at the back of the head.
  layer(g, [P([[46, 34], [40, 45], [47, 42]]), P([[50, 34], [56, 45], [49, 42]]), C(48, 34, 4)], COLORS.red, 2.5);
  layer(g, [T([[33, 26], [48, 29], [63, 26]], 6)], COLORS.red, 2.5);
  // Dynamite bundle strapped to the back.
  for (const x of [39, 47, 55]) layer(g, [R(x - 3.5, 50, 7, 24, 1.5)], 0xd33a3a, 1.8);
  flat(g, [T([[33, 55], [63, 55]], 3.2), T([[33, 68], [63, 68]], 3.2)], 0x33333f);
  ink(g, [[47, 50], [50, 43], [54, 40]], 2);
  sparkle(g, 55, 38, 5, 0xffe066);
  flat(g, [C(55, 38, 2.4)], 0xff9a1f);
}

/** Where each wing joins the flying cat's body on its 96x96 canvas (the wing's turning point). The left wing is the mirror image. */
export const FLYER_WING_PIVOT = { x: 60, y: 51 } as const;

const WING_RIGHT: Pt[] = [[60, 44], [76, 36], [93, 37], [88, 42], [95, 46], [87, 51], [92, 56], [82, 56], [86, 62], [72, 58], [62, 58]];
const WING_FEATHERS = [[66, 46, 88, 44], [66, 51, 88, 52], [66, 55, 82, 58]] as const;

/** One wing alone on its own 96x96 canvas (right = +1, left = -1), so it can flap around its shoulder. */
function drawWing(g: G, side: 1 | -1): void {
  const fx = (x: number): number => (side === 1 ? x : 96 - x);
  layer(g, [P(WING_RIGHT.map(([x, y]): Pt => [fx(x), y]))], 0xf5f8ff, 2.5);
  for (const [x1, y1, x2, y2] of WING_FEATHERS) ink(g, [[fx(x1), y1], [fx(x2), y2]], 1.2, 0xaebbd6);
}
export const drawWingRight = (g: G): void => drawWing(g, 1);
export const drawWingLeft = (g: G): void => drawWing(g, -1);

/** The flying cat without wings (the wings are loose layers, see entities/enemies/FlyingCatRig.ts). */
export function drawCatFlyingBody(g: G): void {
  cat(g, { fur: 0x8fa6c9, inner: 0xc9d6ee, bodyW: 32, bodyH: 46 });
  layer(g, [C(48, 12, 8)], 0xf26b9a, 2.5);
  for (const pts of [[[42, 9], [50, 7]], [[41, 13], [53, 9]], [[43, 17], [54, 13]]] as Pt[][]) ink(g, pts, 1.4, 0xc94479);
  ink(g, [[56, 12], [62, 9], [66, 11]], 1.6, 0xf26b9a);
}

/** Flying cat, wings spread and still (menu parade): blue-grey, white wings, a ball of yarn on its head. */
export function drawCatFlying(g: G): void {
  drawWing(g, 1);
  drawWing(g, -1);
  drawCatFlyingBody(g);
}

/** Lucky cat (Pisica Norocoasă): golden fur with darker stripes, gold coins for eyes, a four-leaf clover on her back and sparkles around her. */
export function drawCatLucky(g: G): void {
  const fur = 0xf5c518;
  const dark = 0xc99a0e;
  const tail = TAIL;
  cat(g, { fur, inner: 0xffd9a8, tail });
  flat(g, [Tpart(tail, 7, 0.25, 0.4), Tpart(tail, 7, 0.55, 0.7), Tpart(tail, 7, 0.85, 1)], dark);
  for (const [y, w] of [[46, 20], [64, 20]] as const) flat(g, [T([[48 - w / 2, y], [48, y + 3], [48 + w / 2, y]], 4)], dark);
  // Coin eyes.
  for (const x of [33, 63]) {
    layer(g, [C(x, 27, 8.5)], 0xfff1a8, 1.8);
    flat(g, [C(x, 27, 4.6)], 0xe0a800);
  }
  // Four-leaf clover on her back.
  flat(g, [C(42, 54, 5), C(54, 54, 5), C(42, 63, 5), C(54, 63, 5)], 0x3fbf5a);
  ink(g, [[48, 59], [52, 73]], 2.2, 0x2a8f43);
  // Sparkles around her.
  sparkle(g, 12, 20, 6, 0xfff7c2);
  sparkle(g, 85, 44, 5, 0xfff7c2);
  sparkle(g, 18, 72, 4, 0xfff7c2);
}

/** Where the tennis cat's loose layers pivot, in texture px (96x96). `TennisCatRig` reads these, so art and animation can never drift apart. */
export const TENNIS_SHOULDER = { x: 56, y: 50 } as const;
/** The grip: the racket layer pivots here (a wrist flick turns the racket, not the arm). */
export const TENNIS_PAW = { x: 70, y: 42 } as const;
/** The middle of the racket strings. */
export const TENNIS_RACKET_HEAD = { x: 78, y: 24 } as const;
/** Where the ball rests: above her raised left paw. */
export const TENNIS_BALL_HAND = { x: 16, y: 16 } as const;

const TENNIS_FUR = 0x7fd4a6;
const TENNIS_DARK = 0x3fa675;
const TENNIS_RACKET_TILT = 0.35;

/** Tennis cat (Pisica de Tenis): mint fur, pink bow, white headband, left paw raised. The racket arm, the racket and the ball are loose layers (see `TennisCatRig`). First ranged cat. */
export function drawCatTennis(g: G): void {
  const fur = TENNIS_FUR;
  const dark = TENNIS_DARK;
  const tail: Pt[] = [[48, 70], [47, 81], [52, 88], [60, 86], [63, 79]];
  cat(g, { fur, inner: 0xf4b6c2, tail });
  flat(g, [Tpart(tail, 7, 0.3, 0.45), Tpart(tail, 7, 0.65, 0.8)], dark);
  for (const [y, w] of [[48, 18], [58, 20]] as const) flat(g, [T([[48 - w / 2, y], [48, y + 3], [48 + w / 2, y]], 4)], dark);
  for (const x of [44, 48, 52]) ink(g, [[x, 13], [x, x === 48 ? 20 : 18]], 2.4, dark);
  // Left paw raised (the ball is a loose image above it), white wristband.
  layer(g, [E(22, 28, 10, 15)], fur);
  flat(g, [T([[18, 33], [27, 33]], 3.5)], 0xffffff);
  // Headband (white with a green stripe) over the forehead, knot ribbons trailing to the left.
  layer(g, [T([[34, 25], [48, 28], [62, 25]], 6)], 0xffffff, 2.5);
  flat(g, [T([[36, 25.6], [48, 28.6], [60, 25.6]], 1.8)], 0x3fa675);
  layer(g, [P([[34, 25], [27, 23], [24, 29], [33, 29]])], 0xffffff, 2);
  // Girly touches: pink bow on the left ear, blush cheeks.
  flat(g, [E(31, 39, 7, 4.5), E(65, 39, 7, 4.5)], 0xff8fb0, 0.75);
  layer(g, [P([[34, 12], [28, 8.5], [28, 15.5]]), P([[34, 12], [40, 8.5], [40, 15.5]]), C(34, 12, 2.4)], 0xff6fa5, 1.8);
  flat(g, [C(34, 12, 1.1)], 0xffb3cf);
}

/** The tennis cat's racket arm: a fur arm ending in a paw at TENNIS_PAW. Pivots on TENNIS_SHOULDER, which sits inside the body. */
export function drawTennisArm(g: G): void {
  layer(g, [T([[TENNIS_SHOULDER.x, TENNIS_SHOULDER.y], [64, 46], [TENNIS_PAW.x, TENNIS_PAW.y]], 8), C(TENNIS_PAW.x, TENNIS_PAW.y, 4.5)], TENNIS_FUR);
  // Hides the outline where the arm starts inside the body (same fur color).
  flat(g, [C(TENNIS_SHOULDER.x, TENNIS_SHOULDER.y, 7.5)], TENNIS_FUR);
}

/** The racket (tilted a little): brown grip ending at TENNIS_PAW, red frame, cream strings. Pivots on TENNIS_PAW. */
export function drawTennisRacket(g: G): void {
  const rot = TENNIS_RACKET_TILT;
  const { x: hx, y: hy } = TENNIS_RACKET_HEAD;
  const rp = (lx: number, ly: number): Pt => [hx + lx * Math.cos(rot) - ly * Math.sin(rot), hy + lx * Math.sin(rot) + ly * Math.cos(rot)];
  layer(g, [T([rp(0, 14), [TENNIS_PAW.x, TENNIS_PAW.y]], 4.5)], 0x6b4423, 2.5);
  layer(g, [P(ellipsePts(hx, hy, 12, 16, rot))], COLORS.red, 2.5);
  layer(g, [P(ellipsePts(hx, hy, 8.5, 12.5, rot))], 0xfff3d6, 1.2);
  for (const u of [-4.5, 0, 4.5]) {
    const k = 11.5 * Math.sqrt(1 - (u / 8.5) ** 2);
    ink(g, [rp(u, -k), rp(u, k)], 0.9, 0xb8a98a);
    const j = 7.8 * Math.sqrt(1 - ((u * 1.35) / 12.5) ** 2);
    ink(g, [rp(-j, u * 1.35), rp(j, u * 1.35)], 0.9, 0xb8a98a);
  }
}

const BOMBER_FUR = 0xf59a3c;
const BOMBER_DARK = 0xd9731a;
/** Where the bomber cat's throwing arm pivots (inside her body) and where its paw rests, in texture px (96x96). `BomberCatRig` reads these. */
export const BOMBER_SHOULDER = { x: 60, y: 50 } as const;
export const BOMBER_PAW = { x: 80, y: 61 } as const;

/** Bomber cat (Pisica Bombardier): fat orange tabby, crossed leather straps over the back, petards (the same picture she throws) on her hip, a creepy white cat mask on her face, one paw raised for the throw (the petard she holds is a loose image, see `BomberCat`). */
export function drawCatBomber(g: G): void {
  const fur = BOMBER_FUR;
  const dark = BOMBER_DARK;
  const tail: Pt[] = [[48, 70], [47, 80], [41, 88], [33, 85], [32, 77]];
  cat(g, { fur, inner: 0xf4a5a0, bodyW: 44, bodyH: 46, tail, noRightFrontPaw: true });
  flat(g, [Tpart(tail, 7, 0.3, 0.45), Tpart(tail, 7, 0.65, 0.8)], dark);
  // Tabby stripes on the back and head.
  for (const [y, w] of [[47, 22], [57, 24], [67, 20]] as const) flat(g, [T([[48 - w / 2, y], [48, y + 3], [48 + w / 2, y]], 4)], dark);
  for (const x of [43, 53]) ink(g, [[x, 14], [x, 19]], 2.2, dark);
  // The throwing arm is a loose layer (`drawBomberArm`, moved by `BomberCatRig`).
  // Crossed leather straps over the back.
  layer(g, [T([[31, 43], [65, 74]], 4.5), T([[65, 43], [31, 74]], 4.5)], 0x8a4a2b, 2);
  // Petards strapped along both straps (a bandolier): the same petard picture, across the strap.
  for (const t of [0.14, 0.31, 0.69, 0.86]) {
    petardAt(g, 31 + 34 * t, 43 + 31 * t, 42, 0.32);
    petardAt(g, 65 - 34 * t, 43 + 31 * t, -42, 0.32);
  }
  flat(g, [C(48, 58.5, 3)], COLORS.gold);
  // The petards on her hip are the very petard she throws (`drawPetard`, scaled down), fuses up, fanned out a little.
  for (const [x, y, deg] of [[20, 68, -14], [28, 66, 0], [36, 68, 14]] as const) petardAt(g, x, y, deg, 0.4);
  // Creepy cat mask covering her WHOLE head, ears included: pale, big slanted black eyes with red pupils, a tiny dark nose,
  // rosy spots, whisker lines and a wide stitched grin.
  layer(g, [E(48, 25, 46, 40), P([[29, 24], [23, 1], [47, 12]]), P([[67, 24], [73, 1], [49, 12]])], 0xf2efe6, 2.6);
  flat(g, [P([[30, 18], [27, 6], [38, 13]]), P([[66, 18], [69, 6], [58, 13]])], 0x2a2a3a);
  flat(g, [T([[31, 15], [43, 23]], 6), T([[65, 15], [53, 23]], 6)], 0x15151c);
  flat(g, [C(40, 20.5, 1.7), C(56, 20.5, 1.7)], 0xff3b3b);
  flat(g, [P([[45, 29], [51, 29], [48, 33]])], 0x2a2a3a);
  flat(g, [C(30, 31, 3.4), C(66, 31, 3.4)], 0xe58a8a, 0.8);
  ink(g, [[26, 27], [34, 29]], 1.2, 0x8a8478);
  ink(g, [[70, 27], [62, 29]], 1.2, 0x8a8478);
  ink(g, [[34, 36], [40, 40], [45, 36], [51, 40], [56, 36], [62, 40]], 1.8, 0x15151c);
  for (const x of [40, 45, 51, 56]) ink(g, [[x, 35], [x, 41]], 1, 0x15151c);
}

/** The bomber cat's throwing arm: a fur arm from BOMBER_SHOULDER (inside the body) to a paw at BOMBER_PAW, with a leather wristband. It hangs at her side; the rig raises it for the throw. */
export function drawBomberArm(g: G): void {
  const { x: sx, y: sy } = BOMBER_SHOULDER;
  const { x: px, y: py } = BOMBER_PAW;
  layer(g, [T([[sx, sy], [(sx + px) / 2 + 1, (sy + py) / 2 - 1], [px, py]], 7), C(px, py, 4.5)], BOMBER_FUR);
  flat(g, [T([[px - 5.5, py - 2.8], [px - 3, py - 0.8]], 2.8)], 0x8a4a2b);
  // Hides the outline where the arm starts inside the body (same fur color).
  flat(g, [C(sx, sy, 6.5)], BOMBER_FUR);
}

/** Draws the petard texture's picture (32x64, fuse up) centered on (x, y), turned `deg` and scaled, inside a bigger picture. */
function petardAt(g: G, x: number, y: number, deg: number, scale: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas((deg * Math.PI) / 180);
  g.scaleCanvas(scale, scale);
  g.translateCanvas(-16, -32);
  drawPetard(g);
  g.restore();
}
