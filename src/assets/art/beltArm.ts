/** @file Draws Varu's raised arm + belt, the picture on the touch attack button. */
import { COLORS } from '../../config/style';
import { C, P, R, T, flat, layer, rod, type G, type Pt } from './shapes';
import { DARK_BELT, FLEECE, FLEECE_SHADE, PIPING, SKIN } from './varu';

/**
 * Varu's raised right arm holding the belt, for the touch attack button (input/touch/TouchOverlay.ts). The shapes, numbers and colors are the
 * ones of the body texture (`drawVaruBelt` and the right sleeve in `drawVaru`, art/varu.ts), so the button looks like the character:
 * red fleece sleeve with the black cuff, round fist, leather belt loop with its shine, hanging strap, gold buckle.
 * The sleeve starts a little later than on the body (it ends inside the button instead of behind a torso).
 * `cx, cy` is the point of the art that lands on (0, 0): the caller sets the Graphics position and scale.
 */
export function drawBeltArm(g: G, cx: number, cy: number): void {
  const p = ([x, y]: Pt): Pt => [x - cx, y - cy];
  const pts = (list: readonly Pt[]): Pt[] => list.map(p);
  const [rx, ry] = p([0, 0]);

  // Sleeve, its seam and its black cuff.
  layer(g, [T(pts([[80, 84], [94, 66], [103, 50]]), 11)], FLEECE);
  flat(g, [T(pts([[87, 76], [95, 65]]), 2.2)], FLEECE_SHADE);
  flat(g, [P(pts(rod(96, 50.5, 106, 56, 2.8)))], PIPING);

  // Belt: the loop and the strap hanging down, then the shine on the loop.
  const loop = T(pts([[104, 40], [99, 32], [92, 24], [84, 20], [80, 26], [83, 35], [91, 41], [99, 42]]), 6);
  const strap = T(pts([[104, 42], [111, 44], [115, 54], [116, 66]]), 6);
  layer(g, [loop, strap], COLORS.belt, 2.5);
  flat(g, [T(pts([[100, 32], [93, 25], [86, 21]]), 1.6)], 0xb07a40);

  // Gold buckle with its dark inside.
  layer(g, [R(110 + rx, 63 + ry, 13, 15, 3)], COLORS.gold, 2.5);
  flat(g, [R(114 + rx, 67 + ry, 5, 7, 1)], DARK_BELT);

  // The round fist closes over the strap.
  layer(g, [C(104 + rx, 44 + ry, 7)], SKIN, 2.5);
}
