/** @file Code-drawn projectiles (yarn, tennis ball, broken heart, thrown belt) and pickup icons (crochete, lapte, monster, golden belt, laser, mystery question mark). */
import { GOLD_BELT } from '../../config/animation';
import { COLORS } from '../../config/style';
import { C, E, P, R, S, T, ellipsePts, flat, heart, ink, layer, sparkle, type G, type Pt, type Shape } from './shapes';

/** Ball of yarn with a loose thread (32x32). */
export function drawYarn(g: G): void {
  layer(g, [T([[22, 23], [25, 28], [28, 27]], 2.6)], 0xf27ba2, 2);
  layer(g, [C(15, 15, 12)], 0xf27ba2, 2.5);
  flat(g, [P([[7, 11], [14, 5], [20, 6], [10, 15]]), P([[18, 24], [25, 20], [26, 15], [19, 21]])], 0xf7a3be);
  for (const pts of [[[5, 12], [12, 8], [22, 8]], [[4, 18], [14, 12], [26, 14]], [[6, 22], [16, 16], [25, 22]], [[11, 26], [17, 18], [20, 5]]] as Pt[][]) ink(g, pts, 1.5);
}

/** Tennis ball (32x32). */
export function drawTennis(g: G): void {
  layer(g, [C(16, 16, 13)], 0xc9e33a, 3);
  g.lineStyle(2, 0xffffff, 1);
  g.beginPath().arc(2, 16, 12, -0.9, 0.9).strokePath();
  g.beginPath().arc(30, 16, 12, Math.PI - 0.9, Math.PI + 0.9).strokePath();
  flat(g, [E(10, 9, 6, 4)], 0xf1fba0);
}

/** Broken heart (the emo cat's shot, 32x32): hot-pink heart with a black crack down the middle. */
export function drawBrokenHeart(g: G): void {
  const outline: Pt[] = [[16, 29], [5, 18], [3, 10], [7, 5], [12, 5], [16, 9], [20, 5], [25, 5], [29, 10], [27, 18]];
  layer(g, [S(outline)], 0xe0409a, 2.5);
  flat(g, [E(10, 10, 6, 4)], 0xf9b4d6);
  ink(g, [[16, 8], [13.5, 13], [18, 16.5], [14, 21], [16.5, 26]], 1.8, 0x15151c);
}

/** Thrown belt, buckle at the top (32x96). `gold`: the golden belt, gold strap coated in sticky white goo. */
export function drawBeltThrown(g: G, gold = false): void {
  layer(g, [T([[16, 22], [17, 50], [15, 74], [16, 91]], 13, 8)], COLORS.belt, 2.5);
  for (const y of [36, 48, 60, 72]) flat(g, [C(16.5, y, 1.5)], gold ? GOLD_BELT.gold : 0x4a2f14);
  flat(g, [T([[12, 28], [12.5, 50], [11, 72]], 1.4)], gold ? GOLD_BELT.goldShine : 0xb07a40);
  layer(g, [R(5, 3, 22, 21, 4)], COLORS.gold, 2.5);
  flat(g, [R(10, 8, 12, 11, 2)], gold ? GOLD_BELT.goldShade : 0x6b4423);
  flat(g, [T([[16, 8], [16, 24]], 3)], COLORS.gold);
  if (gold) {
    const goo: Shape[] = [C(10, 40, 3.6), C(22, 62, 3.4), T([[22, 54], [23, 62]], 4, 2.8), C(23, 63.5, 3.4), T([[10, 70], [9, 79]], 4.2, 3), C(9, 80.5, 3.6)];
    layer(g, goo, GOLD_BELT.gooBody, 1.8);
    flat(g, [C(11, 41, 1.3), C(23, 64, 1.2)], GOLD_BELT.gooShade);
    flat(g, [C(9, 38.5, 1.1), C(21, 60.5, 1.1)], COLORS.white);
  }
}

/** Red cigarette pack ("Carpați" style) with one cigarette sticking out: black warning panel, yellow strip, gold stag shield, and a heart for the heal (64x64). */
export function drawPickupCrochete(g: G): void {
  const ol = 0x0b0d12; // near-black outline (same as the energy can)
  const red = 0xb3182b;
  const redDark = 0x86111f;
  const gold = 0xd9ae5a;
  const cream = 0xf1e7c8;

  // one cigarette sticks out of the top: white paper, tan filter on the tip (drawn first, so the pack covers its base)
  layer(g, [T([[25.8, 5], [22.8, 19]], 4.6)], 0xf6f1e4, 2, ol);
  flat(g, [T([[26.6, 11], [26, 14]], 0.9)], 0xd9d3c2); // paper shade
  flat(g, [T([[25.8, 5], [25.1, 8.2]], 4.6)], 0xdca05a); // filter
  flat(g, [T([[25.05, 8.3], [24.85, 9.2]], 4.6)], 0xb97a3a); // filter band
  flat(g, [T([[24.2, 5.8], [23.9, 7.4]], 0.9)], 0xf0c68a); // filter shine

  // silhouette: the front face and the side face, outlined together (the top starts lower, to leave room for the cigarette)
  layer(g, [R(10, 16, 32, 44, 2), P([[42, 16], [49, 19], [49, 58], [42, 60]])], red, 2.5, ol);
  flat(g, [P([[42, 16], [49, 19], [49, 58], [42, 60]])], redDark);
  flat(g, [R(10, 16, 2.4, 44, 1)], 0xd0364a); // light catching the left edge

  // side face: barcode up top, grey panel at the bottom
  flat(g, [P([[43.2, 29], [48, 30.6], [48, 36], [43.2, 34.6]])], cream);
  for (let i = 0; i < 4; i++) flat(g, [R(43.9 + i * 1.1, 30 + i * 0.4, 0.5, 4.4, 0)], 0x1b1b22);
  flat(g, [P([[43.2, 38], [48, 39.6], [48, 56.4], [43.2, 57.8]])], 0xb9bcc4);
  flat(g, [T([[44.6, 55], [44.6, 41]], 1.6)], 0x4a4f5c); // "Fumatul ucide" running up the panel

  // front top: gold logo lip, then the black warning panel with two white lines and the yellow strip
  flat(g, [R(10, 16, 32, 2.8, 1)], gold);
  for (let i = 0; i < 5; i++) flat(g, [R(18 + i * 3.4, 16.9, 2, 1, 0.3)], 0xffffff, 0.9);
  flat(g, [R(10, 18.8, 32, 15.6)], 0x16141a);
  flat(g, [R(13, 20.4, 26, 2.2, 1), R(13, 23.4, 21, 2.2, 1)], 0xffffff);
  flat(g, [R(10, 26.8, 32, 3.2)], 0xf5c518);
  for (let i = 0; i < 7; i++) flat(g, [R(12.4 + i * 3.6, 27.8, 2.4, 1.1, 0.3)], 0x1b1b22);

  // the dark photo: a small face profile lit from the side, and a curl of smoke
  flat(g, [S([[10, 31], [15.6, 30.6], [19.2, 31.6], [18.4, 32.4], [19.6, 33.2], [18.6, 34], [10, 34.4]])], 0x4a2a24);
  flat(g, [T([[15.6, 30.8], [18.8, 31.7], [18, 32.5], [19, 33.2]], 0.8, 0.4)], 0xc07a5a, 0.85);
  flat(g, [T([[21.6, 33], [24.6, 31.8], [23.2, 30.6], [26.4, 30.2]], 1.2, 0.5)], 0xffffff, 0.7);

  // lower front: faint mountains, the gold shield with the stag, "arpați", "ORIGINAL 100s"
  flat(g, [P([[10, 60], [10, 55], [16, 51.5], [20, 55], [27, 49.5], [34, 56], [38, 52.5], [42, 57], [42, 60]])], 0xc9384a, 0.55);
  layer(g, [P([[13, 35.4], [26, 35.4], [26, 50], [19.5, 56.2], [13, 50]])], gold, 1.4, ol);
  flat(g, [P([[14.6, 37], [24.4, 37], [24.4, 49], [19.5, 54], [14.6, 49]])], 0xe8c97a);
  const stag = 0x2f6b3a;
  for (const pts of [[[18.8, 44], [17.4, 40.6], [16, 38.4]], [[17.4, 40.6], [15.4, 40.4]], [[21, 44], [22.4, 40.6], [24, 38.4]], [[22.4, 40.6], [24.6, 40.6]]] as Pt[][]) ink(g, pts, 1.2, stag);
  flat(g, [E(19.8, 47.2, 5, 7), E(21.6, 50.6, 2.6, 3), E(17.6, 44.8, 2.6, 1.6)], stag); // head, snout, ear
  g.lineStyle(1.3, 0xffffff, 1);
  g.beginPath().arc(19.6, 47.4, 5.4, 0.8, 5.5).strokePath(); // the white "C"
  // "arpați": tiny white lettering (a r p a ț i)
  g.lineStyle(1, 0xffffff, 1);
  const word: (readonly Pt[])[][] = [
    [[[1.9, 0], [1.9, 2.6]], [[1.9, 0.1], [0.1, 0.1], [0.1, 2.5], [1.9, 2.5]]],
    [[[0, 0], [0, 2.6]], [[0, 0.7], [0.7, 0], [1.8, 0]]],
    [[[0, 0], [0, 4]], [[0, 0.1], [1.9, 0.1], [1.9, 2.3], [0, 2.3]]],
    [[[1.9, 0], [1.9, 2.6]], [[1.9, 0.1], [0.1, 0.1], [0.1, 2.5], [1.9, 2.5]]],
    [[[1, -1], [1, 2.8]], [[0, 0.2], [2, 0.2]]],
    [[[1, 0], [1, 2.6]], [[1, -1.6], [1, -1.4]]],
  ];
  word.forEach((strokes, i) => {
    const x0 = 27.4 + i * 2.5;
    for (const pts of strokes) for (let k = 0; k < pts.length - 1; k++) g.lineBetween(x0 + pts[k][0], 48 + pts[k][1], x0 + pts[k + 1][0], 48 + pts[k + 1][1]);
  });
  for (let i = 0; i < 9; i++) flat(g, [R(25 + i * 1.9, 57, 1.3, 1, 0.2)], 0xffffff, 0.85);

  // heart: this one heals
  layer(g, heart(56.4, 14, 4), COLORS.red, 1.5, ol);
  flat(g, [C(55, 11.8, 0.9)], 0xff9aa8);
  sparkle(g, 57, 34, 3.4);
}

/** Plate of milk with a paw print and a splash (64x64). */
export function drawPickupLapte(g: G): void {
  layer(g, [C(30, 34, 26)], 0xeef1fa);
  layer(g, [C(30, 34, 19)], 0xfdf3da, 2);
  flat(g, [E(30, 38, 10, 8), C(23, 31, 2.8), C(29, 27, 2.8), C(35, 27, 2.8), C(41, 31, 2.8)], 0xf48fa8);
  layer(g, [C(53, 11, 3.2), C(47, 6, 2.2), C(57, 17, 1.8)], 0xfdf3da, 1.8);
}

/** Tiny hand-lettered "MONSTER": each letter is a polyline on a 3 x 5 grid (the O gets its slash). */
const MONSTER_LETTERS: readonly (readonly Pt[])[] = [
  [[0, 5], [0, 0], [1.5, 2.6], [3, 0], [3, 5]], // M
  [[1.5, -0.4], [1.5, 5.4]], // O (the ring is drawn separately)
  [[0, 5], [0, 0], [3, 5], [3, 0]], // N
  [[3, 0], [0, 0], [0, 2.5], [3, 2.5], [3, 5], [0, 5]], // S
  [[0, 0], [3, 0], [1.5, 0], [1.5, 5]], // T
  [[3, 0], [0, 0], [0, 5], [3, 5], [0, 5], [0, 2.5], [2.2, 2.5]], // E
  [[0, 5], [0, 0], [3, 0], [3, 2.5], [0, 2.5], [1, 2.5], [3, 5]], // R
];

/** Monster-style energy can, upright: black body, green claw "M", white lettering, green band (64x64). */
export function drawPickupMonster(g: G): void {
  const body = 0x252a35;
  const ol = 0x0b0d12; // near-black outline instead of the usual navy, so it melts into the can
  const lime = 0x8fe01a;
  const limeDark = 0x3f9e12;
  const limeLight = 0xc6f53a;
  const shine = 0x454c5e;

  // silver base and shoulders, then the body, all outlined as one silhouette
  layer(g, [P([[18, 56], [46, 56], [43, 61], [21, 61]])], 0xb4bac8, 2.5, ol);
  layer(g, [R(17, 13, 30, 45, 5), P([[21, 8], [43, 8], [47, 14], [17, 14]])], body, 2.5, ol);
  flat(g, [R(19.5, 15, 3.2, 38, 1.6)], shine); // shine down the left side
  flat(g, [T([[21, 58.4], [43, 58.4]], 1.2)], 0x8a91a3); // base ring

  // the green lid, rim and pull tab
  layer(g, [E(32, 9, 26, 8)], 0xcfd3dc, 2.5, ol);
  flat(g, [E(32, 9, 21, 5)], lime);
  flat(g, [E(32, 9.4, 13, 2.6)], limeDark, 0.55);
  layer(g, [R(28, 6.6, 8, 4.4, 2)], 0xe8ebf2, 1.5, ol);
  flat(g, [R(30, 7.9, 4, 1.5, 0.7)], 0x8a91a3);

  // "ZERO SUGAR" along the top, as a row of little green dashes
  const dashes = [0, 2.6, 5.2, 8.4, 11, 13.6, 16.2, 18.8];
  for (const d of dashes) flat(g, [R(22.2 + d, 15.2, 1.9, 1.7, 0.4)], lime);

  // the three claw marks: jagged hooks at the top, thin tips, dark green edge and a bright core
  const clawL: Pt[] = [[19, 25], [20, 21], [22.5, 22.5], [24.5, 19.5], [27.5, 21.5], [27, 29], [26, 35], [24.6, 41], [23.6, 35], [22.2, 30], [20.2, 28]];
  const clawM: Pt[] = [[28.6, 22], [30.5, 19], [32.5, 21], [34.5, 18.4], [37.4, 21.6], [36.6, 29], [35.4, 36], [33.4, 43.5], [31.6, 37], [30, 30]];
  const clawR: Pt[] = [[37.4, 23], [39.2, 20], [41.4, 22], [43.6, 19.4], [45.4, 23.5], [44, 30], [42.4, 35], [40.8, 39.5], [39.8, 33], [38.2, 28]];
  flat(g, [P(clawL), P(clawM), P(clawR)], limeDark);
  flat(g, [T([[23.2, 24], [23.8, 31], [24.4, 38]], 3.2, 0.6), T([[32.3, 22.5], [32.6, 32], [33.2, 40]], 3.6, 0.6), T([[41.4, 24.5], [41.6, 30], [40.8, 36]], 3.2, 0.6)], lime);
  flat(g, [T([[23.2, 24.5], [23.6, 31], [24, 35]], 1.2, 0.3), T([[32.2, 23], [32.4, 31], [32.9, 37]], 1.4, 0.3), T([[41.3, 25], [41.4, 30], [41, 33]], 1.2, 0.3)], limeLight);

  // "MONSTER": white letters, the O with its slash
  g.lineStyle(1.25, 0xffffff, 1);
  MONSTER_LETTERS.forEach((pts, i) => {
    const x0 = 20.6 + i * 3.45;
    for (let k = 0; k < pts.length - 1; k++) g.lineBetween(x0 + pts[k][0], 42.6 + pts[k][1] * 0.9, x0 + pts[k + 1][0], 42.6 + pts[k + 1][1] * 0.9);
  });
  g.strokeEllipse(20.6 + 3.45 + 1.5, 42.6 + 2.25, 3.4, 4.2);

  // "ENERGY" in small green dashes, then the green band with dark lettering and "500ml" under it
  for (let i = 0; i < 6; i++) flat(g, [R(24 + i * 2.6, 48.7, 1.8, 1.2, 0.3)], lime);
  flat(g, [R(17.5, 51.2, 29, 3.9, 0.6)], lime);
  for (let i = 0; i < 9; i++) flat(g, [R(20.4 + i * 2.55, 52.4, 1.8, 1.5, 0.3)], 0x1b2a0a);
  for (let i = 0; i < 5; i++) flat(g, [R(26.2 + i * 2.1, 55.6, 1.3, 1.3, 0.3)], 0xffffff, 0.9);

  sparkle(g, 54, 17, 5.5);
  sparkle(g, 9, 43, 3.5);
}

/**
 * The golden belt buckled into a loop and standing on its edge, seen a little from above (64x64): a wide low band, so it is clearly a belt
 * and not a ring or a wheel. You see the dark inside of the loop, the front wall of the strap with its holes and stitching, the gold
 * rectangular buckle, the loose tail laid over the strap, and white goo dripping off the bottom edge.
 */
export function drawPickupGoldenBelt(g: G): void {
  const cx = 32;
  const topY = 24; // center of the top opening
  const wall = 14; // how tall the belt is (its width)
  const rx = 25;
  const ry = 12;
  /** A point on the front wall: angle `a` (0..PI is the front half), `h` how far down the wall (0 = top rim, 1 = bottom edge), `grow` pushes outward. */
  const wallAt = (a: number, h: number, grow = 0): Pt => [cx + (rx + grow) * Math.cos(a), topY + (ry + grow * 0.5) * Math.sin(a) + wall * h];

  // the band: discs stacked from the top down make its wall, outlined as one silhouette
  const discs: Shape[] = [];
  for (let i = 0; i <= 7; i++) discs.push(P(ellipsePts(cx, topY + (wall * i) / 7, rx, ry, 0, 36)));
  layer(g, discs, COLORS.belt, 2.6);
  // the dark inside of the loop, with the thickness of the leather showing as a rim
  flat(g, [P(ellipsePts(cx, topY, rx - 3.4, ry - 2.3, 0, 36))], 0x3a2410);
  flat(g, [P(ellipsePts(cx, topY - 0.6, rx - 5.6, ry - 3.6, 0, 36))], 0x4a2f14);
  // gold shine along the top of the front wall, and a darker shade along its bottom
  flat(g, [T([wallAt(2.95, 0.22), wallAt(2.4, 0.22), wallAt(1.9, 0.22), wallAt(1.5, 0.22)], 1.4)], GOLD_BELT.goldShine, 0.9);
  flat(g, [T([wallAt(2.95, 0.93), wallAt(2.3, 0.93), wallAt(1.6, 0.93)], 2.2)], 0x6f4520, 0.8);
  // stitching along the top rim and holes along the middle of the wall
  for (let a = 1.75; a <= 3.0; a += 0.25) flat(g, [C(...wallAt(a, 0.36), 0.7)], 0xf1e7c8);
  for (const a of [1.75, 2.05, 2.35, 2.65]) flat(g, [C(...wallAt(a, 0.62), 1.6)], COLORS.gold);

  // sticky white goo hanging off the bottom edge
  const [d1x, d1y] = wallAt(2.2, 1);
  const [d2x, d2y] = wallAt(1.5, 1);
  const goo: Shape[] = [C(d1x, d1y, 3), T([[d1x, d1y + 1], [d1x + 0.4, d1y + 6]], 3.4, 2.4), C(d1x + 0.4, d1y + 7, 2.6), C(d2x, d2y, 2.4), T([[d2x, d2y + 1], [d2x, d2y + 3.5]], 3, 2.2), C(d2x, d2y + 4.4, 2.1)];
  layer(g, goo, GOLD_BELT.gooBody, 1.8);
  flat(g, [C(d1x - 1, d1y - 0.8, 0.9)], COLORS.white);

  // the loose tail: the strap end comes out of the buckle and lies over the band, narrowing to a point
  const tail = [wallAt(1.0, 0.5, 1.5), wallAt(0.7, 0.5, 1.5), wallAt(0.4, 0.5, 1.5), wallAt(0.1, 0.5, 1.5)];
  layer(g, [T(tail, 12, 7)], COLORS.belt, 2.5);
  flat(g, [T([wallAt(0.95, 0.2, 1.5), wallAt(0.6, 0.2, 1.5), wallAt(0.3, 0.2, 1.5)], 1.2)], GOLD_BELT.goldShine, 0.9);
  for (const a of [0.55, 0.3]) flat(g, [C(...wallAt(a, 0.5, 1.5), 1.4)], COLORS.gold);

  // the gold rectangular buckle on the front, across the strap, with its dark inside and the prong
  const [bx, by] = wallAt(1.12, 0.5, 1.5);
  const dir = -0.3;
  const box = (len: number, wid: number): Pt[] => {
    const tx = (Math.cos(dir) * len) / 2;
    const ty = (Math.sin(dir) * len) / 2;
    const qx = (-Math.sin(dir) * wid) / 2;
    const qy = (Math.cos(dir) * wid) / 2;
    return [[bx + tx + qx, by + ty + qy], [bx + tx - qx, by + ty - qy], [bx - tx - qx, by - ty - qy], [bx - tx + qx, by - ty + qy]];
  };
  layer(g, [P(box(12, 18))], COLORS.gold, 2.6);
  flat(g, [P(box(6, 12))], GOLD_BELT.goldShade);
  flat(g, [T([[bx - Math.cos(dir) * 5.5, by - Math.sin(dir) * 5.5], [bx + Math.cos(dir) * 5.5, by + Math.sin(dir) * 5.5]], 2.2)], COLORS.gold);
  flat(g, [T([[bx - 2, by - 8], [bx + 2.4, by - 8.6]], 1.2)], GOLD_BELT.goldShine, 0.9);

  sparkle(g, 7, 8, 5);
  sparkle(g, 57, 9, 4);
  sparkle(g, 57, 57, 3.2);
}

/** Red laser pen with the red dot (64x64). */
export function drawPickupLaser(g: G): void {
  layer(g, [T([[14, 51], [41, 24]], 11)], 0xd93a3a, 2.5);
  flat(g, [T([[15, 47], [38, 24]], 2.2)], 0xf47070);
  flat(g, [T([[12, 53], [16, 49]], 11)], 0x9a2424);
  layer(g, [T([[41, 24], [47, 18]], 7, 5)], 0xcfd3dc, 2);
  layer(g, [T([[22, 47], [30, 39]], 3)], 0xcfd3dc, 1.8);
  g.lineStyle(2.4, 0xff2222, 1);
  for (const deg of [-180, -135, -90, -45, 0]) {
    const a = (deg * Math.PI) / 180;
    g.lineBetween(55 + Math.cos(a) * 7.5, 12 + Math.sin(a) * 7.5, 55 + Math.cos(a) * 11, 12 + Math.sin(a) * 11);
  }
  g.fillStyle(0xff2222, 0.35).fillCircle(55, 12, 6.5);
  g.fillStyle(0xff3b3b, 1).fillCircle(55, 12, 3.6);
  g.fillStyle(0xffffff, 1).fillCircle(55, 12, 1.5);
}

/** The mystery question mark (64x64): a violet block with gold studs, a big gold "?" on it, and a few sparkles. It turns into a random pickup. */
export function drawPickupMystery(g: G): void {
  const violet = 0x8e44ec;
  const violetDark = 0x6a2fc0;
  const violetLight = 0xb985ff;
  const gold = COLORS.gold;

  // the block: outlined silhouette, a darker lower edge for depth and a light strip on the top-left edge
  layer(g, [R(7, 7, 50, 50, 9)], violet, 3);
  flat(g, [R(9, 44, 46, 11, 7)], violetDark);
  flat(g, [T([[14, 12], [48, 12]], 2.6)], violetLight, 0.9);
  flat(g, [R(11, 16, 3, 22, 1.4)], violetLight, 0.55);

  // four gold studs in the corners
  for (const [x, y] of [[14, 14], [50, 14], [14, 50], [50, 50]] as const) {
    layer(g, [C(x, y, 3)], gold, 1.5);
    flat(g, [C(x - 0.8, y - 0.8, 1)], COLORS.white, 0.85);
  }

  // the "?": a gold curve with a navy outline, and the dot
  const hook: Pt[] = [[23.5, 25], [23, 19], [28, 14.5], [34, 14.5], [40, 19], [39.5, 26], [32.5, 32], [32, 38.5]];
  layer(g, [T(hook, 7.4), C(32, 47.2, 4.1)], gold, 2.4);
  flat(g, [T([[26, 20], [29.5, 17.4], [34, 17.4]], 1.7)], 0xfff0a8, 0.95); // shine along the curve
  flat(g, [C(30.8, 46, 1.2)], 0xfff0a8, 0.95);

  sparkle(g, 56, 8, 5);
  sparkle(g, 7, 56, 3.6);
}
