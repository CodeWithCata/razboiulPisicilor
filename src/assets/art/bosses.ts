/** @file Code-drawn boss sprites: Mafia Cat, the emo cat (128x128, facing up). The Queen is in art/queen.ts, Pisica Federer in art/federer.ts. */
import { C, E, P, S, T, Tpart, dense, flat, heart, ink, layer, smooth, sparkle, type G, type Pt } from './shapes';

/** Stripes across a thick curved limb (arm warmers): short bars perpendicular to the curve at n evenly spaced points between t0 and t1. */
function bands(g: G, pts: readonly Pt[], span: number, t0: number, t1: number, n: number, width: number, color: number): void {
  const path = smooth(pts);
  for (let i = 0; i < n; i++) {
    const idx = Math.round((t0 + ((t1 - t0) * (i + 0.5)) / n) * (path.length - 1));
    const a = path[Math.max(0, idx - 1)];
    const b = path[Math.min(path.length - 1, idx + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / len) * (span / 2);
    const ny = ((b[0] - a[0]) / len) * (span / 2);
    const [x, y] = path[idx];
    ink(g, [[x + nx, y + ny], [x - nx, y - ny]], width, color);
  }
}

/** Block letters for the chest tattoo (each letter is 5 wide, 8 tall): lists of connected points. */
const TATTOO: Record<string, Pt[][]> = {
  C: [[[5, 0.5], [0.5, 0.5], [0.5, 7.5], [5, 7.5]]],
  A: [[[0.5, 8], [2.5, 0.5], [4.5, 8]], [[1.3, 5.5], [3.7, 5.5]]],
  M: [[[0.5, 8], [0.5, 0.5], [2.5, 4.5], [4.5, 0.5], [4.5, 8]]],
  P: [[[0.5, 8], [0.5, 0.5], [4.5, 0.5], [4.5, 4.5], [0.5, 4.5]]],
  U: [[[0.5, 0.5], [0.5, 7.5], [4.5, 7.5], [4.5, 0.5]]],
  S: [[[4.5, 0.5], [0.5, 0.5], [0.5, 4], [4.5, 4], [4.5, 7.5], [0.5, 7.5]]],
};

/** The text "CAMPUS" as a rock tattoo: spiky block letters with a hot-pink drop shadow and a swash underneath. */
function drawTattoo(g: G, x0: number, y0: number, step: number): void {
  const word = 'CAMPUS';
  for (const [dx, dy, color] of [[0.8, 0.9, 0xe0409a], [0, 0, 0x15151c]] as const) {
    for (let i = 0; i < word.length; i++) {
      const ox = x0 + i * step + dx;
      for (const line of TATTOO[word[i]]) {
        for (let k = 0; k < line.length - 1; k++) {
          const [ax, ay] = line[k];
          const [bx, by] = line[k + 1];
          ink(g, [[ox + ax, y0 + ay + dy], [ox + bx, y0 + by + dy]], 1.9, color);
        }
      }
      // Gothic thorn on top of each letter.
      flat(g, [P([[ox + 0.1, y0 + 0.6 + dy], [ox + 0.9, y0 - 1.6 + dy], [ox + 2, y0 + 0.6 + dy]])], color);
    }
  }
  ink(g, [[x0 + 1, y0 + 10.2], [x0 + 12, y0 + 11.6], [x0 + 22, y0 + 11.2], [x0 + 32, y0 + 11.6], [x0 + 36, y0 + 10.2]], 1.1, 0xe0409a);
  flat(g, [P([[x0 + 15, y0 + 11.2], [x0 + 18, y0 + 14.2], [x0 + 21, y0 + 11.2]])], 0x15151c);
}

/** A beaded chain along a curve: navy cord with small silver links. */
function chain(g: G, pts: readonly Pt[]): void {
  ink(g, pts, 1.8);
  for (const [x, y] of dense(smooth(pts), 1.7)) flat(g, [C(x, y, 0.75)], 0xdfe3ee);
}

/** One raised arm with a striped arm warmer and a paw (the other arm is the mirror image: pass a different `m`). */
function drawEmoArm(g: G, m: (x: number) => number): void {
  const grey = 0x8d8f99;
  const arm: Pt[] = [[m(33), 86], [m(22), 71], [m(15), 55]];
  // Arm with two fur tufts on its outer edge, shaded on that side.
  layer(g, [T(arm, 14), P([[m(25), 80], [m(20.5), 82], [m(24), 76]]), P([[m(19), 67], [m(14.5), 68], [m(18), 62]])], grey);
  flat(g, [Tpart([[m(29), 88], [m(18.5), 73], [m(11.5), 57]], 4, 0, 0.55)], 0x757785);
  // Striped warmer: black with pink bands, a lighter pink line in each band, a ribbed hem.
  flat(g, [Tpart(arm, 14, 0.42, 0.93)], 0x15151c);
  bands(g, arm, 11, 0.42, 0.93, 3, 2.6, 0xe0409a);
  bands(g, arm, 8, 0.42, 0.93, 3, 0.8, 0xf777b9);
  bands(g, arm, 11, 0.935, 0.94, 1, 1.4, 0x3b3d4f);
  bands(g, arm, 11, 0.415, 0.42, 1, 1.4, 0x3b3d4f);
  // Paw: one soft rounded shape with three toe bumps, a big pad with three toe beans, short claws.
  layer(g, [E(m(15), 47.5, 20, 17), C(m(8.8), 41.2, 4.3), C(m(15), 38.8, 4.5), C(m(21.2), 41.2, 4.3)], 0x9fa1ac);
  flat(g, [E(m(11), 44, 4, 2.4)], 0xb4b6c1);
  ink(g, [[m(11.9), 38.6], [m(11.9), 43.4]], 0.9, 0x6f7080);
  ink(g, [[m(18.1), 38.6], [m(18.1), 43.4]], 0.9, 0x6f7080);
  flat(g, [E(m(15), 50.5, 9.5, 6.5)], 0x6f7080);
  flat(g, [C(m(10.3), 45, 1.9), C(m(15), 43.5, 2), C(m(19.7), 45, 1.9)], 0x6f7080);
  flat(g, [E(m(13.2), 49.3, 3, 1.6)], 0x8a8c9a);
  layer(g, [P([[m(7.6), 37.6], [m(8.8), 34], [m(10), 37.6]]), P([[m(13.8), 35.2], [m(15), 31.6], [m(16.2), 35.2]]), P([[m(20), 37.6], [m(21.2), 34], [m(22.4), 37.6]])], 0xffffff, 0.8);
}

/** Mafia Cat, now an emo cat (128x128, facing UP): chunky grey cat, shaggy black and hot-pink fringe, spiked choker with a NOT OKAY heart, striped arm warmers, raised paws, CAMPUS chest tattoo. */
export function drawBossMafia(g: G): void {
  const grey = 0x8d8f99;
  const dark = 0x6f7080;
  const deep = 0x3b3d4f;
  const black = 0x15151c;
  const pink = 0xe0409a;
  const hot = 0xf777b9;
  const silver = 0xdfe3ee;
  const white = 0xffffff;
  // Feet with toe lines.
  layer(g, [E(40, 112, 20, 13), E(88, 112, 20, 13)], grey);
  flat(g, [E(40, 115.5, 16, 5), E(88, 115.5, 16, 5)], 0x757785);
  for (const cx of [40, 88]) for (const dx of [-4.5, 0, 4.5]) ink(g, [[cx + dx, 113.5], [cx + dx, 117.5]], 1.1, dark);
  // Raised arms, then the body over their shoulders (with hip tufts), shaded underneath.
  drawEmoArm(g, (x) => x);
  drawEmoArm(g, (x) => 128 - x);
  layer(g, [S([[28, 78], [40, 67], [64, 64], [88, 67], [100, 78], [102, 94], [92, 109], [64, 114], [36, 109], [26, 94]]),
    P([[27, 92], [23, 95.5], [28, 99]]), P([[101, 92], [105, 95.5], [100, 99]])], grey);
  flat(g, [S([[27, 96], [35, 108], [64, 113], [93, 108], [101, 96], [92, 101], [84, 108], [64, 110], [44, 108], [36, 101]])], 0x757785);
  flat(g, [E(33, 80, 10, 5), E(95, 80, 10, 5)], 0x9a9ca7);
  // Fluffy white chest with a ragged edge.
  flat(g, [P([[44, 82], [41, 87], [45, 90], [41, 95], [45, 99], [43, 103], [48, 106], [52, 111], [58, 108], [64, 112], [70, 108], [76, 111], [80, 106], [85, 103], [83, 99], [87, 95], [83, 90], [87, 87], [84, 82], [76, 80], [64, 79], [52, 80]])], white);
  drawTattoo(g, 46, 94, 6.2);
  ink(g, [[50, 85], [53, 88], [51, 88], [54, 92]], 1.2, black);
  ink(g, [[78, 85], [75, 88], [77, 88], [74, 92]], 1.2, black);
  sparkle(g, 42, 98, 2.2, black);
  sparkle(g, 86, 98, 2.2, black);
  // Head, ears and cheek tufts, shaded on the right cheek and lit on the forehead.
  layer(g, [E(64, 42, 66, 58), P([[32, 36], [30, 14], [48, 22]]), P([[96, 36], [98, 14], [80, 22]]), P([[94, 50], [103, 55], [94, 60]]), P([[92, 60], [100, 67], [90, 67]])], grey);
  flat(g, [E(92, 58, 8, 14)], 0x7f818f);
  flat(g, [E(86, 28, 10, 5)], 0x9c9eaa);
  flat(g, [P([[93, 32], [95, 20], [86, 25]])], 0xb9b9c4);
  flat(g, [P([[90, 30], [91.5, 24], [93, 30]]), P([[86, 28], [87.5, 23], [89.5, 28]])], white);
  layer(g, [C(96.5, 19, 1.3), C(98, 26, 1.3)], silver, 0.8);
  // Muzzle, fur tufts, nose, mouth, whisker dots and whiskers.
  flat(g, [E(64, 61, 34, 22), P([[78, 55], [85, 59], [78, 62]]), P([[78, 63], [84, 67], [77, 67]])], white);
  flat(g, [E(64, 70, 18, 4)], 0xe0e1e8);
  layer(g, [P([[60.5, 55.5], [67.5, 55.5], [64, 59.5]])], 0xd9667f, 0.8);
  flat(g, [C(63, 56.6, 0.7)], white);
  ink(g, [[64, 59.8], [64, 63]], 1);
  ink(g, [[60.5, 65.5], [64, 63], [67.5, 65.5]], 1.4);
  for (const [x, y] of [[71, 61], [73, 63], [71, 65]] as const) flat(g, [C(x, y, 0.6)], dark);
  ink(g, [[74, 60.5], [88, 57.5]], 0.7, 0xeceef4);
  ink(g, [[75, 63], [89, 63]], 0.7, 0xeceef4);
  ink(g, [[74, 65.5], [87, 68.5]], 0.7, 0xeceef4);
  // The one visible eye: dark bag, green iris with ring and shine, slit pupil, heavy lid, winged liner, angry brow.
  flat(g, [E(78, 54, 13, 5)], 0x787988);
  ink(g, [[72, 56.5], [84, 57]], 0.8, dark);
  layer(g, [E(78, 49, 12, 8)], 0x7cc152, 1.6);
  flat(g, [E(78, 50, 8, 6)], 0x4f9a3a);
  flat(g, [E(78.5, 49.5, 2.6, 6)], black);
  flat(g, [C(76, 48, 1.1)], white);
  flat(g, [P([[70, 43.5], [86.5, 44.5], [86.5, 48.2], [70, 50.5]])], grey);
  ink(g, [[70.5, 50.3], [86, 48]], 1.7);
  ink(g, [[85, 47.5], [91.5, 44.5]], 1.8);
  ink(g, [[71, 43.5], [87, 41.5]], 1.3, deep);
  // Pentagram earring on a tiny chain.
  ink(g, [[96.5, 31], [98.5, 33.5]], 1, silver);
  layer(g, [C(99, 38, 4.6)], silver, 1.2);
  flat(g, [C(99, 38, 2.5)], grey);
  const star: Pt[] = [0, 1, 2, 3, 4, 0].map((k) => [99 + 3.1 * Math.cos(-Math.PI / 2 + k * 2.5133), 38 + 3.1 * Math.sin(-Math.PI / 2 + k * 2.5133)]);
  ink(g, star, 0.8, silver);
  // Spiked choker with stitching, a D-ring, beaded chains and the NOT OKAY heart.
  const neck: Pt[] = [[38, 70], [64, 79], [92, 71]];
  layer(g, [T(neck, 7)], black, 2);
  const path = smooth(neck);
  for (let i = 4; i < path.length - 5; i += 3) {
    const a = path[i];
    const b = path[i + 1];
    ink(g, [[a[0], a[1] - 0.6], [b[0], b[1] - 0.6]], 0.7, 0x4a4b5e);
  }
  for (const f of [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82]) {
    const i = Math.round(f * (path.length - 1));
    const a = path[i - 1] ?? path[i];
    const b = path[i + 1] ?? path[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (b[1] - a[1]) / len;
    const ny = -(b[0] - a[0]) / len;
    const dir = ny > 0 ? 1 : -1;
    const [x, y] = path[i];
    layer(g, [P([[x - 1.9, y + 1], [x + 1.9, y + 1], [x + nx * dir * 6, y + 1 + ny * dir * 6]])], silver, 1);
    flat(g, [C(x - 0.4, y + 1.6, 0.6)], white);
  }
  chain(g, [[55, 77], [57, 83], [62, 85.5]]);
  chain(g, [[73, 77.5], [71, 83], [66, 85.5]]);
  layer(g, [C(64, 80.4, 2.3)], silver, 1);
  flat(g, [C(64, 80.4, 1.1)], black);
  layer(g, heart(64, 87, 4.9), black, 1.8);
  flat(g, [C(60.3, 83.6, 0.9)], white);
  for (const [x1, x2, y] of [[60.3, 61.3, 85.6], [62.8, 63.8, 85.6], [65.3, 67, 85.6], [59.8, 61.2, 88.2], [62.4, 63.4, 88.2], [64.6, 65.8, 88.2], [67, 68, 88.2]] as const) ink(g, [[x1, y], [x2, y]], 1, white);
  // Shaggy black fringe over the face: spiky edge, strands, a pink streak with a light core, a side strand and a loose lock over the collar.
  layer(g, [P([[41, 77], [34, 67], [30, 56], [28, 45], [28, 34], [31, 25], [37, 19], [44, 16], [47, 11], [52, 15], [57, 11], [60, 5], [64, 12], [69, 8], [72, 14], [77, 12], [79, 19], [83, 23], [80, 28], [81, 33], [76, 34], [77, 40], [71, 43], [72, 49], [65, 51], [63, 56], [59, 56], [57, 61], [52, 63], [55, 68], [50, 70], [52, 79], [47, 73]]),
    P([[43, 74], [50, 76], [48, 88], [44, 81]])], black);
  for (const line of [[[52, 16], [44, 30], [40, 50]], [[60, 14], [52, 28], [46, 48]], [[68, 13], [61, 26], [54, 42]]] as const) ink(g, line, 1, 0x3a3a4c);
  flat(g, [P([[46, 22], [56, 17], [52, 26]])], 0x2a2a38);
  flat(g, [P([[78, 22], [80, 29], [76, 37], [70, 47], [63, 56], [57, 67], [52, 80], [47, 72], [49, 60], [57, 45], [66, 31], [72, 24]])], pink);
  flat(g, [P([[75, 29], [72, 39], [66, 49], [60, 59], [56, 69], [57, 58], [63, 46], [70, 34]])], hot);
  flat(g, [P([[30, 45], [34, 41], [37, 55], [40, 69], [34, 63], [30, 55]])], pink);
  flat(g, [P([[33, 47], [35, 46], [37.5, 57], [35, 55]])], hot);
}
