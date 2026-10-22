/** @file Code-drawn art for the dodge roll badge: Varu curled into a ball and tumbling, in the same flat navy-outlined style as Varu and the pickups. */
import { COLORS } from '../../config/style';
import { C, E, T, flat, layer, type G } from './shapes';
import { FLEECE, FLEECE_SHADE, PIPING, SKIN } from './varu';

const JEANS = 0x3b5b92;
const SHOE = 0xf4f4f4;

/**
 * Varu mid-roll (64x64), seen from the side: the red fleece hoodie as a round back, his blond head tucked in (hair behind, face in front with
 * two eyes and a blush), one hand on his knee, jeans legs and white shoes sticking out behind, and three speed lines on the left.
 * Shown as an image on the dodge badge (`ui/BeltBadges.ts`), which rocks it a little.
 */
export function drawDodgeIcon(g: G): void {
  // speed lines (behind everything)
  flat(g, [T([[3, 26], [13, 26]], 2.6), T([[1, 34], [10, 34]], 2.6), T([[4, 42], [13, 42]], 2.6)], 0xffffff, 0.82);
  // legs and shoes
  layer(g, [C(43, 44, 8), C(50, 35, 7)], JEANS);
  layer(g, [E(46, 55, 13, 8), E(58, 43, 8, 13)], SHOE);
  // the hoodie ball: a light patch, a shaded fold, the black hem and a seam
  layer(g, [C(30, 38, 18)], FLEECE);
  flat(g, [E(24, 30, 13, 8)], 0xe0545a);
  flat(g, [T([[34, 53], [46, 46]], 6)], FLEECE_SHADE);
  flat(g, [T([[40, 53], [47, 47], [50, 40]], 4)], PIPING);
  flat(g, [T([[29, 21], [38, 29], [41, 40]], 1.8)], FLEECE_SHADE);
  // the arm to his knee: sleeve, black cuff, hand
  layer(g, [T([[31, 33], [42, 38]], 9)], FLEECE);
  flat(g, [T([[41, 35], [44, 38]], 4)], PIPING);
  layer(g, [C(47, 40, 5)], SKIN);
  // the head: blond hair first, then the face on top
  layer(g, [C(18, 22, 12)], COLORS.blond);
  flat(g, [T([[13, 12], [11, 19]], 1.8), T([[20, 11], [24, 18]], 1.8)], COLORS.navy);
  layer(g, [C(22, 29, 9)], SKIN);
  flat(g, [C(19, 29, 1.8), C(26, 30.5, 1.8)], COLORS.navy);
  flat(g, [C(17, 33, 2.2)], 0xf0a090);
}
