/** @file Code-drawn side and back/front views of the three bosses (emo: back + side, queen: back + side, Federer: front + side), 128x128, side views face RIGHT, plus the baked one-piece drawings the game swaps in. */
import { COLORS } from '../../config/style';
import { poly } from '../paint';
import { drawFedererArm, drawFedererRacket } from './federer';
import { C, E, P, R, S, T, Tpart, dense, flat, fluff, heart, ink, layer, rod, scalloped, smooth, sparkle, type G, type Pt } from './shapes';

// ---- palette ----
const GREY = 0x8d8f99, GREY_D = 0x6f7080, GREY_DD = 0x3b3d4f, BLACK = 0x15151c, PINK = 0xe0409a, HOT = 0xf777b9, SILVER = 0xdfe3ee, WHITE = 0xffffff;
const FUR = 0xfffaf0, FUR_SHADE = 0xefe3cf, BLUSH = 0xf5c6c6, RED = 0xb3303f, RED_DARK = 0x8a2232, PURPLE = 0x7a4aa0, PURPLE_LIGHT = 0x9a6cc0, GOLD = COLORS.gold, GOLD_DARK = 0xd9a400;
const CREAM = 0xf0d9a8, TAN = 0xd9a864;

const bandsAt = (g: G, pts: readonly Pt[], t0: number, t1: number, n: number, w: number, color: number, span = 11): void => {
  const path = smooth(pts);
  for (let i = 0; i < n; i++) {
    const idx = Math.round((t0 + ((t1 - t0) * (i + 0.5)) / n) * (path.length - 1));
    const a = path[Math.max(0, idx - 1)], b = path[Math.min(path.length - 1, idx + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / len) * (span / 2), ny = ((b[0] - a[0]) / len) * (span / 2);
    const [x, y] = path[idx];
    ink(g, [[x + nx, y + ny], [x - nx, y - ny]], w, color);
  }
};
const toes = (g: G, cx: number, y: number, step: number, col: number): void => { for (const dx of [-step, 0, step]) ink(g, [[cx + dx, y], [cx + dx, y + 4]], 1.1, col); };

// =================== EMO CAT: SIDE (faces right) ===================
export const emoSide = {
  tail(g: G): void {
    const tail: Pt[] = [[44, 100], [26, 106], [14, 96], [12, 80], [18, 70]];
    layer(g, [T(tail, 11, 8)], GREY);
    bandsAt(g, tail, 0.45, 0.95, 3, 2.4, PINK, 12);
    flat(g, [Tpart(tail, 8, 0.93, 1)], BLACK);
  },
  footFar(g: G): void { layer(g, [E(56, 113, 18, 12)], GREY_D); toes(g, 59, 114, 4, GREY_DD); },
  footNear(g: G): void { layer(g, [E(80, 113, 22, 14)], GREY); flat(g, [E(80, 117, 17, 5)], 0x757785); toes(g, 84, 114, 4.5, GREY_D); },
  armFar(g: G): void {
    const arm: Pt[] = [[64, 90], [78, 88], [90, 82]];
    layer(g, [T(arm, 13)], GREY_D);
    flat(g, [Tpart(arm, 13, 0.4, 0.9)], BLACK);
    bandsAt(g, arm, 0.4, 0.9, 3, 2.4, PINK);
    layer(g, [C(96, 78, 8.5), C(101, 73, 3.6), C(95, 70, 3.8)], 0x80828f);
  },
  body(g: G): void {
    layer(g, [S([[30, 88], [40, 72], [62, 66], [82, 72], [92, 90], [88, 106], [70, 113], [46, 111], [32, 102]]), P([[33, 92], [26, 98], [34, 101]])], GREY);
    flat(g, [S([[34, 100], [46, 111], [70, 113], [88, 106], [90, 98], [76, 106], [52, 105]])], 0x757785);
    flat(g, [E(50, 78, 18, 7)], 0x9a9ca7);
    // fluffy white chest on the front
    flat(g, [P([[78, 78], [90, 84], [87, 88], [92, 94], [86, 98], [89, 104], [82, 108], [76, 106], [72, 98], [74, 88]])], WHITE);
    ink(g, [[82, 90], [86, 94]], 1.2, BLACK); ink(g, [[80, 98], [84, 101]], 1.2, BLACK);
    // chest tattoo bits (CAMPUS peeking on the side) in pink and black
    ink(g, [[56, 96], [62, 94], [68, 96], [74, 94]], 1.6, PINK); ink(g, [[56, 100], [74, 100]], 1.2, BLACK);
  },
  choker(g: G): void {
    layer(g, [T([[70, 64], [78, 74], [86, 76]], 7)], BLACK, 2);
    for (const [x, y, a] of [[69, 66, -1.2], [74, 70.5, -0.9], [80, 75, -0.6]] as const)
      layer(g, [P([[x - 1.8, y - 1], [x + 1.8, y - 1], [x + Math.cos(a) * 1 - 3.5, y - 6]])], SILVER, 1);
    layer(g, heart(88, 83, 4.4), BLACK, 1.8);
    flat(g, [C(86, 80.4, 0.8)], WHITE);
    ink(g, [[84, 77], [86, 81]], 1.4, SILVER);
  },
  armNear(g: G): void {
    const arm: Pt[] = [[60, 92], [74, 92], [88, 88]];
    layer(g, [T(arm, 14)], GREY);
    flat(g, [Tpart(arm, 14, 0.38, 0.9)], BLACK);
    bandsAt(g, arm, 0.38, 0.9, 3, 2.6, PINK, 12);
    bandsAt(g, arm, 0.38, 0.9, 3, 0.8, HOT, 8);
    layer(g, [E(96, 82, 20, 18), C(101, 75, 4.4), C(95, 72, 4.6)], 0x9fa1ac);
    flat(g, [E(97, 85, 9, 6.5)], 0x6f7080);
    flat(g, [C(94, 81, 1.8), C(98, 80, 1.8)], 0x6f7080);
    layer(g, [P([[99, 72], [100.5, 68], [102, 72]]), P([[93.5, 69.5], [95, 65.5], [96.5, 69.5]])], WHITE, 0.8);
  },
  head(g: G): void {
    // far ear, head, near ear, cheek tuft, muzzle in profile
    layer(g, [P([[74, 24], [86, 8], [90, 30]])], GREY_D);
    layer(g, [E(68, 44, 56, 54), P([[48, 30], [50, 6], [68, 22]]), P([[50, 52], [40, 58], [52, 62]]), P([[56, 62], [48, 70], [62, 68]])], GREY);
    flat(g, [P([[52, 26], [53, 13], [62, 22]])], 0xb9b9c4); flat(g, [E(62, 66, 18, 8)], 0x7f818f);
    layer(g, [E(92, 52, 26, 20), E(100, 56, 12, 9)], WHITE, 2.4);
    flat(g, [E(94, 62, 20, 4)], 0xe0e1e8);
    layer(g, [P([[102, 46], [110, 47], [105, 53]])], 0xd9667f, 1.6);
    ink(g, [[105, 53], [105, 57], [100, 60]], 1.2); ink(g, [[105, 57], [110, 59]], 1.2);
    for (const [dy, dx] of [[-1, 12], [3, 14], [7, 12]] as const) ink(g, [[104, 54 + dy], [104 + dx, 52 + dy * 1.6]], 0.7, 0xeceef4);
    // eye: bag, green iris, slit pupil, heavy lid, winged liner
    flat(g, [E(86, 49, 13, 5)], 0x787988);
    layer(g, [E(86, 42, 13, 11)], 0x7cc152, 1.6);
    flat(g, [E(86.5, 43, 8, 8)], 0x4f9a3a); flat(g, [E(87.5, 42.5, 2.6, 7)], BLACK); flat(g, [C(84.5, 40.5, 1.2)], WHITE);
    flat(g, [P([[79, 35], [93, 36], [93, 41.5], [79, 43.5]])], GREY);
    ink(g, [[79, 43.5], [93, 41.2]], 1.7); ink(g, [[92, 41], [98, 38]], 1.8); ink(g, [[79, 36], [93, 34]], 1.3, GREY_DD);
    // pentagram earring
    ink(g, [[58, 36], [56, 40]], 1, SILVER);
    layer(g, [C(55, 46, 4.4)], SILVER, 1.2); flat(g, [C(55, 46, 2.4)], GREY);
    ink(g, [[55, 43], [57.5, 48.5], [52.5, 44.5], [57.5, 44.5], [52.5, 48.5], [55, 43]], 0.7, SILVER);
  },
  fringe(g: G): void {
    layer(g, [P([[44, 46], [43, 28], [50, 15], [62, 8], [74, 8], [86, 15], [96, 24], [98, 32], [90, 31], [88, 38], [80, 33], [78, 40], [72, 38], [70, 52], [66, 44], [62, 62], [56, 52], [54, 70], [48, 58], [44, 62]]),
      P([[44, 52], [50, 56], [48, 78], [42, 64]])], BLACK);
    for (const l of [[[60, 12], [54, 30], [52, 50]], [[70, 11], [64, 28], [60, 46]], [[80, 16], [74, 30], [70, 40]]] as const) ink(g, l, 1, 0x3a3a4c);
    flat(g, [P([[78, 10], [92, 22], [94, 31], [86, 32], [80, 24], [74, 20]])], PINK);
    flat(g, [P([[78, 14], [88, 22], [86, 27], [80, 22]])], HOT);
    flat(g, [P([[62, 14], [68, 14], [62, 44], [60, 58], [58, 42]])], PINK);
    flat(g, [P([[63, 18], [65, 18], [62, 40], [61, 48]])], HOT);
  },
};

// =================== EMO CAT: BACK ===================
export const emoBack = {
  feet(g: G): void {
    layer(g, [E(40, 112, 20, 13), E(88, 112, 20, 13)], GREY);
    flat(g, [E(40, 115.5, 16, 5), E(88, 115.5, 16, 5)], 0x757785);
  },
  arm(g: G, side: -1 | 1): void {
    const m = (x: number): number => (side < 0 ? x : 128 - x);
    const arm: Pt[] = [[m(33), 86], [m(22), 71], [m(15), 55]];
    layer(g, [T(arm, 14), P([[m(25), 80], [m(20.5), 82], [m(24), 76]])], GREY);
    flat(g, [Tpart(arm, 14, 0.42, 0.93)], BLACK);
    bandsAt(g, arm, 0.42, 0.93, 3, 2.6, PINK); bandsAt(g, arm, 0.42, 0.93, 3, 0.8, HOT, 8);
    layer(g, [E(m(15), 46, 19, 16), C(m(9), 40, 4.2), C(m(15), 38, 4.4), C(m(21), 40, 4.2)], 0x9fa1ac);
    ink(g, [[m(11.9), 38], [m(11.9), 43]], 0.9, GREY_D); ink(g, [[m(18.1), 38], [m(18.1), 43]], 0.9, GREY_D);
    flat(g, [E(m(11), 46, 4, 2.4)], 0xb4b6c1);
  },
  body(g: G): void {
    layer(g, [S([[28, 78], [40, 67], [64, 64], [88, 67], [100, 78], [102, 94], [92, 109], [64, 114], [36, 109], [26, 94]]), P([[27, 92], [23, 95.5], [28, 99]]), P([[101, 92], [105, 95.5], [100, 99]])], GREY);
    flat(g, [S([[27, 96], [35, 108], [64, 113], [93, 108], [101, 96], [92, 101], [84, 108], [64, 110], [44, 108], [36, 101]])], 0x757785);
    flat(g, [E(33, 80, 10, 5), E(95, 80, 10, 5)], 0x9a9ca7);
    // spine stripe and a cracked heart patch on the back
    flat(g, [P([[61, 70], [67, 70], [66, 108], [62, 108]])], 0x7a7c89, 0.7);
    layer(g, heart(64, 92, 9), BLACK, 1.6);
    flat(g, heart(64, 92, 7), PINK);
    ink(g, [[64, 84], [61, 90], [66, 93], [62, 99]], 1.2, BLACK);
    sparkle(g, 44, 98, 2.4, BLACK); sparkle(g, 84, 98, 2.4, BLACK);
  },
  tail(g: G): void {
    const tail: Pt[] = [[64, 104], [56, 114], [62, 124], [80, 122], [92, 112]];
    layer(g, [T(tail, 11, 8)], GREY);
    bandsAt(g, tail, 0.4, 0.92, 3, 2.4, PINK, 12);
    flat(g, [Tpart(tail, 8, 0.92, 1)], BLACK);
  },
  head(g: G): void {
    layer(g, [E(64, 42, 66, 58), P([[32, 36], [30, 14], [48, 22]]), P([[96, 36], [98, 14], [80, 22]]), P([[34, 50], [25, 55], [34, 60]]), P([[94, 50], [103, 55], [94, 60]])], GREY);
    flat(g, [P([[34, 30], [33, 19], [43, 24]]), P([[94, 30], [95, 19], [85, 24]])], GREY_D);
    flat(g, [E(92, 58, 8, 14)], 0x7f818f);
    layer(g, [C(96.5, 19, 1.3), C(98, 26, 1.3)], SILVER, 0.8);
  },
  hair(g: G): void {
    layer(g, [P([[30, 44], [30, 28], [36, 18], [46, 12], [56, 5], [64, 11], [72, 4], [82, 12], [92, 16], [98, 28], [98, 46], [96, 62], [90, 70], [86, 80], [80, 70], [76, 82], [70, 70], [64, 78], [58, 70], [52, 82], [48, 70], [42, 80], [38, 68], [32, 62]])], BLACK);
    for (const l of [[[46, 14], [42, 40], [40, 64]], [[56, 10], [54, 40], [52, 66]], [[72, 10], [74, 40], [76, 66]], [[84, 14], [88, 40], [88, 62]]] as const) ink(g, l, 1, 0x3a3a4c);
    flat(g, [P([[60, 9], [70, 9], [74, 34], [72, 58], [68, 74], [64, 60], [60, 36]])], PINK);
    flat(g, [P([[63, 14], [67, 14], [69, 36], [67, 58], [65, 40]])], HOT);
    flat(g, [P([[34, 40], [40, 36], [42, 60], [44, 74], [38, 66], [34, 54]])], PINK);
    flat(g, [P([[88, 36], [94, 40], [92, 58], [90, 72], [87, 56]])], PINK);
    flat(g, [P([[50, 18], [60, 14], [54, 24]])], 0x2a2a38);
  },
  choker(g: G): void {
    const neck: Pt[] = [[40, 74], [64, 80], [90, 75]];
    layer(g, [T(neck, 6)], BLACK, 2);
    for (const f of [0.14, 0.3, 0.5, 0.7, 0.86]) {
      const p = smooth(neck)[Math.round(f * (smooth(neck).length - 1))];
      layer(g, [P([[p[0] - 1.8, p[1] + 1], [p[0] + 1.8, p[1] + 1], [p[0], p[1] + 6]])], SILVER, 1);
    }
    layer(g, [C(64, 81, 2.4)], SILVER, 1); flat(g, [C(64, 81, 1.1)], BLACK);
  },
};

// =================== QUEEN: SIDE (faces right) ===================
function paw(g: G, x: number, y: number, r: number): void {
  layer(g, [C(x, y, r), C(x - r * 0.4, y - r * 0.85, r * 0.38), C(x + r * 0.4, y - r * 0.85, r * 0.38)], FUR);
  ink(g, [[x, y - r * 1.1], [x, y - r * 0.55]], 0.8, FUR_SHADE);
}
export const queenSide = {
  cape(g: G): void {
    layer(g, [S([[46, 62], [34, 66], [14, 86], [8, 108], [24, 120], [52, 121], [64, 112], [66, 74]])], RED);
    flat(g, [S([[34, 74], [22, 92], [18, 110], [30, 114], [40, 96]])], RED_DARK, 0.5);
    ink(g, [[42, 72], [30, 92], [24, 112]], 1.2, RED_DARK);
    layer(g, fluff([[12, 108], [24, 119], [40, 121], [56, 118], [64, 112]], 6), FUR);
    for (const [x, y] of [[20, 114], [32, 119], [46, 120], [58, 116]] as const) flat(g, [P([[x, y - 2.4], [x + 1.5, y + 0.6], [x, y + 2.8], [x - 1.5, y + 0.6]])], BLACK);
  },
  footFar(g: G): void { layer(g, [E(56, 118, 20, 14)], FUR_SHADE); toes(g, 60, 119, 4.5, FUR_SHADE); },
  footNear(g: G): void { layer(g, [E(78, 118, 24, 15)], FUR); toes(g, 82, 120, 5, FUR_SHADE); flat(g, [E(82, 122, 10, 4.5)], BLUSH); },
  armFar(g: G): void {
    const arm: Pt[] = [[62, 86], [76, 92], [88, 92]];
    layer(g, [T(arm, 12)], 0x6a3e8f);
    layer(g, fluff([[84, 86], [86, 92], [84, 98]], 4), FUR);
    paw(g, 94, 92, 7.5);
    layer(g, [C(103, 90, 8)], GOLD); flat(g, [P([[95, 90], [103, 87], [111, 90], [103, 93]])], GOLD_DARK);
    layer(g, [R(101.4, 76, 3.2, 7, 1), R(99.3, 78, 7.4, 3, 1)], GOLD, 2);
    flat(g, [C(103, 90, 2.3)], COLORS.red);
  },
  body(g: G): void {
    layer(g, [S([[42, 76], [62, 70], [82, 76], [90, 96], [86, 114], [62, 119], [40, 113], [38, 94]])], PURPLE);
    flat(g, [S([[66, 80], [82, 80], [86, 98], [82, 114], [68, 114]])], PURPLE_LIGHT, 0.55);
    ink(g, [[44, 110], [56, 115], [70, 116], [82, 112]], 1.6, GOLD);
    for (const [x, y] of [[60, 96], [74, 98], [68, 106], [68, 88]] as const) flat(g, [P([[x, y - 3], [x + 2.2, y], [x, y + 3], [x - 2.2, y]])], GOLD);
    layer(g, fluff([[48, 76], [62, 84], [78, 84], [86, 78]], 6.2), FUR);
    for (const [x, y] of [[54, 80], [64, 85], [76, 85]] as const) flat(g, [P([[x, y - 2.4], [x + 1.5, y + 0.6], [x, y + 2.8], [x - 1.5, y + 0.6]])], BLACK);
    layer(g, [C(84, 94, 5)], GOLD, 2); flat(g, heart(84, 94.6, 3), COLORS.red);
  },
  head(g: G): void {
    layer(g, [P([[76, 24], [86, 9], [92, 32]])], FUR_SHADE);
    flat(g, [P([[80, 24], [86, 15], [88, 28]])], BLUSH, 0.8);
    layer(g, [P(scalloped(68, 48, 30, 26, 10, 0.07)), E(92, 56, 20, 16), P([[50, 34], [48, 8], [68, 24]])], FUR);
    flat(g, [P([[53, 29], [52, 16], [62, 24]])], BLUSH);
    flat(g, [E(54, 62, 14, 5)], FUR_SHADE, 0.6);
    flat(g, [E(82, 63, 9, 5)], 0xf59aa6, 0.75);
    layer(g, [P([[98, 50], [106, 51], [101, 57]])], 0xd9667f, 1.4);
    ink(g, [[101, 57], [101, 61], [96, 64]], 1.2); ink(g, [[101, 61], [106, 63]], 1.2);
    for (const dy of [-2, 3, 8]) ink(g, [[100, 59 + dy * 0.5], [114, 56 + dy * 1.4]], 0.8, 0x8a7f72);
    // eye
    layer(g, [E(84, 49, 14, 13)], WHITE, 1.6);
    flat(g, [E(85, 50, 9, 11)], 0x7a52c8); flat(g, [E(86, 50.4, 3.6, 8.4)], BLACK); flat(g, [C(83.4, 47, 1.5)], WHITE);
    flat(g, [P([[76, 40], [92, 41], [92, 46.2], [76, 49.4]])], FUR);
    ink(g, [[76, 49.4], [84, 45.5], [92, 46.2]], 1.6); ink(g, [[77, 49], [72, 45]], 1.4); ink(g, [[77, 51], [72, 51.5]], 1.4);
    ink(g, [[76, 38], [85, 36], [93, 40.5]], 1.9);
    flat(g, [C(96, 60, 1.1)], BLACK);
  },
  crown(g: G): void {
    layer(g, [P([[54, 29], [52, 12], [62, 20], [70, 6], [78, 20], [88, 12], [88, 29]])], GOLD);
    flat(g, [P([[54, 24], [88, 24], [88, 29], [54, 29]])], GOLD_DARK);
    layer(g, [C(71, 22, 3.4)], COLORS.red, 1.6);
    layer(g, [C(51, 11, 2.5), C(70, 5.5, 3), C(89, 11, 2.5)], WHITE, 1.6);
    layer(g, [C(80, 26, 2.3)], 0x4f86f7, 1.3);
  },
  scepter(g: G): void {
    const sx = 100;
    layer(g, [P(rod(sx, 92, sx, 14, 2.8)), C(sx, 92, 4.4)], GOLD, 2);
    flat(g, [P(rod(sx - 1, 86, sx - 1, 24, 0.9))], 0xfff0a0, 0.8);
    const arm: Pt[] = [[70, 82], [82, 76], [93, 66]];
    layer(g, [T(arm, 13)], PURPLE);
    flat(g, [Tpart(arm, 8, 0.1, 0.8)], PURPLE_LIGHT, 0.6);
    layer(g, fluff([[88, 66], [93, 70], [98, 66]], 4.2), FUR);
    paw(g, sx, 58, 8.4);
    layer(g, [C(sx, 12, 8.4)], GOLD, 2); flat(g, [E(sx, 12, 17, 4)], GOLD_DARK);
    layer(g, heart(sx, 11.6, 4.6), COLORS.red, 1.2); flat(g, [C(sx - 2.2, 9.6, 1.1)], WHITE, 0.9);
  },
};

// =================== QUEEN: BACK ===================
export const queenBack = {
  feet(g: G): void {
    for (const x of [43, 85]) { layer(g, [E(x, 119, 22, 14)], FUR); toes(g, x, 121, 5, FUR_SHADE); }
  },
  armL(g: G): void {
    const arm: Pt[] = [[38, 86], [27, 74], [21, 62]];
    layer(g, [T(arm, 13)], PURPLE);
    flat(g, [Tpart(arm, 8, 0.1, 0.8)], PURPLE_LIGHT, 0.6);
    layer(g, fluff([[14, 62], [21, 65], [28, 62]], 4.6), FUR);
    paw(g, 21, 54, 8.2);
    layer(g, [C(21, 38, 9.5)], GOLD); flat(g, [P([[12, 38], [21, 35], [30, 38], [21, 41]])], GOLD_DARK);
    layer(g, [R(19.2, 22, 3.6, 8, 1), R(17, 24.2, 8, 3.4, 1)], GOLD, 2);
  },
  body(g: G): void {
    layer(g, [T([[92, 86], [101, 77]], 13)], PURPLE);
    layer(g, [S([[28, 64], [64, 58], [100, 64], [112, 86], [114, 106], [100, 118], [64, 123], [28, 118], [14, 106], [16, 86]])], RED);
    flat(g, [S([[26, 76], [40, 68], [34, 98], [30, 116], [18, 108], [18, 92]])], RED_DARK, 0.5);
    flat(g, [S([[102, 76], [88, 68], [94, 98], [98, 116], [110, 108], [110, 92]])], RED_DARK, 0.5);
    ink(g, [[64, 70], [64, 100], [64, 116]], 1.2, RED_DARK);
    ink(g, [[44, 72], [40, 96], [38, 114]], 1.2, RED_DARK); ink(g, [[84, 72], [88, 96], [90, 114]], 1.2, RED_DARK);
    layer(g, fluff([[14, 106], [26, 118], [64, 123], [102, 118], [114, 106]], 6.4), FUR);
    for (const [x, y] of [[22, 112], [34, 119], [48, 121], [64, 122], [80, 121], [94, 119], [106, 112]] as const) flat(g, [P([[x, y - 2.4], [x + 1.5, y + 0.6], [x, y + 2.8], [x - 1.5, y + 0.6]])], BLACK);
    layer(g, fluff([[34, 70], [46, 76], [64, 80], [82, 76], [94, 70]], 6.2), FUR);
    layer(g, [C(64, 84, 4.4)], GOLD, 2); flat(g, [C(64, 84, 1.8)], COLORS.red);
    ink(g, [[20, 94], [16, 104]], 1.4, GOLD); ink(g, [[108, 94], [112, 104]], 1.4, GOLD);
  },
  head(g: G): void {
    layer(g, [P(scalloped(64, 46, 32, 27, 11, 0.07)), P([[38, 36], [33, 11], [55, 24]]), P([[90, 36], [95, 11], [73, 24]])], FUR);
    flat(g, [P([[39, 30], [36, 17], [46, 24]]), P([[89, 30], [92, 17], [82, 24]])], FUR_SHADE);
    flat(g, [E(64, 60, 40, 14)], FUR_SHADE, 0.55);
    flat(g, [E(64, 44, 18, 10)], FUR_SHADE, 0.35);
    // royal bun / tuft at the back
    layer(g, [C(64, 69, 5.5)], FUR, 2); flat(g, [C(62.5, 67.5, 1.5)], WHITE, 0.9);
  },
};

// =================== FEDERER: FRONT ===================
export const fedFront = {
  tail(g: G): void { const t: Pt[] = [[70, 104], [86, 110], [98, 104], [104, 92]]; layer(g, [T(t, 9)], CREAM); flat(g, [Tpart(t, 9, 0.45, 0.58), Tpart(t, 9, 0.75, 0.88)], TAN); },
  feet(g: G): void { layer(g, [E(44, 106, 15, 16), E(84, 106, 15, 16)], CREAM); toes(g, 44, 108, 3.5, TAN); toes(g, 84, 108, 3.5, TAN); },
  body(g: G): void {
    layer(g, [E(64, 88, 64, 54)], CREAM);
    layer(g, [S([[34, 61], [64, 57], [94, 61], [98, 80], [90, 92], [64, 95], [38, 92], [30, 80]]), T([[92, 70], [102, 64], [104, 55]], 12)], WHITE);
    layer(g, [C(104, 51, 6.5)], CREAM, 2.5);
    // collar V and a green stripe
    layer(g, [P([[50, 60], [64, 76], [78, 60], [72, 58], [64, 66], [56, 58]])], WHITE, 2);
    flat(g, [T([[41, 87], [50, 87]], 3)], 0x3fa35a);
    ink(g, [[64, 76], [64, 92]], 1, 0xd8d8e0); flat(g, [C(64, 82, 1.2), C(64, 88, 1.2)], 0xb0b0c0);
  },
  head(g: G): void {
    layer(g, [E(64, 44, 46, 40), P([[44, 36], [40, 17], [60, 28]]), P([[84, 36], [88, 17], [68, 28]])], CREAM);
    flat(g, [E(50, 40, 14, 12), P([[46, 28], [42, 19], [54, 25]])], TAN);
    flat(g, [P([[45, 30], [44, 22], [52, 27]]), P([[83, 30], [84, 22], [76, 27]])], BLUSH);
    flat(g, [E(64, 56, 22, 14)], 0xfff6e0);
    // headband
    layer(g, [T([[42, 34], [64, 31], [86, 34]], 6)], WHITE, 2.5);
    // focused eyes
    for (const s of [-1, 1] as const) {
      const x = 64 + s * 11;
      layer(g, [E(x, 43, 9, 10)], WHITE, 1.4); flat(g, [E(x + s * 0.4, 43.5, 6, 8)], 0x3a8a4a); flat(g, [E(x + s * 0.4, 43.8, 2.2, 6)], BLACK); flat(g, [C(x - 1.4, 41, 1.1)], WHITE);
      ink(g, [[x - 5.5, 38.6], [x + 5.5, 38.6 + s * 0.6]], 1.4); ink(g, [[x - 6.5, 36], [x + 6, 38]], 1.6);
    }
    layer(g, [P([[61, 51], [67, 51], [64, 55]])], 0xd9667f, 1.2);
    ink(g, [[64, 55], [64, 58]], 0.9); ink(g, [[60, 60], [64, 58], [68, 60]], 1.2);
    for (const s of [-1, 1] as const) { ink(g, [[64 + s * 8, 56], [64 + s * 24, 53]], 0.7, 0xb09a7a); ink(g, [[64 + s * 8, 59], [64 + s * 24, 60]], 0.7, 0xb09a7a); }
  },
};

// =================== FEDERER: SIDE (faces right) ===================
export const fedSide = {
  tail(g: G): void { const t: Pt[] = [[44, 100], [28, 108], [16, 98], [14, 82]]; layer(g, [T(t, 9, 7)], CREAM); flat(g, [Tpart(t, 8, 0.45, 0.58), Tpart(t, 8, 0.75, 0.88)], TAN); },
  footFar(g: G): void { layer(g, [E(54, 114, 16, 13)], TAN); },
  footNear(g: G): void { layer(g, [E(76, 114, 20, 14)], CREAM); toes(g, 80, 115, 4, TAN); },
  armFar(g: G): void {
    layer(g, [T([[60, 74], [74, 78], [86, 68]], 11)], 0xe8e8ee);
    layer(g, [C(90, 63, 6)], TAN, 2.2);
  },
  body(g: G): void {
    layer(g, [E(60, 88, 46, 54)], CREAM);
    layer(g, [S([[40, 66], [60, 60], [80, 66], [82, 84], [76, 96], [58, 98], [42, 94], [38, 80]])], WHITE);
    flat(g, [T([[76, 82], [82, 82]], 3)], 0x3fa35a);
    layer(g, [T([[62, 62], [74, 68], [80, 66]], 6)], WHITE, 2);
  },
  head(g: G): void {
    layer(g, [P([[66, 28], [76, 14], [82, 34]])], TAN);
    layer(g, [E(64, 46, 46, 42), E(88, 52, 20, 15), P([[48, 36], [46, 16], [64, 28]])], CREAM);
    flat(g, [E(62, 48, 16, 14), P([[50, 31], [48, 21], [58, 27]])], TAN);
    flat(g, [P([[50, 30], [49, 23], [56, 27]])], BLUSH);
    flat(g, [E(90, 58, 14, 7)], 0xfff6e0);
    layer(g, [P([[95, 47], [101, 47], [98, 52]])], 0xd9667f, 1.2);
    ink(g, [[98, 52], [98, 56], [93, 58]], 1); ink(g, [[98, 56], [102, 58]], 1);
    for (const dy of [-1, 4]) ink(g, [[96, 55 + dy], [110, 52 + dy * 1.5]], 0.7, 0xb09a7a);
    layer(g, [E(80, 42, 11, 11)], WHITE, 1.4); flat(g, [E(81, 42.5, 7, 9)], 0x3a8a4a); flat(g, [E(82, 42.8, 2.4, 6.5)], BLACK); flat(g, [C(79, 40, 1.1)], WHITE);
    ink(g, [[74, 37.6], [85, 38.6]], 1.4); ink(g, [[73, 35], [86, 37.5]], 1.6);
    layer(g, [T([[44, 36], [66, 33], [86, 36]], 6)], WHITE, 2.5);
  },
  armNear(g: G): void {
    layer(g, [T([[62, 72], [78, 70], [90, 58]], 12)], WHITE);
    layer(g, [C(94, 53, 7)], CREAM, 2.5);
    flat(g, [C(62, 72, 5.5)], WHITE);
  },
  racket(g: G): void {
    layer(g, [T([[96, 53], [101, 36]], 5)], 0x6b4423, 2.5);
    layer(g, [P(ellipseP(103, 20, 9, 17, 0.1))], 0xb08d57, 2.5);
    layer(g, [P(ellipseP(103, 20, 5.8, 13.4, 0.1))], 0xf6f2e4, 1.2);
    for (const u of [-3, 0, 3]) ink(g, [[103 + u, 8], [103 + u, 32]], 0.8, 0x9a8f7a);
    for (const v of [-7, 0, 7]) ink(g, [[98, 20 + v], [108, 20 + v]], 0.8, 0x9a8f7a);
  },
};
function ellipseP(cx: number, cy: number, rx: number, ry: number, rot: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2, lx = Math.cos(t) * rx, ly = Math.sin(t) * ry; out.push([cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)]); }
  return out;
}
void dense; void rod; void sparkle; void heart;

// =================== BAKED ONE-PIECE VIEWS (what the game swaps in) ===================

/** Wraps a Graphics so everything drawn through it comes out mirrored left to right (about x = 64): lets Federer's right-handed back-view arm and racket be reused on the front view. */
function mirrored(g: G): G {
  const m: object = {
    fillStyle: (c: number, a?: number) => (g.fillStyle(c, a), m),
    lineStyle: (w: number, c: number, a?: number) => (g.lineStyle(w, c, a), m),
    fillEllipse: (x: number, y: number, w: number, h: number) => (g.fillEllipse(128 - x, y, w, h), m),
    fillCircle: (x: number, y: number, r: number) => (g.fillCircle(128 - x, y, r), m),
    fillRoundedRect: (x: number, y: number, w: number, h: number, r?: number) => (g.fillRoundedRect(128 - x - w, y, w, h, r), m),
    fillPoints: (pts: readonly { x: number; y: number }[], close?: boolean) => (g.fillPoints(poly(pts.map((q) => [128 - q.x, q.y] as const)), close), m),
    strokePoints: (pts: readonly { x: number; y: number }[], close?: boolean) => (g.strokePoints(poly(pts.map((q) => [128 - q.x, q.y] as const)), close), m),
  };
  return m as unknown as G;
}

/** Emo cat seen from the side (faces right), every layer in drawing order. */
export function drawEmoSide(g: G): void {
  emoSide.tail(g);
  emoSide.footFar(g);
  emoSide.armFar(g);
  emoSide.body(g);
  emoSide.footNear(g);
  emoSide.choker(g);
  emoSide.head(g);
  emoSide.fringe(g);
  emoSide.armNear(g);
}

/** Emo cat seen from behind: both arms up, the pink hair, the tail. */
export function drawEmoBack(g: G): void {
  emoBack.feet(g);
  emoBack.arm(g, -1);
  emoBack.arm(g, 1);
  emoBack.body(g);
  emoBack.choker(g);
  emoBack.tail(g);
  emoBack.head(g);
  emoBack.hair(g);
}

/** The Queen seen from the side (faces right), crown on, scepter in paw. */
export function drawQueenSide(g: G): void {
  queenSide.cape(g);
  queenSide.footFar(g);
  queenSide.armFar(g);
  queenSide.body(g);
  queenSide.footNear(g);
  queenSide.head(g);
  queenSide.crown(g);
  queenSide.scepter(g);
}

/** The Queen seen from behind: the red cape and the royal bun. No crown and no scepter arm: `QueenRig` still moves those two loose layers (they sit in the same place as from the front). */
export function drawQueenBack(g: G): void {
  queenBack.feet(g);
  queenBack.armL(g);
  queenBack.body(g);
  queenBack.head(g);
}

/** Pisica Federer seen from the front: the racket arm is the back-view arm mirrored (she is right-handed). */
export function drawFedererFront(g: G): void {
  fedFront.tail(g);
  fedFront.feet(g);
  fedFront.body(g);
  fedFront.head(g);
  const m = mirrored(g);
  drawFedererArm(m);
  drawFedererRacket(m);
}

/** Pisica Federer from the side (faces right), racket out front. */
export function drawFedererSide(g: G): void {
  fedSide.tail(g);
  fedSide.footFar(g);
  fedSide.armFar(g);
  fedSide.body(g);
  fedSide.footNear(g);
  fedSide.head(g);
  fedSide.armNear(g);
  fedSide.racket(g);
}
