/** @file The difficulty cat's face (96x96 canvas, same flat shapes and thick navy outline as the game's cats): a happy kitten, the orange tabby, an angry tabby, a horned nightmare cat. */
import { DIFFICULTY_CAT, type DifficultyId } from '../../config/difficulty';
import { COLORS } from '../../config/style';
import { C, E, P, flat, ink, layer, type G } from './shapes';

const NAVY = COLORS.navy;
const WHITE = COLORS.white;
const PINK_TONGUE = 0xff6b81;
const HORN = COLORS.red;
const NIGHT_EYE = 0xffe14d;

/** One whisker: a navy stroke with a thin white one on top, so it shows on the fur and on the dark menu alike. */
function whisker(g: G, pts: readonly (readonly [number, number])[]): void {
  ink(g, pts, 3.4, NAVY);
  ink(g, pts, 1.5, WHITE);
}

/** Draws the face of a difficulty. The head is centered on (48, 56); ears and horns reach up to y 4, the chin down to y 89. */
export function drawDifficultyFace(g: G, id: DifficultyId): void {
  const L = DIFFICULTY_CAT.looks[id];
  const night = id === 'nightmare';

  // Horns first (the head covers their feet), then head with both ears, the inside of the ears and the tabby stripes.
  if (night) layer(g, [P([[36, 30], [32, 4], [47, 25]]), P([[60, 30], [64, 4], [49, 25]])], HORN);
  layer(g, [E(48, 56, 78, 66), P([[14, 46], [11, 9], [39, 29]]), P([[82, 46], [85, 9], [57, 29]])], L.fur);
  flat(g, [P([[17, 40], [15, 19], [32, 31]]), P([[79, 40], [81, 19], [64, 31]])], L.inner);
  for (const x of [42, 48, 54]) ink(g, [[x, 25], [x, x === 48 ? 36 : 33]], 2.6, L.dark);
  for (const [y1, y2] of [[52, 54], [60, 59]] as const) {
    ink(g, [[10, y1], [20, y2]], 2.4, L.dark);
    ink(g, [[86, y1], [76, y2]], 2.4, L.dark);
  }
  if (L.blush !== null) flat(g, [C(21, 63, 5), C(75, 63, 5)], L.blush);

  // Muzzle, whiskers, nose.
  flat(g, [E(48, 67, 30, 20)], L.muzzle);
  for (const side of [-1, 1] as const) {
    const x = (dx: number): number => 48 + side * dx;
    whisker(g, [[x(24), 64], [x(38), 58]]);
    whisker(g, [[x(24), 68], [x(44), 68]]);
    whisker(g, [[x(24), 72], [x(38), 78]]);
  }
  layer(g, [P([[44, 58], [52, 58], [48, 63]])], L.nose, 1.4);

  // Mouth.
  if (id === 'easy') {
    layer(g, [E(48, 71.5, 13, 10)], NAVY, 1.2);
    flat(g, [E(48, 74, 8, 4.5)], PINK_TONGUE);
    ink(g, [[48, 63], [48, 67]], 1.8);
  } else if (id === 'normal') {
    ink(g, [[48, 63], [48, 68]], 1.8);
    ink(g, [[40, 68], [44, 72], [48, 68]], 2.2);
    ink(g, [[48, 68], [52, 72], [56, 68]], 2.2);
  } else if (id === 'hard') {
    ink(g, [[38, 74], [48, 67], [58, 74]], 2.6);
    layer(g, [P([[42.5, 69], [47, 68.5], [44, 76]]), P([[53.5, 69], [49, 68.5], [52, 76]])], WHITE, 1.2);
  } else {
    layer(g, [E(48, 71, 34, 16)], 0x2a0f1f, 1.6);
    for (const x of [37, 43.5, 52.5, 59]) {
      const top = x === 37 || x === 59 ? 66 : 64.5;
      flat(g, [P([[x - 3, top], [x + 3, top], [x, top + 7]])], WHITE);
    }
    flat(g, [P([[41, 78.5], [45, 78.5], [43, 73.5]]), P([[51, 78.5], [55, 78.5], [53, 73.5]])], WHITE);
  }

  // Eyes (last, so the angry lids sit on top of the forehead).
  for (const side of [-1, 1] as const) {
    const x = 48 + side * 14; // 34 and 62
    const inward = -side; // the way toward the nose
    if (id === 'easy') {
      ink(g, [[x - 8, 50], [x, 41], [x + 8, 50]], 3.8);
    } else if (id === 'normal') {
      layer(g, [E(x, 48, 16, 19)], WHITE, 2);
      flat(g, [C(x + 0.5, 49.5, 5.4)], NAVY);
      flat(g, [C(x - 1.5, 46.5, 2)], WHITE);
    } else if (id === 'hard') {
      layer(g, [E(x, 50, 16, 13)], WHITE, 2);
      flat(g, [C(x + inward * 1.5, 52, 4.4)], NAVY);
      flat(g, [C(x + inward * 1.5 - 1.2, 50.6, 1.5)], WHITE);
      // The angry lid: the fur comes down over the inner top of the eye.
      flat(g, [P([[x - inward * 12, 36], [x + inward * 12, 36], [x + inward * 12, 51]])], L.fur);
      ink(g, [[x - inward * 12, 36], [x + inward * 12, 51]], 3.4);
    } else {
      g.fillStyle(0xff3030, 0.3).fillCircle(x, 50, 13);
      layer(g, [E(x, 50, 16, 14)], NIGHT_EYE, 2);
      layer(g, [E(x, 50, 3.6, 13)], NAVY, 0.6);
      flat(g, [P([[x - inward * 12, 34], [x + inward * 12, 34], [x + inward * 12, 51]])], L.fur);
      ink(g, [[x - inward * 12, 34], [x + inward * 12, 51]], 3.6);
    }
  }

  // Greu: an anger mark on the forehead (four little corners, red).
  if (id === 'hard') {
    for (const sx of [-1, 1] as const) {
      for (const sy of [-1, 1] as const) ink(g, [[77 + sx * 4.5, 20 + sy * 1.6], [77 + sx * 1.6, 20 + sy * 1.6], [77 + sx * 1.6, 20 + sy * 4.5]], 1.9, COLORS.red);
    }
  }
}
