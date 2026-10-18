import { COLORS } from '../../config/style';
import { C, E, P, S, T, Tpart, ellipsePts, flat, fluff, ink, layer, scalloped, type G, type Pt } from './shapes';

/** Queen Cat (128x128, facing UP): fluffy white head, gold crown, red cape with ermine trim. */
export function drawBossQueen(g: G): void {
  const fur = 0xfffaf0;
  const red = 0xb3303f;
  layer(g, [P(scalloped(64, 111, 28, 13, 10, 0.12))], fur);
  ink(g, [[60, 108], [66, 104], [73, 108], [68, 114], [62, 112]], 2);
  layer(g, [S([[34, 62], [64, 58], [94, 62], [108, 82], [114, 94], [100, 100], [64, 102], [28, 100], [14, 94], [20, 82]])], red);
  layer(g, fluff([[14, 92], [28, 100], [64, 103], [100, 100], [114, 92]], 6), fur);
  layer(g, fluff([[24, 68], [40, 77], [64, 81], [88, 77], [104, 68]], 7), fur);
  layer(g, [P(scalloped(64, 40, 22, 21, 12, 0.07)), P([[42, 32], [39, 16], [55, 24]]), P([[86, 32], [89, 16], [73, 24]])], fur);
  flat(g, [P([[43, 28], [42, 21], [49, 25]]), P([[85, 28], [86, 21], [79, 25]])], 0xf5c6c6);
  layer(g, [P([[55, 27], [54, 12], [59, 18], [64, 8], [69, 18], [74, 12], [73, 27]])], COLORS.gold);
  flat(g, [T([[56, 23], [72, 23]], 3)], 0xd9a400);
  flat(g, [C(54, 12, 2), C(64, 8, 2.3), C(74, 12, 2)], COLORS.red);
}

/** Mafia Cat (128x128, facing UP): chunky grey cat, pinstripe suit, gold chain, black fedora with a red band, cigar. */
export function drawBossMafia(g: G): void {
  const grey = 0x6b6b75;
  const suit = 0x262d52;
  layer(g, [T([[62, 98], [60, 110], [66, 118], [78, 116], [84, 108]], 10)], grey);
  layer(g, [T([[34, 74], [24, 64], [24, 50]], 15), T([[94, 74], [104, 64], [104, 50]], 15)], suit);
  layer(g, [C(24, 44, 7.5), C(104, 44, 7.5)], grey);
  layer(g, [S([[30, 68], [64, 62], [98, 68], [100, 92], [86, 108], [64, 112], [42, 108], [28, 92]])], suit);
  for (let x = 37; x <= 91; x += 6.5) {
    const k = Math.sqrt(Math.max(0, 1 - ((x - 64) / 35) ** 2));
    ink(g, [[x, 88 - 22 * k + 3], [x, 88 + 22 * k - 3]], 1.2, 0xe8ecf8);
  }
  // Head, then the shirt collar and gold chain under it.
  layer(g, [C(64, 54, 20)], grey);
  layer(g, [P([[51, 70], [64, 83], [57, 69]]), P([[77, 70], [64, 83], [71, 69]])], 0xffffff, 2);
  flat(g, [T([[50, 71], [64, 84], [78, 71]], 2.6)], COLORS.gold);
  // Cigar in the right paw.
  layer(g, [T([[104, 45], [118, 37]], 6)], 0x8b5a2b, 2.5);
  flat(g, [T([[110, 41.5], [112, 40.5]], 2.5)], COLORS.gold);
  flat(g, [C(120, 36, 3)], 0xff7a3d);
  // Fedora seen from above: brim, red band, creased crown.
  layer(g, [E(64, 46, 56, 40)], 0x1a1a24);
  flat(g, [E(64, 46, 36, 27)], COLORS.red);
  layer(g, [E(64, 45, 28, 20)], 0x23232f, 1.5);
  ink(g, [[64, 37], [64, 53]], 2, 0x0e0e14);
  flat(g, [T([[50, 40], [57, 36]], 2)], 0x4a4a5c);
}

/** Pisica Federer (128x128, facing UP): cream cat in a white polo and headband, racket raised, ball in the other paw. */
export function drawBossFederer(g: G): void {
  const cream = 0xf0d9a8;
  const tan = 0xd9a864;
  const tail: Pt[] = [[66, 100], [70, 111], [82, 119], [92, 112]];
  layer(g, [T(tail, 9)], cream);
  flat(g, [Tpart(tail, 9, 0.45, 0.58), Tpart(tail, 9, 0.75, 0.88)], tan);
  layer(g, [E(64, 88, 64, 54), E(44, 104, 14, 16), E(84, 104, 14, 16)], cream);
  // Racket (tilted a little), drawn before the arm that holds it.
  const rot = 0.12;
  const rp = (lx: number, ly: number): Pt => [109 + lx * Math.cos(rot) - ly * Math.sin(rot), 21 + lx * Math.sin(rot) + ly * Math.cos(rot)];
  layer(g, [T([rp(0, 14), [106, 47]], 5)], 0x6b4423, 2.5);
  layer(g, [P(ellipsePts(109, 21, 12, 17, rot))], 0xb08d57, 2.5);
  layer(g, [P(ellipsePts(109, 21, 8.5, 13.5, rot))], 0xf6f2e4, 1.2);
  for (const u of [-5, 0, 5]) {
    const k = 12.5 * Math.sqrt(1 - (u / 8.5) ** 2);
    ink(g, [rp(u, -k), rp(u, k)], 0.9, 0x9a8f7a);
    const j = 8 * Math.sqrt(1 - ((u * 1.4) / 13.5) ** 2);
    ink(g, [rp(-j, u * 1.4), rp(j, u * 1.4)], 0.9, 0x9a8f7a);
  }
  // Polo shirt with both sleeves.
  const polo = S([[34, 61], [64, 57], [94, 61], [98, 80], [90, 92], [64, 95], [38, 92], [30, 80]]);
  layer(g, [polo, T([[36, 70], [26, 64], [24, 55]], 12), T([[92, 70], [102, 62], [106, 52]], 12)], 0xffffff);
  layer(g, [T([[50, 64], [64, 70], [78, 64]], 5)], 0xffffff, 2);
  flat(g, [T([[78, 76], [87, 76]], 3)], 0x3fa35a);
  layer(g, [C(24, 51, 6.5), C(106, 47, 7)], cream, 2.5);
  // Tennis ball in the left paw.
  layer(g, [C(18, 41, 8)], 0xd7f03a, 2.5);
  ink(g, [[13, 36], [16, 41], [13, 46]], 1.4, 0xffffff);
  flat(g, [E(15, 37, 4, 3)], 0xf1fba0);
  // Head, ears, headband.
  layer(g, [E(64, 44, 44, 38), P([[46, 36], [42, 19], [60, 28]]), P([[82, 36], [86, 19], [68, 28]])], cream);
  flat(g, [E(76, 37, 13, 11), P([[74, 29], [83, 23], [84, 32]])], tan);
  flat(g, [P([[47, 32], [45, 24], [54, 28]])], 0xf5c6c6);
  layer(g, [T([[47, 45], [64, 48], [81, 45]], 6)], 0xffffff, 2.5);
}
