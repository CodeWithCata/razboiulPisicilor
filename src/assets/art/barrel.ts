/** @file Code-drawn mustard barrel (96x96, side view, base near the bottom): whole with a cat face, broken with a splash, and the puddle left behind. */
import { C, E, NAVY, P, S, T, ellipsePts, flat, ink, layer, rod, type G, type Pt } from './shapes';

const MUSTARD = 0xe9b02e;
const MUSTARD_LIGHT = 0xf8d56b;
const MUSTARD_DARK = 0xc98a1a;
const STAVE_LINE = 0xb57a14;
const MUSTARD_GOO = 0xf2b632;
const GOO_SHINE = 0xfbe08a;
const RED = 0xd93a3a;
const CREAM = 0xfff3d6;
const FUR = 0xf29b3a;
const FUR_DARK = 0xc9701e;
const EAR_INNER = 0xf4a5a0;
const NOSE = 0xff8fa3;
const WHITE = 0xffffff;
const HOOP_SHINE = 0xf27a7a;

/** Outline of the whole barrel body: bulges in the middle, rounded at the bottom. */
const BODY: Pt[] = [[24, 30], [18, 46], [18, 62], [24, 78], [48, 85], [72, 78], [78, 62], [78, 46], [72, 30], [48, 26]];

/** A little orange cat face on a cream label (the cat the whole game is about). */
function catFace(g: G): void {
  layer(g, [E(48, 61, 38, 30)], CREAM, 2.5);
  layer(g, [E(48, 63, 26, 21), P([[36, 57], [37, 45], [46, 54]]), P([[60, 57], [59, 45], [50, 54]])], FUR, 2.5);
  flat(g, [P([[38, 54], [38.5, 48], [43, 53]]), P([[58, 54], [57.5, 48], [53, 53]])], EAR_INNER);
  for (const [x1, y1, x2, y2] of [[48, 54, 48, 58], [43.5, 55, 44.5, 58], [52.5, 55, 51.5, 58]] as const) ink(g, [[x1, y1], [x2, y2]], 2, FUR_DARK);
  flat(g, [C(42.5, 63, 2.6), C(53.5, 63, 2.6)], NAVY);
  flat(g, [C(43.3, 62.1, 0.9), C(54.3, 62.1, 0.9)], WHITE);
  flat(g, [P([[46.3, 66], [49.7, 66], [48, 68]])], NOSE);
  ink(g, [[48, 68], [48, 69.5]], 1.4);
  ink(g, [[48, 69.5], [45, 71]], 1.4);
  ink(g, [[48, 69.5], [51, 71]], 1.4);
  for (const dy of [0, 2.5]) {
    ink(g, [[38, 66 + dy], [31, 65 + dy * 1.4]], 1.2);
    ink(g, [[58, 66 + dy], [65, 65 + dy * 1.4]], 1.2);
  }
}

/** The whole barrel: mustard body, two red hoops, open top full of mustard, a drip, and the cat face. */
export function drawBarrel(g: G): void {
  layer(g, [S(BODY)], MUSTARD);
  flat(g, [T([[28, 36], [24, 48], [24, 62], [28, 74]], 5)], MUSTARD_LIGHT);
  flat(g, [T([[68, 36], [72, 48], [72, 62], [68, 74]], 6)], MUSTARD_DARK);
  for (const line of [[[37, 34], [34, 48], [34, 62], [37, 80]], [[48, 36], [48, 84]], [[59, 34], [62, 48], [62, 62], [59, 80]]] as const) {
    ink(g, line, 2, STAVE_LINE);
  }
  layer(g, [T([[23, 36], [48, 42], [73, 36]], 8)], RED);
  layer(g, [T([[23, 72], [48, 78], [73, 72]], 8)], RED);
  flat(g, [T([[27, 34], [38, 37]], 2.4)], HOOP_SHINE);
  catFace(g);
  layer(g, [P([[68, 33], [76, 33], [76, 46], [68, 46]]), C(72, 47, 4.5)], MUSTARD_GOO);
  layer(g, [E(48, 30, 58, 22)], RED);
  layer(g, [E(48, 31, 44, 15)], MUSTARD_GOO, 2);
  flat(g, [T([[36, 30], [44, 28], [54, 29]], 2.2)], GOO_SHINE);
}

/** The barrel burst: the bottom half with a jagged top, a mustard splash, two flying staves and the lid. */
export function drawBarrelBroken(g: G): void {
  const jaggedTop: Pt[] = [[20, 60], [26, 50], [32, 60], [40, 46], [47, 58], [55, 48], [62, 59], [70, 51], [76, 60]];
  const lowerBody: Pt[] = [[78, 68], [77, 77], [71, 84], [48, 88], [25, 84], [19, 77], [18, 68]];
  layer(g, [P([...jaggedTop, ...lowerBody])], MUSTARD);
  flat(g, [T([[24, 64], [22, 72], [26, 80]], 4)], MUSTARD_LIGHT);
  flat(g, [T([[72, 64], [74, 72], [70, 80]], 5)], MUSTARD_DARK);
  layer(g, [T([[22, 73], [48, 79], [74, 73]], 7)], RED);
  layer(g, [S([[26, 58], [22, 46], [32, 36], [40, 41], [44, 29], [56, 27], [60, 39], [70, 33], [74, 47], [70, 59]])], MUSTARD_GOO);
  flat(g, [T([[32, 42], [38, 36], [46, 40]], 2.4)], GOO_SHINE);
  layer(g, [P(rod(10, 40, 22, 17, 5))], MUSTARD);
  layer(g, [P(rod(14.8, 31.2, 17.2, 26.8, 5.5))], RED, 2);
  layer(g, [P(rod(86, 40, 74, 17, 5))], MUSTARD);
  layer(g, [P(rod(81.2, 31.2, 78.8, 26.8, 5.5))], RED, 2);
  layer(g, [P(ellipsePts(48, 11, 19, 6.5, -0.25))], RED);
  for (const [x, y, r] of [[10, 56, 3.2], [87, 54, 3.2], [31, 22, 2.8], [66, 19, 3.5]] as const) layer(g, [C(x, y, r)], MUSTARD_GOO, 2);
}

/** What stays on the floor: just the mustard puddle (no pieces of barrel). */
export function drawBarrelPuddle(g: G): void {
  const puddle: Pt[] = [[12, 62], [18, 52], [32, 48], [47, 50], [62, 46], [78, 52], [85, 62], [80, 72], [66, 78], [50, 75], [35, 79], [20, 73]];
  layer(g, [S(puddle)], MUSTARD_GOO);
  flat(g, [S([[24, 62], [30, 56], [42, 55], [48, 59], [40, 64], [28, 66]])], GOO_SHINE);
  flat(g, [T([[56, 70], [68, 70], [76, 64]], 3)], MUSTARD);
}
