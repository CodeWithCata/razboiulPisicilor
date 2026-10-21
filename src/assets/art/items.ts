/** @file Code-drawn projectiles (yarn, tennis ball, broken heart, thrown belt), pickup icons (crochete, the loose cigarettes and the vape (the crochete's other looks), lapte, the milk bottle (the lapte's second look), monster, the Red Bull can (the Monster's second look), golden belt, laser, mystery question mark, a 3D block letter; the roulette wheel (its second look); the bad snail, dumbbell, emo hood, rusty belt, big Varu and smoke break) and the fans' petard. */
import { GOLD_BELT } from '../../config/animation';
import { COLORS } from '../../config/style';
import { C, E, NAVY, P, R, S, T, dense, ellipsePts, flat, heart, ink, layer, smooth, sparkle, type G, type Pt, type Shape } from './shapes';

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

/** Fireball (32x32): the tennis cat's red serve. Same ball as the green one, red with a hot highlight (the flames are particles, see FIREBALL_FX). */
export function drawFireball(g: G): void {
  layer(g, [C(16, 16, 13)], 0xe0402a, 3);
  g.lineStyle(2, 0xffd9a0, 1);
  g.beginPath().arc(2, 16, 12, -0.9, 0.9).strokePath();
  g.beginPath().arc(30, 16, 12, Math.PI - 0.9, Math.PI + 0.9).strokePath();
  flat(g, [E(10, 9, 6, 4)], 0xff9a6a);
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

/**
 * A loose pile of cigarettes fanned out (64x64), drawn after the owner's photo: long white paper with a seam, a shine and a shade, and a
 * cork-orange filter with speckles and a gold band where it meets the paper. The back one is lit: grey ash, a glowing ember and a little
 * smoke curling up. A heart sits in the corner (it heals). The second look of the crochete pickup (`PICKUP_VISUALS.crochete.looks` in
 * `config/pickups.ts`): visual only, it always heals the same.
 */
export function drawPickupCigarettes(g: G): void {
  const ol = 0x0b0d12; // near-black outline (same as the pack and the cans)
  /** Filter end and tip of each cigarette, back to front. The first one is lit. */
  const cigs: readonly (readonly [number, number, number, number])[] = [
    [10, 46, 30, 18],
    [10, 50, 38, 24],
    [12, 54, 46, 30],
    [16, 57, 52, 38],
    [22, 58, 56, 46],
  ];
  const W = 6.4;
  cigs.forEach(([fx, fy, tx, ty], n) => {
    const lit = n === 0;
    const len = Math.hypot(tx - fx, ty - fy);
    const ux = (tx - fx) / len;
    const uy = (ty - fy) / len;
    const at = (d: number, side = 0): Pt => [fx + ux * d + uy * side, fy + uy * d - ux * side];
    const cut = len * 0.34; // where the filter ends and the paper starts
    layer(g, [T([at(0), at(len)], W)], 0xf6f1e4, 2.2, ol); // the paper, outlined
    // the filter: cork orange with speckles
    flat(g, [T([at(0), at(cut)], W)], 0xe0a255);
    flat(g, [T([at(1.2, 1.8), at(cut - 1.5, 1.8)], 1.4)], 0xc98a3c, 0.8); // the shaded side
    flat(g, [T([at(1.8, -1.7), at(cut - 2, -1.7)], 1.2)], 0xf3cf94); // shine
    for (let k = 0; k < 6; k++) {
      const d = 1.8 + (k * (cut - 3.6)) / 5;
      const side = k % 2 === 0 ? -0.9 : 1.1;
      flat(g, [C(...at(d, side), 0.55)], k % 3 === 0 ? 0xf6d9a4 : 0xa8692a);
    }
    flat(g, [T([at(cut - 1.5), at(cut)], W)], 0xc9902f); // the gold band at the joint
    flat(g, [T([at(cut + 0.3, 0), at(cut + 1.1, 0)], W)], 0xe6dfcc); // a faint seam shadow on the paper
    // the paper: shine, shade and a thin seam along its length
    flat(g, [T([at(cut + 2, -1.6), at(len - 4, -1.6)], 1.3)], 0xffffff);
    flat(g, [T([at(cut + 2.5, 1.9), at(len - 4, 1.9)], 1.1)], 0xd9d3c2);
    flat(g, [T([at(cut + 2, 0.4), at(len - 4, 0.4)], 0.5)], 0xe6dfcc);
    if (lit) {
      flat(g, [T([at(len - 3.4), at(len)], W)], 0xa9a69e); // the grey ash
      flat(g, [T([at(len - 2.4, -1.4), at(len - 0.8, -1.2)], 1.4)], 0xd2cfc6); // light on the ash
      g.fillStyle(0xff6a2a, 0.3).fillCircle(tx, ty, 6.6); // the glow
      flat(g, [T([at(len - 1.6), at(len)], W - 0.8)], 0xff6a2a); // the ember
      flat(g, [C(...at(len - 0.5), 1.5)], 0xffd27a);
    } else {
      flat(g, [T([at(len - 1.6), at(len)], W)], 0xd8d1bd); // the paper end, a little darker
    }
  });
  // the little smoke: a wisp from the lit one, with a smaller curl branching off it (navy line first, light line over it)
  const wisp: Pt[] = [[30.4, 14.2], [34.4, 10.4], [28.6, 7], [33, 3]];
  const curl: Pt[] = [[34.4, 10.4], [38.6, 8.2], [37, 4.6]];
  ink(g, wisp, 5, NAVY);
  ink(g, curl, 4, NAVY);
  ink(g, wisp, 2.6, 0xe4e8ef);
  ink(g, curl, 1.8, 0xe4e8ef);
  // the heart: this one heals
  layer(g, heart(55, 57.4, 4.2), COLORS.red, 1.5, ol);
  flat(g, [C(53.6, 55.2, 0.9)], 0xff9aa8);
  sparkle(g, 55, 8, 4.2);
}

/**
 * A disposable vape, upright and slim (64x64), drawn after the owner's photo: a short black mouthpiece on a tall, narrow glossy green body
 * with a small white leaf logo, a few lines of printed text, a dark base with a glowing LED, a puff of vapor and a little heart (it heals).
 * The third look of the crochete pickup (`PICKUP_VISUALS.crochete.looks` in `config/pickups.ts`): visual only, it always heals the same.
 */
export function drawPickupVape(g: G): void {
  const ol = 0x0b0d12; // near-black outline (same as the pack and the cans)
  const green = 0x3fc23a;
  const greenLight = 0x8ff08a;
  const greenDark = 0x2a8f2a;
  const black = 0x1b1d24;

  // the vapor puff behind everything, drifting up and to the right of the mouthpiece
  layer(g, [C(42, 7.4, 3.6), C(47.4, 5, 3), C(46.4, 11.6, 2.8), C(51.6, 9.4, 2.2)], 0xf1f4fa, 1.8, ol);
  flat(g, [C(41, 6.4, 1.1)], 0xffffff);

  // the mouthpiece first (the body covers its base), then the narrow body, each outlined
  layer(g, [R(28.4, 4.5, 7.2, 14, 2.6)], black, 2.5, ol);
  flat(g, [R(29.8, 6.4, 1.4, 8, 0.7)], 0x4a4f5c); // shine on the mouthpiece
  layer(g, [R(25.5, 16, 13, 43, 4.5)], green, 2.5, ol);
  flat(g, [R(25.5, 16, 13, 3.4, 1.6)], black, 0.6); // the dark collar under the mouthpiece
  flat(g, [R(27, 22, 2, 30, 1)], greenLight); // glossy shine down the left
  flat(g, [R(36, 22, 2.2, 30, 1.1)], greenDark, 0.8); // shade down the right

  // the white leaf logo in a ring
  flat(g, [C(32, 28.5, 4.4)], 0xffffff);
  flat(g, [C(32, 28.5, 3.2)], green);
  flat(g, [S([[32, 25.6], [34.2, 28], [33.4, 30.6], [32, 31.8], [30.6, 30.6], [29.8, 28]])], 0xffffff);
  ink(g, [[32, 27], [32, 30.6]], 0.9, green);

  // printed text, as dashes
  for (let i = 0; i < 3; i++) flat(g, [R(27.4 + i * 2.6, 36.4, 1.6, 1.1, 0.3)], 0xffffff, 0.9);
  for (let i = 0; i < 3; i++) flat(g, [R(28.6 + i * 2.6, 39, 1.6, 1.1, 0.3)], 0xffffff, 0.7);

  // the dark base with its glowing LED
  flat(g, [R(26.6, 52, 10.8, 5, 1.5)], black, 0.85);
  g.fillStyle(0xff9a3a, 0.35).fillCircle(32, 54.5, 3.4);
  flat(g, [C(32, 54.5, 1.2)], 0xffd27a);

  // the heart: this one heals
  layer(g, heart(49.5, 53, 4.2), COLORS.red, 1.5, ol);
  flat(g, [C(48.1, 50.8, 0.9)], 0xff9aa8);
  sparkle(g, 12, 20, 3.6);
  sparkle(g, 10, 50, 2.8);
}

/**
 * A glass bottle of milk, upright (64x64), drawn after the owner's photo: clear glass with a shoulder and a long neck, white milk filling it up
 * to the neck, a gold foil cap, a shine and a shade on the glass, the plate's pink paw print on the front, and a splash. The second look of
 * the lapte pickup (`PICKUP_VISUALS.lapte.looks` in `config/pickups.ts`): visual only, it always gives the same speed.
 */
export function drawPickupMilkBottle(g: G): void {
  const ol = 0x0b0d12; // near-black outline (same as the cans)
  const glass = 0xd7e9f6;
  const milk = 0xfdfcf7;
  const gold = 0xe0b13c;
  // the glass silhouette: neck, shoulders, body
  const outline: Pt[] = [[26, 13], [38, 13], [38, 26], [45, 34], [45, 54], [41, 60], [23, 60], [19, 54], [19, 34], [26, 26]];
  layer(g, [P(outline)], glass, 2.5, ol);
  // the milk inside, up to the neck, and its surface line
  flat(g, [P([[26.4, 20], [37.6, 20], [37.6, 27], [44, 34.6], [44, 53.6], [40.6, 59], [23.4, 59], [20, 53.6], [20, 34.6], [26.4, 27]])], milk);
  flat(g, [R(40, 36, 3.6, 18, 1.6)], 0xe1e8f0); // the milk shaded on the right
  ink(g, [[26.6, 20.4], [37.4, 20.4]], 1.2, 0xc3d3e2); // the surface
  // the glass: a shine down the left and a shade down the right
  flat(g, [R(21.2, 36, 2.4, 17, 1.2)], 0xbfdcf2);
  flat(g, [T([[27.6, 15], [27.6, 24]], 1.8)], 0xffffff);
  flat(g, [R(36, 14, 1.6, 9, 0.8)], 0xb4cde3, 0.8);
  // the paw print on the front, like the milk plate
  flat(g, [E(32, 49.4, 9, 7), C(26.4, 44.4, 1.9), C(30.2, 41.8, 1.9), C(33.8, 41.8, 1.9), C(37.6, 44.4, 1.9)], 0xf48fa8);
  // the gold foil cap, with ridges and a shine
  layer(g, [R(24.4, 8, 15.2, 9, 2.5)], gold, 2.5, ol);
  flat(g, [R(24.4, 13.6, 15.2, 3.4, 1.4)], 0xb98a2a, 0.75); // the shaded lower rim
  for (let i = 0; i < 4; i++) flat(g, [R(27.2 + i * 3.1, 9.6, 1.2, 4, 0.5)], 0xb98a2a, 0.8);
  flat(g, [R(25.6, 9.2, 2, 4.4, 1)], 0xf6d77a); // light on the left
  // a splash and sparkles
  layer(g, [C(52, 12, 3.4), C(57, 19, 2.2), C(47, 6, 2.2)], 0xffffff, 1.8, ol);
  sparkle(g, 9, 22, 3.8);
  sparkle(g, 9, 54, 3);
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
 * Red Bull can, upright (64x64), drawn after the owner's close-up photo: a slim can, blue with a silver diagonal band running from the
 * top right down to the bottom left, white print at the top, the yellow sun with the two red bulls
 * charging at each other, red "ENERGY DRINK" under them, and fine print at the bottom. The second look of the Monster pickup
 * (`PICKUP_VISUALS.monster.looks` in `config/pickups.ts`): visual only, it gives the same strength.
 */
export function drawPickupRedBull(g: G): void {
  const ol = 0x0b0d12; // near-black outline, same as the Monster can
  const silver = 0xd9dfe9;
  const silverShade = 0x9aa2b4;
  const blue = 0x2a5cb8;
  const blueLight = 0x4b84e2;
  const blueDark = 0x1c3f88;
  const bull = 0xe8392a;
  const sun = 0xffd23a;
  const sunRing = 0xf5a31a;

  // silver base and shoulders, then the slim blue body, outlined as one silhouette
  layer(g, [P([[21.5, 56], [42.5, 56], [40, 61], [24, 61]])], 0xb4bac8, 2.5, ol);
  layer(g, [R(20, 13, 24, 45, 5), P([[23.5, 8], [40.5, 8], [44, 14], [20, 14]])], blue, 2.5, ol);
  flat(g, [T([[22, 58.4], [42, 58.4]], 1.2)], silverShade); // base ring

  // the silver diagonal band: wide at the bottom left, narrow at the top right
  flat(g, [P([[35.4, 14.5], [43.6, 14.5], [43.6, 18], [31.4, 56.8], [24, 56.8], [20.4, 53], [20.4, 49]])], silver);
  flat(g, [T([[35.4, 15], [20.8, 49]], 1.2)], 0xf4f7fb, 0.9); // a light edge along the band's upper side
  flat(g, [R(21.4, 18, 2.2, 34, 1.1)], blueLight, 0.55); // shine down the left side of the can
  flat(g, [R(41.4, 18, 2.6, 38, 1.2)], 0x0b2352, 0.4); // the can turning away on the right

  // the lid, rim and pull tab
  layer(g, [E(32, 9, 22, 8)], 0xcfd3dc, 2.5, ol);
  flat(g, [E(32, 9, 17, 5)], silverShade);
  flat(g, [E(32, 9.4, 10, 2.4)], 0x6d7488, 0.7);
  layer(g, [R(28, 6.6, 8, 4.4, 2)], 0xe8ebf2, 1.5, ol);
  flat(g, [R(30, 7.9, 4, 1.5, 0.7)], silverShade);

  // the white print at the top left
  for (let i = 0; i < 4; i++) flat(g, [R(22 + i * 2.3, 17.8, 1.6, 1.1, 0.3)], 0xffffff, 0.9);
  for (let i = 0; i < 3; i++) flat(g, [R(22 + i * 2.3, 20.2, 1.6, 1.1, 0.3)], 0xffffff, 0.75);

  // the yellow sun, then the two red bulls charging at each other (no lettering: it is unreadable at this size)
  flat(g, [C(32, 31.6, 5.8)], sunRing);
  flat(g, [C(32, 31.6, 4.6)], sun);
  for (const side of [-1, 1]) {
    const x = (dx: number): number => 32 + side * dx;
    flat(g, [E(x(7.4), 32.4, 8.8, 4.8), E(x(2.8), 31.2, 4.4, 4)], bull); // body and head
    ink(g, [[x(1.6), 29.8], [x(0.6), 28]], 1.1, 0xffe08a); // the horn
    ink(g, [[x(10.2), 33.8], [x(11.2), 36.2]], 1.2, bull); // back leg
    ink(g, [[x(7.6), 34.4], [x(7.8), 36.6]], 1.2, bull); // middle leg
    ink(g, [[x(4.6), 33.8], [x(3.8), 36.2]], 1.2, bull); // front leg
  }

  // "ENERGY DRINK" in small red dashes
  for (let i = 0; i < 11; i++) flat(g, [R(21.2 + i * 1.9 + (i >= 6 ? 1 : 0), 39.6, 1.3, 1.2, 0.3)], 0xe84a4a, 0.95);

  // the fine print at the bottom: dark on the silver, white on the blue
  for (let i = 0; i < 4; i++) flat(g, [R(22 + i * 2.4, 52.4, 1.7, 1.1, 0.3)], blueDark, 0.85);
  for (let i = 0; i < 3; i++) flat(g, [R(34.6 + i * 2.4, 52.4, 1.7, 1.1, 0.3)], 0xffffff, 0.85);

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

/** Rotate a point around (cx, cy) by `deg` degrees (clockwise on screen). */
function spin(x: number, y: number, cx: number, cy: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/**
 * The BAD pickup "snail" (64x64): a brown spiral shell on a tan body with two eye stalks, looking right (Varu will crawl).
 * Only the question mark gives it (`MYSTERY.badWeights`).
 */
export function drawPickupSnail(g: G): void {
  const tan = 0xe8c690;
  // eye stalks first (they sit behind the head), then the body and head in one silhouette
  layer(g, [T([[46, 40], [48, 25]], 3.4), T([[53, 41], [57, 28]], 3.4)], tan, 2.2);
  layer(g, [T([[8, 54], [42, 54]], 12), T([[40, 54], [50, 43]], 11)], tan, 2.5);
  flat(g, [T([[11, 57], [38, 57]], 2.4)], 0xc9a064);
  // eyes
  layer(g, [C(48, 21, 5), C(57, 24, 5)], 0xffffff, 2.2);
  flat(g, [C(49.4, 21.6, 2.3), C(58.4, 24.6, 2.3)], NAVY);
  // shell, with its spiral and a light patch on the upper left
  layer(g, [C(26, 31, 17)], 0xb96a3a, 3);
  flat(g, [E(18, 21, 9, 5.5)], 0xd68c58);
  const spiral: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = i * 0.38;
    const r = 1 + i * 0.26;
    spiral.push([26 + Math.cos(a) * r, 31 + Math.sin(a) * r]);
  }
  ink(g, spiral, 2.4, 0x6b3a1f);
}

/**
 * The BAD pickup "dumbbell" (64x64): a gray dumbbell, a little crooked, with a red arrow pointing DOWN above it (the belt gets weak).
 * Only the question mark gives it (`MYSTERY.badWeights`).
 */
export function drawPickupDumbbell(g: G): void {
  const cx = 30;
  const cy = 43;
  const tilt = 12;
  /** A rotated rectangle in the dumbbell's own frame (x along the bar, y across it). */
  const box = (x0: number, x1: number, half: number): Shape => P([[x0, -half], [x1, -half], [x1, half], [x0, half]].map(([x, y]) => spin(cx + x!, cy + y!, cx, cy, tilt)));

  layer(g, [box(-14, 14, 3.4)], 0x5d6577, 2.2); // the bar
  for (const sign of [-1, 1]) {
    const side = (a: number, b: number, half: number): Shape => (sign < 0 ? box(-b, -a, half) : box(a, b, half));
    layer(g, [side(10, 17, 11)], 0x9aa1b3, 2.4); // inner plate
    layer(g, [side(17, 25, 14)], 0xb9bfcd, 2.4); // outer plate
    flat(g, [side(18.4, 19.8, 11)], 0xe4e8f0); // a light edge on the outer plate
  }
  // the red arrow pointing down
  layer(g, [P([[46, 3.5], [54, 3.5], [54, 12], [59, 12], [50, 24], [41, 12], [46, 12]])], 0xe5484d, 2.4);
  flat(g, [T([[48.2, 6.2], [48.2, 12]], 1.6)], 0xf28b90);
}

/**
 * The BAD pickup "emo" (64x64): Varu's red hoodie hood pulled up, a sulky face inside it with a blond side-swept fringe over one eye,
 * a blue tear, a frown, the hood strings hanging down and a little broken heart in the corner. Only the question mark gives it.
 */
export function drawPickupEmo(g: G): void {
  const fleece = 0xc42d34;
  const fleeceShade = 0x9c2229;
  const hair = 0x12151d;
  // the hood, with its dark inside showing around the face
  layer(g, [S([[32, 4], [46, 8], [55, 20], [57, 36], [51, 50], [41, 55], [32, 56], [23, 55], [13, 50], [7, 36], [9, 20], [18, 8]])], fleece, 3);
  flat(g, [E(32, 33, 40, 42)], fleeceShade); // the shaded inside of the hood
  flat(g, [T([[14, 20], [19, 11]], 2.2)], 0xe0545a); // a light patch on the hood
  // the face
  layer(g, [E(32, 34, 29, 31)], 0xf3c9a1, 2);
  // the blond fringe: swept across the forehead and down over his left eye
  layer(g, [S([[17, 29], [20, 19], [32, 14], [44, 18], [47, 27], [37, 25], [29, 31], [26, 42], [20, 41]])], COLORS.blond, 1.8); // blond, like Varu's head
  flat(g, [T([[23, 21], [31, 17.5]], 1.6)], 0xfbe39a); // a light streak in the hair
  ink(g, [[30, 16.5], [28, 22], [30, 28]], 1.3); // strands, drawn like on his head in the game
  ink(g, [[38, 17.5], [39.5, 22], [43, 25.5]], 1.3);
  ink(g, [[21.5, 30], [23, 37]], 1.3);
  // the eyes: big, dark, looking down, a little eyeliner; the left one half hidden by the fringe
  flat(g, [E(40, 36.5, 8.6, 9.6)], hair);
  flat(g, [C(41.2, 35, 1.9)], 0xffffff);
  flat(g, [C(38.6, 38.4, 0.9)], 0xffffff);
  flat(g, [E(25.5, 40, 6.6, 7.4)], hair);
  flat(g, [C(26.4, 38.8, 1.4)], 0xffffff);
  ink(g, [[35.5, 31.6], [44.8, 33.6]], 1.6, hair); // a sad, slanted eyebrow
  // a tear rolling down the cheek
  layer(g, [T([[43, 42.5], [43.6, 46.5]], 3.2, 4.4)], 0x7ec8ff, 1.4);
  flat(g, [C(42.6, 45.7, 0.9)], 0xffffff);
  // the frown
  ink(g, [[27.5, 49], [32.5, 46.4], [37.5, 49]], 2, hair);
  // the hood strings: cream, hanging from under the chin
  layer(g, [T([[24, 52], [22, 61]], 2.8), T([[40, 52], [42, 61]], 2.8)], 0xfff3d6, 1.5);
  flat(g, [C(22, 61.5, 1.8), C(42, 61.5, 1.8)], hair);
  // a little broken heart in the corner (the emo cat's shot), with its crack
  layer(g, heart(53, 12, 6.4), 0xe0409a, 2);
  flat(g, [E(51, 9.4, 3, 2)], 0xf9b4d6);
  ink(g, [[53, 6.5], [51.2, 11], [54.6, 13.2], [52.6, 17.4]], 1.5, hair);
}

/**
 * The BAD pickup "rusty belt" (64x64): a limp, sagging old belt lying diagonally across the icon so it still reads as a BELT (not a ring):
 * a steel buckle with a prong at the upper left, a long dull strap with stitching along both edges and a row of belt holes,
 * a pointed tip at the lower right, speckled rust patches on strap and buckle, a crack across the leather and rust flakes falling off.
 * Only the question mark gives it.
 */
export function drawPickupRusty(g: G): void {
  const rustDark = 0xa84a1c;
  const rust = 0xd9772e;
  const rustLight = 0xf0a050;
  // the strap's centerline (a lazy curve from the buckle to the tip) and a helper to get a point + side offset on it
  const mid = smooth([[20, 21], [28, 30], [38, 37], [47, 43], [54, 49.5]], false, 10);
  const last = mid.length - 1;
  const cut = Math.round(last * 0.84); // where the strap starts to narrow into the tip
  const at = (t: number, side = 0): Pt => {
    const i = Math.min(last - 1, Math.max(0, Math.round(t * last)));
    const [x0, y0] = mid[i]!;
    const [x1, y1] = mid[i + 1]!;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [x0 + (-(y1 - y0) / len) * side, y0 + ((x1 - x0) / len) * side];
  };
  /** A rust patch: a cluster of small blobs around a point, darker at the edge with a lighter spot, so it looks crusty instead of like a plain oval. */
  const patch = (x: number, y: number, s: number): void => {
    flat(g, [E(x, y, 7 * s, 4 * s), E(x + 3 * s, y + 1.2 * s, 4 * s, 3 * s), E(x - 3 * s, y - 1 * s, 3.4 * s, 2.6 * s)], rustDark);
    flat(g, [E(x, y - 0.3 * s, 5 * s, 2.6 * s), E(x + 3 * s, y + 0.8 * s, 2.6 * s, 1.8 * s)], rust);
    flat(g, [C(x - 1 * s, y - 0.9 * s, 0.8 * s), C(x + 2 * s, y + 0.2 * s, 0.6 * s)], rustLight);
  };

  // rust flakes falling off the strap (behind everything)
  flat(g, [C(34, 54, 1.7), C(44, 58, 1.4), C(25, 58, 1.3), C(52, 60.5, 1.2), C(16, 51, 1.2)], rust);
  flat(g, [C(39, 60.5, 1), C(29, 55, 1)], rustLight);

  // the strap: wide leather, straight until the last stretch, then narrowing to a pointed tip
  layer(g, [T(mid.slice(0, cut + 1), 14), T(mid.slice(cut), 14, 4.5)], 0x7a5a3c, 2.6);
  // a lighter edge along the upper side and a darker one along the lower side give the strap thickness
  flat(g, [T([at(0.25, -5.4), at(0.5, -5.4), at(0.76, -5)], 1.6)], 0xa5835c);
  flat(g, [T([at(0.25, 5.6), at(0.5, 5.6), at(0.76, 5.2)], 1.8)], 0x4d3520);
  // stitching along both edges
  for (let k = 0; k < 8; k++) {
    const t = 0.24 + k * 0.07;
    const [ax, ay] = at(t, -3.9);
    const [bx, by] = at(t, 3.9);
    flat(g, [C(ax, ay, 0.8), C(bx, by, 0.8)], 0xd9bf94);
  }
  // belt holes along the middle, dark with a little ring so they look punched through
  for (const t of [0.55, 0.67, 0.79]) {
    const [hx, hy] = at(t);
    flat(g, [C(hx, hy, 2.3)], 0x2a1a0c);
    flat(g, [C(hx - 0.5, hy + 0.8, 1)], 0x4d3520);
  }
  // rust patches and the crack across the leather
  const [p1x, p1y] = at(0.34, -2.4);
  const [p2x, p2y] = at(0.62, 4);
  const [p3x, p3y] = at(0.9, -0.6);
  patch(p1x, p1y, 1);
  patch(p2x, p2y, 0.85);
  patch(p3x, p3y, 0.6);
  const [c0x, c0y] = at(0.46, -7);
  const [c1x, c1y] = at(0.46, -2);
  const [c2x, c2y] = at(0.49, 1.5);
  const [c3x, c3y] = at(0.46, 7);
  ink(g, [[c0x, c0y], [c1x + 0.8, c1y - 0.5], [c2x - 0.8, c2y + 0.4], [c3x, c3y]], 1.6, 0x2a1a0c);

  // the buckle: a steel frame, wider across the strap than along it, with the prong lying across its opening
  const [bx, by] = at(0.0);
  const [nx, ny] = at(0.06);
  const dir = Math.atan2(ny - by, nx - bx);
  const bc = [bx - 3, by - 3.5] as const;
  const rot = (x: number, y: number): Pt => [bc[0] + x * Math.cos(dir) - y * Math.sin(dir), bc[1] + x * Math.sin(dir) + y * Math.cos(dir)];
  const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [rot(x0, y0), rot(x1, y0), rot(x1, y1), rot(x0, y1)];
  layer(g, [P(box(-7, -9.5, 7.5, 9.5))], 0x7f8696, 2.6); // the frame
  flat(g, [P(box(-3.6, -6, 4, 6))], 0x2a1a0c); // the opening
  flat(g, [P(box(-3.6, -6, 4, -4))], 0x4d3520); // leather showing through its far edge
  flat(g, [T([rot(-6, -8.2), rot(-6, 8.2)], 1.4)], 0xc4cad6); // a light shine along the near bar
  layer(g, [T([rot(-5.5, 0.4), rot(3.5, 0.4)], 2.4)], 0x626878, 1.5); // the prong
  // rust on the steel
  flat(g, [E(...rot(5, 7), 6.6, 4), E(...rot(-5, -7.4), 4.4, 3.2)], rustDark);
  flat(g, [E(...rot(5, 7), 4.2, 2.4), E(...rot(-5, -7.4), 2.6, 1.8)], rust);
  flat(g, [C(...rot(5.6, 6.6), 0.9)], rustLight);
}

/**
 * The BAD pickup "big Varu" (64x64): Varu blown up like a balloon, front view: a round red hoodie belly stretched tight (zip bent over it, black hem,
 * strain marks), a blond head with wide eyes, puffed cheeks and a little "o" mouth, stubby arms out to the sides, small jeans feet,
 * and a red arrow in each top corner pushing outward. Only the question mark gives it.
 */
export function drawPickupBig(g: G): void {
  const fleece = 0xc42d34;
  const fleeceShade = 0x9c2229;
  const skin = 0xf3c9a1;
  const arrow = (pts: readonly Pt[]): void => layer(g, [P(pts)], 0xe5484d, 2);
  arrow([[3, 3], [16, 3], [3, 16]]);
  arrow([[61, 3], [48, 3], [61, 16]]);
  // the small jeans feet, then the stubby arms (sleeves with a black cuff and a round hand)
  layer(g, [E(24.5, 56, 11, 9), E(39.5, 56, 11, 9)], 0x3b5b92, 2.2);
  layer(g, [T([[18, 39], [10, 33.5]], 8), T([[46, 39], [54, 33.5]], 8)], fleece, 2.2);
  flat(g, [T([[12.4, 35.2], [10.6, 34]], 5.4), T([[51.6, 35.2], [53.4, 34]], 5.4)], 0x12151d);
  layer(g, [C(8, 31.4, 4.2), C(56, 31.4, 4.2)], skin, 2);
  // the stretched belly: round and tight, with a light patch, a shaded underside, the black hem and the zip bent over the curve
  layer(g, [C(32, 38, 18)], fleece, 3);
  flat(g, [E(39, 49.5, 13, 10)], fleeceShade); // the shaded lower right
  flat(g, [E(24, 30, 6.5, 10)], 0xe0545a); // a light patch on the upper left
  ink(g, [[23, 51.6], [27.5, 54.6], [32, 55.4], [36.5, 54.6], [41, 51.6]], 3.6, 0x12151d); // the black hem
  ink(g, [[32, 26], [33.4, 36], [32, 46], [32, 54]], 1.4, fleeceShade); // the zip, a little bent
  ink(g, [[22, 42], [26, 44.4]], 1.5, fleeceShade); // strain marks around the zip: the hoodie is about to pop
  ink(g, [[42, 42], [38, 44.4]], 1.5, fleeceShade);
  ink(g, [[23, 48], [27, 49.6]], 1.5, fleeceShade);
  ink(g, [[41, 48], [37, 49.6]], 1.5, fleeceShade);
  // the head on top: blond hair, wide eyes, puffed cheeks, a little "o" mouth
  layer(g, [C(32, 16.5, 12)], skin, 2.4);
  flat(g, [E(22.4, 21.6, 5.6, 3.8), E(41.6, 21.6, 5.6, 3.8)], 0xf59a9a); // puffed cheeks
  layer(g, [S([[19.5, 17], [20, 9], [27, 4], [37, 4], [44, 9], [44.5, 17], [38, 12.2], [32, 14.6], [26, 12.2]])], COLORS.blond, 1.8);
  ink(g, [[31, 5], [29.6, 9], [31.4, 12.6]], 1.2);
  ink(g, [[38, 6], [39.4, 9.6], [42, 12.4]], 1.2);
  flat(g, [C(26.6, 18.6, 3.1), C(37.4, 18.6, 3.1)], 0xffffff); // wide eyes
  flat(g, [C(26.6, 19.2, 1.7), C(37.4, 19.2, 1.7)], NAVY);
  flat(g, [C(26, 18.4, 0.6), C(36.8, 18.4, 0.6)], 0xffffff);
  flat(g, [C(32, 24.6, 1.7)], NAVY); // the "o" of a held breath
}

/** The BAD pickup "smoke break" (64x64): a cigarette with a glowing ember and a curl of smoke. Only the question mark gives it. */
export function drawPickupSmoke(g: G): void {
  ink(g, [[49, 15], [54, 10], [48, 6], [53, 1.5]], 5, NAVY); // the smoke: navy line first, light line over it
  ink(g, [[49, 15], [54, 10], [48, 6], [53, 1.5]], 2.6, 0xe4e8ef);
  layer(g, [T([[10, 54], [40, 26]], 10)], 0xf4f1e8, 2.4); // the paper
  layer(g, [T([[10, 54], [19, 45.5]], 10)], 0xd9a35c, 2.4); // the filter
  flat(g, [T([[19, 42], [38, 24]], 2.4)], 0xffffff); // light edge
  layer(g, [T([[40, 26], [46, 20]], 10)], 0xff6a2a, 2.4); // the ember
  g.fillStyle(0xffd27a, 0.7).fillCircle(45, 21, 3.4);
  g.fillStyle(0xff6a2a, 0.25).fillCircle(46, 20, 9);
}

/**
 * The mystery question mark (64x64): a chunky 3D "?" like a carved block letter. A dark gray side (the extrusion) falls to the
 * lower right, the front has a pale gray bevel rim around a gray face with light diagonal stripes, and the dot is a small block
 * the same way. A few white sparkles around it. It turns into a random pickup.
 */
export function drawPickupMystery(g: G): void {
  const side = 0x585b63;
  const sideLight = 0x72757d;
  const rim = 0xf0f0f2;
  const rimShade = 0xc3c5ca;
  const face = 0x969aa2;
  const stripe = 0xc2c5ca;
  const hook: Pt[] = [[17, 25], [16.5, 17], [23.5, 9.8], [32.5, 8.6], [41.5, 12.6], [44.5, 21], [40, 29.5], [32.8, 34.6], [32, 40]];
  const DX = 4;
  const DY = 4.4;
  const RIM_W = 9.4;
  const FACE_W = 4.8;

  const letter = (ox: number, oy: number): Shape[] => [
    T(hook.map(([x, y]) => [x + ox, y + oy] as Pt), RIM_W),
    R(27 + ox, 46 + oy, 10, 10, 2.2),
  ];

  // the side: the letter dragged toward the lower right, outlined once around the whole silhouette
  const steps = 9;
  for (let i = steps; i >= 0; i--) layer(g, letter((DX * i) / steps, (DY * i) / steps), side, i === steps ? 2.6 : 0);
  // light edge where the side turns away from the face, and a darker lower run
  for (let i = steps; i >= 1; i--) flat(g, letter((DX * i) / steps, (DY * i) / steps), i > steps * 0.55 ? side : sideLight);
  // the front: navy line round the face, then the pale rim
  layer(g, letter(0, 0), rim, 2.2);
  // shaded lower-right part of the rim (it turns toward the side)
  flat(g, [T(hook.map(([x, y]) => [x + 0.9, y + 0.9] as Pt), RIM_W - 1.8)], rimShade);
  flat(g, [R(27.9, 46.9, 8.2, 8.2, 1.8)], rimShade);
  flat(g, [T(hook.map(([x, y]) => [x - 0.5, y - 0.5] as Pt), RIM_W - 2.6)], rim);
  flat(g, [R(27.4, 46.4, 8, 8, 1.8)], rim);

  // the face: gray, with light diagonal stripes cut to the shape (sampled so the stripes never spill over the rim)
  const path = dense(smooth(hook), 0.6);
  const half = FACE_W / 2;
  const band = (x: number, y: number): boolean => Math.floor((y + x * 0.6) / 4.2) % 2 === 0;
  const q = 0.5;
  for (let y = 0; y < 64; y += q) {
    for (let x = 0; x < 64; x += q) {
      const inHook = path.some(([px, py]) => (px - x - q / 2) ** 2 + (py - y - q / 2) ** 2 <= half * half);
      const inDot = x >= 29.4 && x <= 34.6 && y >= 48.4 && y <= 53.6;
      if (!inHook && !inDot) continue;
      g.fillStyle(band(x, y) ? stripe : face, 1).fillRect(x, y, q, q);
    }
  }
  // the glint on the top-left of the curve
  flat(g, [T([[19.6, 21.5], [19.8, 17], [25, 11.8], [31, 11]], 1.1)], 0xffffff, 0.85);
  flat(g, [C(29.6, 48.4, 0.8)], 0xffffff, 0.9);

  sparkle(g, 54, 9, 5);
  sparkle(g, 9, 52, 3.8);
  sparkle(g, 12, 12, 2.6);
}

/**
 * Roulette wheel (64x64): the second look of the question mark pickup (`PICKUP_VISUALS.mystery.looks` in `config/pickups.ts`).
 * Gold rim, 12 pockets (red / near-black, one green at the top), a wooden center with four knobbed spokes, a gold hub and a white ball.
 */
export function drawPickupRoulette(g: G): void {
  const gold = COLORS.gold;
  const wood = 0xd9a05b;
  const woodLight = 0xe8b774;
  const knob = 0xf0b64a;
  const pockets = 12;
  const outer = 23.5;
  const inner = 14.5;
  const at = (r: number, deg: number): Pt => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [32 + r * Math.cos(t), 32 + r * Math.sin(t)];
  };
  const arc = (r: number, from: number, to: number, steps = 4): Pt[] => Array.from({ length: steps + 1 }, (_, i) => at(r, from + ((to - from) * i) / steps));

  // the gold rim and the dark bed the pockets sit in
  layer(g, [C(32, 32, 29)], gold, 2.6);
  ink(g, arc(27, -50, -5, 8), 2, 0xfff3b0);
  flat(g, [C(32, 32, 24.5)], NAVY);

  // the pockets: wedges from the hub ring out to the rim, the first one green
  for (let i = 0; i < pockets; i++) {
    const a0 = -15 + i * 30;
    const a1 = a0 + 30;
    const wedge: Pt[] = [...arc(outer, a0, a1), ...arc(inner, a1, a0)];
    flat(g, [P(wedge)], i === 0 ? 0x3fae4a : i % 2 === 1 ? COLORS.red : 0x262a38);
    ink(g, [at(inner, a0), at(outer, a0)], 0.7, gold); // thin gold divider
  }

  // the wooden center, the four spokes with their knobs, the hub
  layer(g, [C(32, 32, inner)], wood, 1.8);
  flat(g, [C(32, 32, 9)], woodLight);
  for (const a of [45, 135, 225, 315]) ink(g, [[32, 32], at(11, a)], 4.4);
  for (const a of [45, 135, 225, 315]) ink(g, [[32, 32], at(11, a)], 2, knob);
  for (const a of [45, 135, 225, 315]) {
    const [x, y] = at(11, a);
    layer(g, [C(x, y, 2.3)], knob, 1.2);
  }
  layer(g, [C(32, 32, 4.6)], gold, 1.8);
  flat(g, [C(30.6, 30.6, 1.4)], COLORS.white);

  // the ball in a red pocket, and two sparkles
  const [bx, by] = at(19, 60);
  layer(g, [C(bx, by, 2.7)], COLORS.white, 1.4);
  flat(g, [C(bx - 0.8, by - 0.8, 0.8)], 0xd8dce8);
  sparkle(g, 56, 10, 4.8);
  sparkle(g, 7, 53, 3.4);
}

/**
 * Petard (firecracker) the fans throw, fuse at the top (32x64). Drawn after a real one: a kraft-paper tube, a crimped pink paper cap with a
 * short pink fuse, a black label with gold print and a few lines of printed text down the side. Its spark is added in code.
 */
export function drawPetard(g: G): void {
  const kraft = 0xc9964f;
  const kraftLight = 0xe3b878;
  const kraftDark = 0x9b6d32;
  const pink = 0xe0308f;
  const pinkLight = 0xff7ab8;
  const pinkDark = 0xa81f66;
  const print = 0x3a2a14;
  // the fuse first, so the cap covers its base: a short rolled pink paper stick with a pale tip
  layer(g, [T([[15.5, 17], [17, 11], [16.4, 4.5]], 3.8)], pink, 1.8);
  flat(g, [T([[14.6, 15], [15.9, 10], [15.4, 5.5]], 1.1)], pinkLight, 0.9); // light along the stick
  flat(g, [T([[16.4, 4.5], [16.4, 3.6]], 3.8)], 0xfff0f6); // pale paper tip
  // the tube: outline and fill together, then the light and shade on its sides
  layer(g, [R(6, 17, 20, 44, 2.5)], kraft, 2.5);
  flat(g, [R(6, 17, 3.6, 44, 1.5)], kraftLight); // light catching the left edge
  flat(g, [R(22, 17, 4, 44, 1.5)], kraftDark); // shade on the right edge
  flat(g, [R(6, 57, 20, 4, 1.5)], kraftDark, 0.7); // the bottom edge, darker
  // the black label with gold print, and the printed lines running along the tube
  flat(g, [R(8.6, 27, 6.2, 24, 1)], 0x15151c);
  flat(g, [R(10, 29, 3.4, 1.4), R(10, 32, 3.4, 1.4), R(10.6, 38, 2.2, 5)], COLORS.gold, 0.9);
  flat(g, [R(17, 28, 1.1, 14), R(19.4, 30, 1.1, 18), R(17, 45, 1.1, 8)], print, 0.75);
  // the crimped pink cap: a band round the top and the gathered paper above it, with folds
  layer(g, [R(5.5, 15, 21, 8, 3)], pink, 2.5);
  flat(g, [R(5.5, 15, 3.6, 8, 1.5)], pinkLight, 0.8);
  flat(g, [R(22.6, 15, 3.9, 8, 1.5)], pinkDark, 0.8);
  layer(g, [E(16, 15.6, 23, 9), C(9.5, 15, 3.6), C(22.5, 15, 3.6), C(16, 12.6, 4.2)], pink, 2.2);
  flat(g, [E(12, 13.6, 6, 3), E(19.5, 12.6, 5, 2.6)], pinkLight, 0.9);
  ink(g, [[7.5, 17], [12, 14], [15, 15.4]], 1.3, pinkDark);
  ink(g, [[25, 17], [20.5, 14.6], [17.6, 16.4]], 1.3, pinkDark);
  ink(g, [[12, 18.6], [15.6, 16.6], [19.6, 18.6]], 1.2, pinkDark);
}
