import { COLORS } from '../../config/style';
import { C, E, P, R, T, Tpart, flat, heart, ink, layer, sparkle, type G, type Pt, type Shape } from './shapes';

interface CatLook {
  fur: number;
  inner: number;
  bodyW?: number;
  bodyH?: number;
  tail?: Pt[];
  tailW?: number;
}

const TAIL: Pt[] = [[48, 70], [47, 81], [52, 88], [60, 86], [63, 79]];

/** Shared top-down cat, seen from behind (96x96 canvas, facing UP): tail, body with four paws, head with ears. */
function cat(g: G, o: CatLook): void {
  const w = o.bodyW ?? 38;
  const h = o.bodyH ?? 44;
  const side = w / 2 + 1;
  layer(g, [T(o.tail ?? TAIL, o.tailW ?? 7)], o.fur);
  const paws: Shape[] = [E(48 - side, 66, 10, 14), E(48 + side, 66, 10, 14), E(48 - side - 1, 38, 10, 12), E(48 + side + 1, 38, 10, 12)];
  layer(g, [E(48, 55, w, h), ...paws], o.fur);
  layer(g, [E(48, 26, 38, 32), P([[32, 24], [27, 4], [46, 13]]), P([[64, 24], [69, 4], [50, 13]])], o.fur);
  flat(g, [P([[33, 19], [31, 9], [40, 14]]), P([[63, 19], [65, 9], [56, 14]])], o.inner);
}

/** Orange tabby. */
export function drawCatNormal(g: G): void {
  const fur = 0xf59a3c;
  const dark = 0xd9731a;
  const tail = TAIL;
  cat(g, { fur, inner: 0xf4a5a0, tail });
  flat(g, [Tpart(tail, 7, 0.25, 0.4), Tpart(tail, 7, 0.55, 0.7), Tpart(tail, 7, 0.85, 1)], dark);
  for (const [y, w] of [[46, 20], [55, 22], [64, 20]] as const) flat(g, [T([[48 - w / 2, y], [48, y + 3], [48 + w / 2, y]], 4)], dark);
  for (const x of [44, 48, 52]) ink(g, [[x, 13], [x, x === 48 ? 21 : 19]], 2.6, dark);
  // Lovestruck: the eyes ARE hearts (no eye whites), huge pink hearts that overflow the head a bit.
  for (const x of [33, 63]) {
    layer(g, heart(x, 27, 11), 0xff3d71, 1.8);
    flat(g, [C(x - 4.2, 21.5, 2.2)], 0xffffff);
  }
}

/** Fat cat: huge round grey blob with a small head bump, tiny paws and a stub tail. */
export function drawCatFat(g: G): void {
  const fur = 0x8f9096;
  layer(g, [T([[48, 78], [47, 85], [51, 90]], 6)], fur);
  layer(g, [E(11, 36, 10, 12), E(85, 36, 10, 12), E(23, 75, 12, 9), E(73, 75, 12, 9)], 0x7d7e84);
  layer(g, [E(48, 49, 80, 66), E(48, 15, 42, 22), P([[32, 16], [29, 3], [44, 10]]), P([[64, 16], [67, 3], [52, 10]])], fur);
  flat(g, [P([[34, 12], [33, 7], [40, 10]]), P([[62, 12], [63, 7], [56, 10]])], 0x7d7e84);
}

/** Ninja cat: black, purple headband with flying ribbons, two katanas crossed on the back. */
export function drawCatNinja(g: G): void {
  const fur = 0x2e3040;
  const purple = 0x7a4fb5;
  cat(g, { fur, inner: 0x5a4a78, bodyW: 34, bodyH: 50 });
  // Katanas: scabbards crossed over the back, hilts above the shoulders.
  layer(g, [T([[33, 35], [68, 80]], 5)], 0x4b4f66, 2.5);
  layer(g, [T([[63, 38], [36, 78]], 4)], 0x5a4590, 2.5);
  layer(g, [T([[31, 33], [35, 38]], 5)], 0x8b5a2b, 2.5);
  flat(g, [C(37, 40, 2.2)], COLORS.gold);
  // Headband and ribbons.
  layer(g, [P([[64, 24], [80, 19], [93, 25], [80, 28]]), P([[64, 28], [79, 32], [90, 40], [76, 35]])], purple, 2.5);
  layer(g, [T([[34, 25], [48, 28], [62, 25]], 6)], purple, 2.5);
}

/** Kamikaze cat: white, red bandana, paws up, dynamite with a lit fuse. */
export function drawCatKamikaze(g: G): void {
  const fur = 0xf7f7f7;
  cat(g, { fur, inner: 0xf4b6b6, tail: [[48, 78], [48, 86], [47, 92]], tailW: 6 });
  // Paws raised beside the head and little panic lines.
  layer(g, [E(24, 24, 10, 15), E(72, 24, 10, 15)], fur);
  for (const [x, y, dx] of [[16, 14, -1], [16, 22, -1], [80, 14, 1], [80, 22, 1]] as const) ink(g, [[x, y], [x + dx * 5, y - 3]], 1.8);
  // Bandana with a knot at the back of the head.
  layer(g, [P([[46, 34], [40, 45], [47, 42]]), P([[50, 34], [56, 45], [49, 42]]), C(48, 34, 4)], COLORS.red, 2.5);
  layer(g, [T([[33, 26], [48, 29], [63, 26]], 6)], COLORS.red, 2.5);
  // Dynamite bundle strapped to the back.
  for (const x of [39, 47, 55]) layer(g, [R(x - 3.5, 50, 7, 24, 1.5)], 0xd33a3a, 1.8);
  flat(g, [T([[33, 55], [63, 55]], 3.2), T([[33, 68], [63, 68]], 3.2)], 0x33333f);
  ink(g, [[47, 50], [50, 43], [54, 40]], 2);
  sparkle(g, 55, 38, 5, 0xffe066);
  flat(g, [C(55, 38, 2.4)], 0xff9a1f);
}

/** Flying cat: blue-grey, white wings, a ball of yarn on its head. */
export function drawCatFlying(g: G): void {
  const wing = 0xf5f8ff;
  const right: Pt[] = [[60, 44], [76, 36], [93, 37], [88, 42], [95, 46], [87, 51], [92, 56], [82, 56], [86, 62], [72, 58], [62, 58]];
  const left: Pt[] = right.map(([x, y]) => [96 - x, y]);
  layer(g, [P(right), P(left)], wing, 2.5);
  for (const [x1, y1, x2, y2] of [[66, 46, 88, 44], [66, 51, 88, 52], [66, 55, 82, 58]] as const) {
    ink(g, [[x1, y1], [x2, y2]], 1.2, 0xaebbd6);
    ink(g, [[96 - x1, y1], [96 - x2, y2]], 1.2, 0xaebbd6);
  }
  cat(g, { fur: 0x8fa6c9, inner: 0xc9d6ee, bodyW: 32, bodyH: 46 });
  layer(g, [C(48, 12, 8)], 0xf26b9a, 2.5);
  for (const pts of [[[42, 9], [50, 7]], [[41, 13], [53, 9]], [[43, 17], [54, 13]]] as Pt[][]) ink(g, pts, 1.4, 0xc94479);
  ink(g, [[56, 12], [62, 9], [66, 11]], 1.6, 0xf26b9a);
}
