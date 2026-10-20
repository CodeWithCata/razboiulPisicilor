/** @file Code-drawn Queen Cat in layers (128x128 each, facing UP): body, cape, crown, scepter arm and two feet, so `QueenRig` can animate them apart. */
import { COLORS } from '../../config/style';
import { C, E, P, R, S, T, Tpart, flat, fluff, heart, ink, layer, rod, scalloped, sparkle, type G, type Pt } from './shapes';

const FUR = 0xfffaf0;
const FUR_SHADE = 0xefe3cf;
const PINK = 0xf5c6c6;
const RED = 0xb3303f;
const RED_DARK = 0x8a2232;
const PURPLE = 0x7a4aa0;
const PURPLE_LIGHT = 0x9a6cc0;
const GOLD = COLORS.gold;
const GOLD_DARK = 0xd9a400;
const BLACK = 0x15151c;

/** Where the scepter arm turns on the body texture (her right shoulder), 128px texture coordinates. */
export const QUEEN_SHOULDER = { x: 100, y: 76 } as const;
/** Where the crown sits on her head (the middle of its lower edge): the crown tilts around this point. */
export const QUEEN_CROWN_BASE = { x: 64, y: 28 } as const;
/** The jewel on top of the scepter and the crown's top pearl, for sparkles. */
export const QUEEN_GEMS = { scepter: { x: 112, y: 12 }, crown: { x: 64, y: 6 } } as const;

/** Little ermine tails: small black teardrops with a tip, the royal fur pattern. */
function ermine(g: G, spots: readonly Pt[], s = 1): void {
  for (const [x, y] of spots) {
    flat(g, [P([[x, y - 2.4 * s], [x + 1.5 * s, y + 0.6 * s], [x, y + 2.8 * s], [x - 1.5 * s, y + 0.6 * s]]), C(x, y - 0.8 * s, 1.1 * s)], BLACK);
  }
}

/** The red cape behind her (drawn big, so it peeks out on both sides): ermine hem with black tails, fold lines, gold edge. */
export function drawQueenCape(g: G): void {
  layer(g, [S([[26, 62], [64, 55], [102, 62], [118, 84], [123, 106], [108, 119], [64, 124], [20, 119], [5, 106], [10, 84]])], RED);
  flat(g, [S([[24, 74], [40, 66], [34, 96], [30, 116], [16, 108], [14, 90]])], RED_DARK, 0.5);
  flat(g, [S([[104, 74], [88, 66], [94, 96], [98, 116], [112, 108], [114, 90]])], RED_DARK, 0.5);
  ink(g, [[38, 70], [32, 92], [28, 112]], 1.2, RED_DARK);
  ink(g, [[90, 70], [96, 92], [100, 112]], 1.2, RED_DARK);
  layer(g, fluff([[7, 106], [20, 118], [64, 123], [108, 118], [121, 106]], 6.5), FUR);
  ermine(g, [[14, 108], [26, 116], [40, 119], [54, 121], [74, 121], [88, 119], [102, 116], [114, 108]]);
  ink(g, [[14, 90], [10, 100]], 1.4, GOLD);
  ink(g, [[114, 90], [118, 100]], 1.4, GOLD);
}

/** One round white paw with toe lines, used for the feet and the hands. */
function paw(g: G, x: number, y: number, r: number): void {
  layer(g, [C(x, y, r), C(x - r * 0.62, y - r * 0.75, r * 0.38), C(x, y - r * 0.95, r * 0.4), C(x + r * 0.62, y - r * 0.75, r * 0.38)], FUR);
  ink(g, [[x - r * 0.3, y - r * 1.05], [x - r * 0.3, y - r * 0.55]], 0.8, FUR_SHADE);
  ink(g, [[x + r * 0.3, y - r * 1.05], [x + r * 0.3, y - r * 0.55]], 0.8, FUR_SHADE);
}

/** Her left (the viewer's left) arm: purple sleeve, ermine cuff, a paw holding a golden orb with a cross. */
function drawOrbArm(g: G): void {
  const arm: Pt[] = [[38, 86], [27, 74], [21, 60]];
  layer(g, [T(arm, 13)], PURPLE);
  flat(g, [Tpart(arm, 8, 0.1, 0.8)], PURPLE_LIGHT, 0.6);
  layer(g, fluff([[14, 60], [21, 63], [28, 60]], 4.6), FUR);
  paw(g, 21, 52, 8.5);
  layer(g, [C(21, 36, 9.5)], GOLD);
  flat(g, [P([[12, 36], [21, 33], [30, 36], [21, 39]])], GOLD_DARK);
  layer(g, [R(19.2, 20, 3.6, 8, 1), R(17, 22.2, 8, 3.4, 1)], GOLD, 2);
  flat(g, [C(21, 36, 2.6)], COLORS.red);
  sparkle(g, 25, 31, 2.2);
}

/** The body: purple gown with gold stitching, ermine collar, ruby brooch, round fluffy head with a proper face, orb in her left paw. Crown, cape, scepter arm and feet are separate layers. */
export function drawBossQueen(g: G): void {
  drawOrbArm(g);
  // Right sleeve stub: the scepter arm layer continues from it.
  layer(g, [T([[92, 86], [101, 77]], 13)], PURPLE);
  // Gown with a lighter centre panel, gold stitching and hem.
  layer(g, [S([[34, 72], [64, 67], [94, 72], [100, 92], [94, 112], [64, 117], [34, 112], [28, 92]])], PURPLE);
  flat(g, [S([[50, 76], [64, 74], [78, 76], [80, 96], [76, 114], [64, 116], [52, 114], [48, 96]])], PURPLE_LIGHT, 0.55);
  ink(g, [[44, 108], [52, 112], [64, 114], [76, 112], [84, 108]], 1.6, GOLD);
  for (const [x, y] of [[56, 96], [72, 96], [64, 104], [64, 90]] as const) flat(g, [P([[x, y - 3], [x + 2.2, y], [x, y + 3], [x - 2.2, y]])], GOLD);
  // Ermine collar over the shoulders.
  layer(g, fluff([[32, 74], [46, 82], [64, 86], [82, 82], [96, 74]], 6.4), FUR);
  ermine(g, [[40, 80], [50, 85], [64, 88], [78, 85], [88, 80]]);
  // Ruby brooch.
  layer(g, [C(64, 95, 6)], GOLD, 2);
  flat(g, heart(64, 96, 3.6), COLORS.red);
  flat(g, [C(62.6, 94, 1)], 0xffffff, 0.9);
  // Head: scalloped fluffy circle, ears with pink insides.
  layer(g, [P(scalloped(64, 47, 32, 26, 11, 0.07)), P([[38, 36], [33, 11], [55, 24]]), P([[90, 36], [95, 11], [73, 24]])], FUR);
  flat(g, [P([[39, 30], [37, 18], [48, 24]]), P([[89, 30], [91, 18], [80, 24]])], PINK);
  flat(g, [E(90, 56, 8, 18)], FUR_SHADE, 0.7);
  flat(g, [E(40, 62, 14, 5)], FUR_SHADE, 0.5);
  face(g);
}

/** Her face: half-lidded violet eyes with lashes, a stern little brow, pink nose, smirk, blush, whiskers and a beauty mark. */
function face(g: G): void {
  flat(g, [E(40, 58, 10, 6), E(88, 58, 10, 6)], 0xf59aa6, 0.75);
  for (const side of [-1, 1] as const) {
    const m = (x: number): number => 64 + side * (x - 64);
    const ex = m(51);
    layer(g, [E(ex, 47, 14, 12)], 0xffffff, 1.6);
    flat(g, [E(m(50.6), 48, 9, 10.5)], 0x7a52c8);
    flat(g, [E(m(50.6), 48.4, 3.6, 8)], BLACK);
    flat(g, [C(m(48.6), 45.4, 1.5)], 0xffffff);
    flat(g, [P([[m(42), 38], [m(60), 38], [m(60), 44.2], [m(51), 43], [m(42), 46.4]])], FUR);
    ink(g, [[m(42), 46.4], [m(51), 43], [m(60), 44.2]], 1.6);
    ink(g, [[m(43), 46], [m(38.5), 42.5]], 1.4);
    ink(g, [[m(43), 48.2], [m(38), 48.4]], 1.4);
    ink(g, [[m(42), 36], [m(51), 34], [m(59), 38.5]], 1.9);
    ink(g, [[m(40), 58], [m(28), 55]], 0.8, 0x8a7f72);
    ink(g, [[m(39), 61], [m(26), 62]], 0.8, 0x8a7f72);
    ink(g, [[m(40), 64], [m(28), 68]], 0.8, 0x8a7f72);
  }
  layer(g, [P([[60.5, 55], [67.5, 55], [64, 59.5]])], 0xd9667f, 1.2);
  ink(g, [[64, 59.5], [64, 62.6]], 1);
  ink(g, [[57.5, 63.4], [61, 64.8], [64, 62.6], [67, 64.8], [70.5, 62.6]], 1.4);
  flat(g, [C(80, 59, 1.1)], BLACK);
}

/** The crown on its own layer so it can bob and tilt with her head: gold points with pearls, a ruby and two sapphires. */
export function drawQueenCrown(g: G): void {
  layer(g, [P([[46, 29], [43, 12], [55, 20], [64, 6], [73, 20], [85, 12], [82, 29]])], GOLD);
  flat(g, [P([[47, 23], [81, 23], [82, 29], [46, 29]])], GOLD_DARK);
  flat(g, [P([[51, 17], [55, 20], [53, 23], [50, 22]]), P([[77, 17], [73, 20], [75, 23], [78, 22]])], 0xfff0a0, 0.8);
  layer(g, [C(64, 21, 3.6)], COLORS.red, 1.6);
  layer(g, [C(52, 26, 2.5), C(76, 26, 2.5)], 0x4f86f7, 1.4);
  layer(g, [C(43.5, 11.5, 2.6), C(64, 5.5, 3), C(84.5, 11.5, 2.6)], 0xffffff, 1.6);
  flat(g, [C(63, 20, 1)], 0xffffff, 0.9);
}

/** The scepter arm on its own layer: sleeve and ermine cuff from the shoulder, a paw gripping a gold staff topped with a heart jewel. It turns around `QUEEN_SHOULDER`. */
export function drawQueenScepter(g: G): void {
  const sx = 112;
  layer(g, [P(rod(sx, 90, sx, 14, 2.8)), C(sx, 90, 4.4)], GOLD, 2);
  flat(g, [P(rod(sx - 1, 84, sx - 1, 24, 0.9))], 0xfff0a0, 0.8);
  const arm: Pt[] = [[100, 77], [106, 68], [110, 60]];
  layer(g, [T(arm, 13)], PURPLE);
  flat(g, [Tpart(arm, 8, 0.1, 0.8)], PURPLE_LIGHT, 0.6);
  layer(g, fluff([[103, 62], [110, 66], [116, 62]], 4.4), FUR);
  paw(g, sx, 53, 8.8);
  layer(g, [C(sx, 12, 8.4)], GOLD, 2);
  flat(g, [E(sx, 12, 17, 4)], GOLD_DARK);
  layer(g, heart(sx, 11.6, 4.6), COLORS.red, 1.2);
  flat(g, [C(sx - 2.2, 9.6, 1.1)], 0xffffff, 0.9);
}

/** A white foot with toe lines and pink beans. `side` -1 = left, +1 = right. */
function drawFoot(g: G, side: -1 | 1): void {
  const x = 64 + side * 21;
  layer(g, [E(x, 118, 22, 15)], FUR);
  for (const dx of [-5, 0, 5]) ink(g, [[x + dx, 120], [x + dx, 124.5]], 1.1, FUR_SHADE);
  flat(g, [E(x, 121.2, 9, 5)], PINK);
  flat(g, [C(x - 4.6, 118, 1.6), C(x, 116.6, 1.7), C(x + 4.6, 118, 1.6)], PINK);
}

export const drawQueenFootL = (g: G): void => drawFoot(g, -1);
export const drawQueenFootR = (g: G): void => drawFoot(g, 1);
