/** @file Code-drawn Varu: body, belt, legs, and the body colors the touch button reuses. */
import { GOLD_BELT } from '../../config/animation';
import { COLORS } from '../../config/style';
import { C, E, P, R, S, T, flat, ink, layer, rod, type G, type Pt, type Shape } from './shapes';

export const SKIN = 0xf3c9a1;
export const DARK_BELT = 0x6b4423;

// Nike Tech Fleece set: deep red fleece, black piping on hem and cuffs, tonal seams.
export const FLEECE = 0xc42d34;
export const FLEECE_SHADE = 0x9c2229;
const JEANS = 0x3b5b92;
const JEANS_SEAM = 0x2c4673;
export const PIPING = 0x12151d;

/** One blue-jeans leg (same 128x128 canvas as the body, so the two line up). The game swings them while walking. */
function drawLeg(g: G, x: number): void {
  layer(g, [E(x, 111, 17, 16)], JEANS);
  ink(g, [[x, 105], [x, 115]], 1.4, JEANS_SEAM);
  ink(g, [[x - 6, 116], [x, 118.5], [x + 6, 116]], 2, JEANS_SEAM);
}

export const drawVaruLegL = (g: G): void => drawLeg(g, 55);
export const drawVaruLegR = (g: G): void => drawLeg(g, 73);

/**
 * The belt held up in the right hand (same canvas as the body). Hidden while the belt swings or flies.
 * `gold`: the golden belt, a gold strap coated in blobs of thick white goo with strands hanging off it.
 */
export function drawVaruBelt(g: G, gold = false): void {
  const loop = T([[104, 40], [99, 32], [92, 24], [84, 20], [80, 26], [83, 35], [91, 41], [99, 42]], 6);
  const strap = T([[104, 42], [111, 44], [115, 54], [116, 66]], 6);
  layer(g, [loop, strap], COLORS.belt, 2.5); // leather, also when golden
  flat(g, [T([[100, 32], [93, 25], [86, 21]], 1.6)], gold ? GOLD_BELT.goldShine : 0xb07a40);
  layer(g, [R(110, 63, 13, 15, 3)], COLORS.gold, 2.5);
  flat(g, [R(114, 67, 5, 7, 1)], gold ? GOLD_BELT.goldShade : DARK_BELT);
  if (gold) {
    // Goo: blobs on the loop, strands hanging off the loop and the buckle, a glob at the end.
    flat(g, [C(98, 26, 1.7), C(90, 22, 1.6), C(84, 27, 1.6), C(108, 47, 1.6), C(115, 57, 1.6)], GOLD_BELT.gold); // gold studs
    const blobs: Shape[] = [C(95, 29, 3.2), C(112, 50, 3), T([[88, 25], [87, 34]], 4, 2.8), C(87, 35.5, 3.4), T([[116, 78], [116, 88]], 4.4, 3), C(116, 89.5, 3.8)];
    layer(g, blobs, GOLD_BELT.gooBody, 1.8);
    flat(g, [C(96, 30, 1.2), C(87, 36, 1.1)], GOLD_BELT.gooShade);
    flat(g, [C(94, 27.5, 1.1), C(111, 48.5, 1)], COLORS.white);
  }
  layer(g, [C(104, 44, 7)], SKIN, 2.5); // the fist closes over the strap
}

/**
 * Left arm key points for the cigarette drag. Pose 0 = hanging at his side (the normal Varu),
 * pose 1 = the cigarette at his mouth. In between they are blended (the game uses 0, 0.5 and 1).
 */
const ARM_REST = { elbow: [28, 82], end: [27, 70], hand: [27, 65], tip: [14, 55], base: [36, 64], cuffA: [21.5, 74], cuffB: [33, 74] } as const;
const ARM_DRAG = { elbow: [37, 77], end: [52, 57], hand: [54, 52], tip: [45, 34], base: [62, 45], cuffA: [45, 56.8], cuffB: [54.2, 63.6] } as const;

const mix = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function leftArm(pose: number): { sleeve: Shape; hand: Pt; tip: Pt; base: Pt; cuffA: Pt; cuffB: Pt } {
  const at = (k: keyof typeof ARM_REST): Pt => mix(ARM_REST[k], ARM_DRAG[k], pose);
  return { sleeve: T([[44, 90], at('elbow'), at('end')], 11), hand: at('hand'), tip: at('tip'), base: at('base'), cuffA: at('cuffA'), cuffB: at('cuffB') };
}

/** Cigarette between two points: paper, filter at the `base` end, red tip. */
function drawCigarette(g: G, tip: Pt, base: Pt): void {
  layer(g, [T([tip, base], 6)], 0xfff3d6, 2);
  flat(g, [T([mix(tip, base, 0.64), base], 5)], 0xe0a060);
  flat(g, [C(tip[0], tip[1], 3)], COLORS.red);
}

/** Where the hood is: lying on his back (normal), halfway pushed back while he lifts the cigarette, or pulled up over his head (the bad pickup "emo"). */
export type HoodState = 'down' | 'half' | 'up';

/**
 * The EMO look, seen from behind: the hood is pulled up over his head and ears (a big rounded cowl of the same red fleece that drops
 * to his shoulders), so no blond hair shows. `half`: the cowl is bunched up on his shoulders and the top of his head shows (he is pushing it back
 * to smoke). The cowl is squashed toward its lower part instead of moved whole, so it never hangs below the hoodie.
 */
function drawCowl(g: G, half: boolean): void {
  const k = half ? 0.62 : 1; // squash of the cowl
  const dy = half ? 21 : 0; // and how far it slid down
  const at = (x: number, y: number): Pt => [x, 36 + dy + (y - 36) * k];
  const pts = (list: ReadonlyArray<readonly [number, number]>): Pt[] => list.map(([x, y]) => at(x, y));
  const cowl = S(pts([[64, 36], [77, 40], [85, 52], [87, 66], [82, 79], [73, 88], [64, 90], [55, 88], [46, 79], [41, 66], [43, 52], [51, 40]]));
  layer(g, [cowl], FLEECE);
  flat(g, [T(pts([[46, 81], [55, 88.5], [64, 90.5], [73, 88.5], [82, 81]]), 3.6 * k)], FLEECE_SHADE); // shaded fold where it meets the shoulders
  if (!half) flat(g, [E(...at(54, 50), 7, 13)], 0xe0545a); // a light patch on the upper left of the cowl
  ink(g, pts([[64, 39], [64, 85]]), 1.8, FLEECE_SHADE); // the seam down the middle
  ink(g, pts([[49, 46], [46, 56]]), 1.6, FLEECE_SHADE); // two folds where the cowl bunches up
  ink(g, pts([[79, 46], [82, 56]]), 1.6, FLEECE_SHADE);
}

/**
 * Varu seen from behind (128x128, facing UP, legs are separate textures): red tech-fleece hoodie, blond head, belt is its own texture, cigarette in the left.
 * `pose` is the cigarette drag: 0 = arm down, 1 = cigarette at his mouth (then the arm is drawn last, over the head).
 * `hood`: where the hood is (`up` = the EMO look, `half` = being pushed back for a drag).
 */
export function drawVaru(g: G, pose = 0, hood: HoodState = 'down'): void {
  const arm = leftArm(pose);
  const raised = pose > 0;
  // Body and both sleeves are one silhouette.
  const torso = S([[38, 86], [41, 75], [52, 69], [64, 68], [77, 71], [86, 80], [84, 97], [76, 106], [64, 108], [52, 106], [43, 102], [38, 95]]);
  layer(g, raised ? [torso, T([[78, 86], [94, 66], [103, 50]], 11)] : [torso, arm.sleeve, T([[78, 86], [94, 66], [103, 50]], 11)], FLEECE);

  // Black hem band along the bottom of the hoodie.
  ink(g, [[44, 98.5], [48, 102.5], [56, 105], [64, 105.5], [72, 105], [80, 102.5], [83, 98]], 4.6, PIPING);

  // Raglan seams (collar to underarm) and the yoke seam across the upper back.
  ink(g, [[53, 73], [46, 81], [41, 90]], 1.6, FLEECE_SHADE);
  ink(g, [[76, 73], [82, 80], [85, 89]], 1.6, FLEECE_SHADE);
  ink(g, [[46, 84], [56, 88], [64, 89], [72, 88], [81, 84]], 1.4, FLEECE_SHADE);

  // Black cuffs on both sleeves.
  if (!raised) flat(g, [P(rod(arm.cuffA[0], arm.cuffA[1], arm.cuffB[0], arm.cuffB[1], 2.8))], PIPING);
  flat(g, [P(rod(96, 50.5, 106, 56, 2.8))], PIPING);

  // Cigarette in the left hand (paper, filter, red tip).
  if (!raised) drawCigarette(g, arm.tip, arm.base);

  if (hood === 'down') {
    // Big fleece hood lying on the back: seam down the middle, shaded fold at the bottom.
    const hood = S([[43, 70], [48, 60], [64, 55], [80, 60], [85, 70], [83, 82], [75, 91], [64, 94], [53, 91], [45, 82]]);
    layer(g, [hood], FLEECE);
    flat(g, [T([[50, 86], [57, 91], [64, 92.5], [71, 91], [78, 86]], 3.2)], FLEECE_SHADE);
    ink(g, [[64, 76], [64, 90]], 1.8, FLEECE_SHADE);
  }

  if (hood !== 'up') {
    // Head, ears.
    layer(g, [E(46, 61, 7, 11), E(82, 61, 7, 11)], SKIN, 2.5);
    layer(g, [C(64, 59, 17)], COLORS.blond);
    ink(g, [[60, 44], [57, 52], [60, 60]], 1.8);
    ink(g, [[66, 44], [67, 52], [73, 58]], 1.8);
    ink(g, [[53, 50], [51, 57]], 1.8);
    ink(g, [[56, 42], [53, 40]], 2);
  }
  if (hood !== 'down') drawCowl(g, hood === 'half'); // over the head: all of it, or bunched up on his shoulders

  // Raised arm: drawn over the head, with its cuff, the cigarette and the hand.
  if (raised) {
    layer(g, [arm.sleeve], FLEECE);
    flat(g, [P(rod(arm.cuffA[0], arm.cuffA[1], arm.cuffB[0], arm.cuffB[1], 2.8))], PIPING);
    drawCigarette(g, arm.tip, arm.base);
  }

  // Hands on top.
  layer(g, [C(arm.hand[0], arm.hand[1], 6.5)], SKIN, 2.5);
  layer(g, [C(104, 44, 7)], SKIN, 2.5);
}
