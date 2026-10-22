/** @file Code-drawn art for the scooter and ice cream power-ups: the two pickup icons, the scooter seen from above (under Varu) and the ice block drawn over a frozen cat. */
import { C, E, P, R, T, flat, ink, layer, sparkle, type G, type Pt } from './shapes';

const TEAL = 0x22b8a6;
const TEAL_DARK = 0x167f73;
const STEEL = 0xc9d2dc;
const TIRE = 0x2a2f3a;
const HUB = 0xe9eef3;
const GRIP = 0xe5484d;

/** The scooter pickup (64x64): a kick scooter seen from the side (teal deck, two wheels, a steel stem with red grips), with speed lines behind it. */
export function drawPickupScooter(g: G): void {
  // speed lines (behind everything)
  flat(g, [T([[2, 26], [14, 26]], 2.4), T([[0, 34], [11, 34]], 2.4), T([[4, 42], [13, 42]], 2.4)], 0xffffff, 0.8);
  // the stem and the handlebar
  layer(g, [T([[48, 44], [45, 14]], 4.4)], STEEL, 2.2);
  layer(g, [T([[39, 12], [55, 12]], 4.6)], STEEL, 2.2);
  flat(g, [C(39, 12, 3.2), C(55, 12, 3.2)], GRIP);
  // the deck
  layer(g, [R(11, 40, 38, 7, 3.5)], TEAL, 2.4);
  flat(g, [R(14, 41.5, 30, 2, 1)], 0x6fe6d6);
  // the two wheels
  layer(g, [C(15, 51, 7.5)], TIRE, 2.2);
  flat(g, [C(15, 51, 3)], HUB);
  layer(g, [C(49, 51, 7.5)], TIRE, 2.2);
  flat(g, [C(49, 51, 3)], HUB);
}

/** The scooter seen from ABOVE (64x128, front at the top), under Varu while the buff runs: a teal deck, a wheel at each end, the stem and the handlebar with red grips. */
export function drawScooterBody(g: G): void {
  // wheels (front and back)
  layer(g, [R(25, 4, 14, 24, 6)], TIRE, 2.4);
  layer(g, [R(25, 100, 14, 24, 6)], TIRE, 2.4);
  flat(g, [R(30, 9, 4, 14, 2), R(30, 105, 4, 14, 2)], HUB, 0.7);
  // the fork and the deck
  layer(g, [T([[32, 22], [32, 48]], 6)], STEEL, 2.2);
  layer(g, [R(18, 38, 28, 70, 11)], TEAL, 2.6);
  flat(g, [R(23, 44, 18, 58, 7)], TEAL_DARK);
  flat(g, [T([[26, 50], [26, 96]], 2.4)], 0x6fe6d6, 0.55); // a stripe of grip tape shine
  // the handlebar
  layer(g, [R(6, 36, 52, 8, 4)], STEEL, 2.4);
  layer(g, [C(8, 40, 5.5), C(56, 40, 5.5)], GRIP, 2.2);
  // the headlight on the fork
  flat(g, [C(32, 30, 3.4)], 0xfff3b0);
}

/** The ice cream pickup (64x64): a waffle cone with a pink scoop and a blue scoop, a cherry on top, and two sparkles of frost. */
export function drawPickupIceCream(g: G): void {
  // the cone (the tip points down)
  layer(g, [P([[20, 33], [44, 33], [32, 61]])], 0xe0a95b, 2.4);
  const lattice: Pt[][] = [[[24, 36], [38, 50]], [[29, 35], [41, 43]], [[40, 36], [27, 49]], [[35, 35], [25, 43]]];
  for (const pts of lattice) ink(g, pts, 1.4, 0xa86a2a);
  // the pink scoop, a bit wider, with a drippy rim
  layer(g, [C(32, 29, 14), E(32, 35, 15, 5)], 0xff9ec7, 2.6);
  flat(g, [E(25, 24, 5, 3)], 0xffd0e4);
  // the blue scoop on top
  layer(g, [C(32, 17, 11)], 0x9fdcff, 2.6);
  flat(g, [E(27, 13, 4, 2.6)], 0xe3f6ff);
  // the cherry
  layer(g, [C(33, 6, 4.2)], 0xe5303f, 2);
  ink(g, [[33, 2], [36, 0]], 1.6, 0x4a7a2a);
  // frost
  sparkle(g, 9, 14, 4, 0xbfeaff);
  sparkle(g, 55, 24, 3.4, 0xffffff);
}

/** The ice block drawn over a frozen cat (128x128): a rounded pale-blue cube with a bright edge, a diagonal shine and a few cracks. It is shown see-through, so the cat shows inside. */
export function drawIceBlock(g: G): void {
  layer(g, [R(10, 10, 108, 108, 22)], 0xb9e6fb, 3.2);
  flat(g, [R(18, 18, 92, 92, 16)], 0xd9f3ff, 0.55);
  flat(g, [P([[26, 30], [44, 20], [60, 20], [30, 50]]), P([[22, 62], [34, 52], [38, 60], [26, 72]])], 0xffffff, 0.75);
  ink(g, [[86, 24], [78, 44], [88, 54], [80, 72]], 2, 0xffffff);
  ink(g, [[96, 84], [86, 92], [90, 104]], 2, 0xffffff);
  sparkle(g, 100, 34, 6, 0xffffff);
  sparkle(g, 32, 98, 5, 0xffffff);
}
