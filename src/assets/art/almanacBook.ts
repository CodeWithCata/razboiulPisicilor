/** @file The almanac's picture: a green field-guide book with a gold-ringed cat face on the cover, page edges, a red bookmark and a little sparkle, in three layers (body, spine, cover flap) so the cover can swing open. Same flat shapes and navy outline as the cats. */
import { COLORS } from '../../config/style';
import { C, E, P, R, flat, ink, layer, type G } from './shapes';

/**
 * The art is drawn on a 96-wide canvas; `cx` / `cy` / `w` / `h` are the box it really covers (the bookmark sticks out of the top) and its
 * middle, in canvas pixels. `hinge` is the x where the cover is fixed to the spine: the cover flap is drawn with that x as its 0 and placed
 * there, so scaling it sideways swings it open. `width` is the flap's width.
 */
export const ALMANAC_BOOK_ART = { cx: 48, cy: 45, w: 72, h: 100, hinge: 27, flapW: 47 } as const;

const COVER = 0x2e9a57;
const COVER_BACK = 0x25804a;
const SPINE = 0x1f6e3e;
const SHEEN = 0x66c987;
const ENDPAPER = 0xbfe8c8;
const PAGE = COLORS.cream;
const PAGE_LINE = 0xd9c9a3;
const CARD = 0xe3f3c8;
const GOLD = COLORS.gold;
const FUR = 0xf59a3c;
const NAVY = COLORS.navy;
/** The little dots on the mini cards of the open page: one cat color each. */
const CARD_DOTS = [0xf59a3c, 0x9aa4c4, 0x4c3a68, 0xf4a5a0, 0xffd23f, 0xd93a3a, 0x7ee081, 0x6fb7ff, 0xffffff] as const;

/** What is under the cover: the bookmark, the block of pages, the back cover and the first page with a grid of mini cards (it shows once the cover is open). */
export function drawAlmanacBody(g: G): void {
  layer(g, [P([[57, 14], [65, 14], [65, -2], [61, 2.5], [57, -2]])], COLORS.red, 1.8);
  layer(g, [R(22, 14, 58, 78, 4)], PAGE);
  ink(g, [[30, 89.2], [76, 89.2]], 1.2, PAGE_LINE);
  ink(g, [[77, 22], [77, 84]], 1.2, PAGE_LINE);
  layer(g, [R(16, 8, 58, 78, 5)], COVER_BACK);
  layer(g, [R(29, 12, 42, 70, 3)], PAGE, 1.6);
  for (let i = 0; i < 9; i++) {
    const x = 31 + (i % 3) * 13;
    const y = 16 + Math.floor(i / 3) * 19;
    layer(g, [R(x, y, 11, 15, 2)], CARD, 1.1);
    flat(g, [C(x + 5.5, y + 7.5, 3)], CARD_DOTS[i]!);
  }
  ink(g, [[36, 76], [64, 76]], 1.2, PAGE_LINE);
}

/** The spine: a darker strip down the left of the book with two gold bands. Its right edge is straight, so the cover flap joins it without a notch. */
export function drawAlmanacSpine(g: G): void {
  layer(g, [R(16, 8, 13, 78, 5), P([[24, 8], [29, 8], [29, 86], [24, 86]])], SPINE);
  flat(g, [R(16, 20, 13, 3, 0), R(16, 71, 13, 3, 0)], GOLD);
}

/**
 * The cover flap (x 0 to `flapW`, the hinge at x 0; put the Graphics at x = `hinge`). `inside` = the other face, the one that shows once the
 * cover has swung over: a pale endpaper with a paw print. Outside: the green cover, gold corners, the gold ring with the tabby's face, two gold title lines.
 */
export function drawAlmanacFlap(g: G, inside: boolean): void {
  const W = ALMANAC_BOOK_ART.flapW;
  const shape = [R(0, 8, W, 78, 5), P([[0, 8], [11, 8], [11, 86], [0, 86]])];
  if (inside) {
    layer(g, shape, ENDPAPER);
    // A paw print: one big pad and four toes.
    flat(g, [E(23, 55, 17, 13), C(14, 44, 3.3), C(20.5, 39, 3.5), C(27.5, 39, 3.5), C(33, 44, 3.3)], COVER);
    return;
  }
  layer(g, shape, COVER);
  ink(g, [[5, 13], [5, 22]], 2, SHEEN);
  flat(g, [P([[W - 2.5, 10.5], [W - 11, 10.5], [W - 2.5, 19]]), P([[W - 2.5, 83.5], [W - 11, 83.5], [W - 2.5, 75]])], GOLD);

  const cx = 23; // the emblem's middle (x 50 in the whole book)
  layer(g, [C(cx, 42, 20)], GOLD, 2);
  flat(g, [C(cx, 42, 16.5)], PAGE);
  layer(g, [E(cx, 45, 22, 18), P([[cx - 10, 42], [cx - 11.5, 30.5], [cx - 2, 37]]), P([[cx + 10, 42], [cx + 11.5, 30.5], [cx + 2, 37]])], FUR, 1.4);
  flat(g, [C(cx - 4.5, 45, 1.8), C(cx + 4.5, 45, 1.8)], NAVY);
  flat(g, [P([[cx - 1.6, 47.4], [cx + 1.6, 47.4], [cx, 49.4]])], 0xf4a5a0);
  for (const side of [-1, 1] as const) {
    ink(g, [[cx + side * 9, 47.5], [cx + side * 14.5, 46]], 1.1, NAVY);
    ink(g, [[cx + side * 9, 49], [cx + side * 14.5, 50.5]], 1.1, NAVY);
  }
  ink(g, [[7, 73], [39, 73]], 2.6, GOLD);
  ink(g, [[13, 79], [33, 79]], 2.2, GOLD);
}

/** A four-point sparkle centered on (0, 0), about 16 px across. */
export function drawSparkle(g: G, color: number = COLORS.white): void {
  layer(g, [P([[0, -8], [2.2, -2.2], [8, 0], [2.2, 2.2], [0, 8], [-2.2, 2.2], [-8, 0], [-2.2, -2.2]])], color, 1.4);
}
