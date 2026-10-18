import { COLORS } from '../../config/style';
import { C, E, P, R, S, T, flat, ink, layer, sparkle, type G, type Pt, type Shape } from './shapes';

/** Colors of one crow variant. */
export interface CrowLook {
  body: number;
  wing: number;
  /** Glossy highlight on feathers and body. */
  shine: number;
  /** Darker shade under the wings. */
  shade: number;
  bandana?: boolean;
  gold?: boolean;
}

export const CROW_NORMAL: CrowLook = { body: 0x2e2e3d, wing: 0x3d3d52, shine: 0x7a7aa3, shade: 0x22222e };
export const CROW_GOLD: CrowLook = { body: 0xf5c518, wing: 0xffd84a, shine: 0xfff6bf, shade: 0xd99b0f, gold: true };
export const CROW_KAMIKAZE: CrowLook = { ...CROW_NORMAL, bandana: true };

/** How the wings are held. `spread` 1 = wide open, `sweep` pulls the tips back toward the tail (a dive). */
export interface CrowPose {
  spread: number;
  sweep: number;
}
export const POSE_OPEN: CrowPose = { spread: 0.92, sweep: 0 };
export const POSE_FLAP: CrowPose = { spread: 0.58, sweep: 0.2 };
export const POSE_FOLD: CrowPose = { spread: 0.3, sweep: 0.55 };

const CX = 64;

/** Move a point for the pose: squeeze toward the body line and sweep the tips back (up in the picture). */
function tf(pose: CrowPose, [x, y]: Pt): Pt {
  const dx = x - CX;
  return [CX + dx * pose.spread, y - Math.abs(dx) * pose.sweep * 0.55];
}
const tfAll = (pose: CrowPose, pts: readonly Pt[]): Pt[] => pts.map((p) => tf(pose, p));
const mirror = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [128 - x, y] as Pt);

/** Feather tips for the LEFT wing (open pose): root near the shoulder, tip out and toward the tail. */
const FEATHERS: ReadonlyArray<{ root: Pt; mid: Pt; tip: Pt }> = [
  { root: [44, 58], mid: [24, 62], tip: [3, 64] },
  { root: [44, 56], mid: [26, 52], tip: [5, 48] },
  { root: [45, 54], mid: [30, 44], tip: [10, 33] },
  { root: [46, 52], mid: [34, 39], tip: [19, 22] },
  { root: [48, 50], mid: [39, 36], tip: [31, 15] },
];

/** One wing (left; the right one is its mirror image). Returns the outline-and-fill shapes and the highlight shapes. */
function wing(pose: CrowPose, flip: boolean): { base: Shape[]; light: Shape[] } {
  const place = (pts: readonly Pt[]): Pt[] => tfAll(pose, flip ? mirror(pts) : pts);
  const base: Shape[] = [
    // Covert feathers: the rounded part of the wing near the body.
    S(place([[56, 46], [46, 70], [28, 76], [12, 70], [10, 58], [30, 46]])),
  ];
  const light: Shape[] = [];
  for (const f of FEATHERS) {
    const pts = place([f.root, f.mid, f.tip]);
    base.push(T(pts, 10, 4.5));
    light.push(T(place([[f.root[0] - 2, f.root[1] - 1], [f.mid[0], f.mid[1] - 1], [f.tip[0] + (flip ? -3 : 3), f.tip[1] + 1]]), 2.1, 1));
  }
  light.push(T(place([[50, 52], [38, 62], [20, 68]]), 3, 1.6)); // sheen over the coverts
  return { base, light };
}

/**
 * Crow seen from above, diving head-down (128x128 canvas): fanned tail, glossy body, round head with a heavy beak,
 * wings with splayed finger feathers. Same flat look as the cats: navy outline, flat fills, a few highlights.
 * The pose changes how far the wings are spread, so 3 poses make a flap cycle plus a tucked dive.
 */
export function drawCrow(g: G, look: CrowLook, pose: CrowPose): void {
  const left = wing(pose, false);
  const right = wing(pose, true);

  // Tail: three feathers fanning out the back.
  const tail: Shape[] = [
    P([[56, 36], [66, 30], [40, 8]]),
    P([[72, 36], [62, 30], [88, 8]]),
    P([[58, 36], [70, 36], [64, 2]]),
  ];
  layer(g, tail, look.body);
  flat(g, [T([[64, 32], [64, 9]], 2.2, 1)], look.shine);

  // Wings go UNDER the body so the shoulders tuck in.
  layer(g, [...left.base, ...right.base], look.wing);
  flat(g, [...left.light, ...right.light], look.shine, 0.85);
  // Soft shade where the wing meets the body.
  flat(g, [E(CX - 15, 60, 10, 26), E(CX + 15, 60, 10, 26)], look.shade, 0.55);

  // Body and head.
  layer(g, [E(CX, 62, 36, 64)], look.body);
  flat(g, [E(CX - 7, 56, 7, 34)], look.shine, 0.3); // glossy back highlight
  flat(g, [E(CX + 9, 66, 6, 28)], look.shade, 0.4);
  layer(g, [C(CX, 92, 14)], look.body);
  flat(g, [E(CX - 6, 87, 8, 6)], look.shine, 0.45);

  // Bandana (kamikaze): knot and tails on the side, band around the neck.
  if (look.bandana) {
    layer(g, [P([[CX + 11, 78], [CX + 26, 70], [CX + 22, 84]]), P([[CX + 11, 80], [CX + 28, 82], [CX + 18, 92]])], COLORS.red, 2);
    layer(g, [R(CX - 17, 76, 34, 9, 4)], COLORS.red, 2.5);
    flat(g, [T([[CX - 13, 80], [CX + 12, 80]], 1.6)], 0xff8a8a);
  }

  // Beak: upper part with a lighter ridge.
  layer(g, [P([[CX - 8, 100], [CX + 8, 100], [CX, 124]])], 0xe0a030, 2.5);
  flat(g, [P([[CX - 3, 102], [CX + 1, 102], [CX - 1, 114]])], 0xffd37a);
  ink(g, [[CX, 103], [CX, 118]], 1.4);

  // Eyes: white with a pupil looking where it dives, and a grumpy brow.
  for (const dx of [-8, 8]) {
    layer(g, [C(CX + dx, 92, 4.8)], 0xffffff, 1.8);
    flat(g, [C(CX + dx * 0.85, 94, 2.3)], COLORS.navy);
    flat(g, [C(CX + dx * 0.85 - 0.8, 93, 0.8)], 0xffffff);
  }
  ink(g, [[CX - 14, 85], [CX - 4, 88]], 2.2);
  ink(g, [[CX + 14, 85], [CX + 4, 88]], 2.2);

  if (look.gold) {
    sparkle(g, 22, 24, 6);
    sparkle(g, 108, 30, 5);
    sparkle(g, 100, 104, 4);
  }
}

/** One loose feather, pointing up (16x36): light so it can be tinted dark or gold in code. */
export function drawFeather(g: G): void {
  layer(g, [S([[8, 2], [14, 14], [13, 28], [8, 34], [3, 28], [2, 14]])], 0xffffff, 1.6);
  flat(g, [T([[8, 5], [8, 33]], 1.4)], 0xb9bdd0);
  flat(g, [T([[8, 12], [12, 8]], 1), T([[8, 19], [12, 15]], 1), T([[8, 12], [4, 8]], 1), T([[8, 19], [4, 15]], 1)], 0xdadff0);
}
