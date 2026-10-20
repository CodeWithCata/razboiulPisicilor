/** @file Code-drawn Pisica Federer (128x128, facing up): the body plus the loose layers FedererRig moves (racket arm, racket, tail, feet). */
import { C, E, P, S, T, Tpart, ellipsePts, flat, ink, layer, type G, type Pt } from './shapes';

const CREAM = 0xf0d9a8;
const TAN = 0xd9a864;

/** Where the loose layers pivot, in texture px. `FedererRig` reads these, so art and animation can never drift apart. */
export const FEDERER_SHOULDER = { x: 92, y: 70 } as const;
export const FEDERER_PAW = { x: 106, y: 47 } as const;
/** The racket's sweet spot (the middle of the strings) and the held ball's resting place (left paw). */
export const FEDERER_RACKET_HEAD = { x: 109, y: 21 } as const;
export const FEDERER_BALL_HAND = { x: 18, y: 41 } as const;
export const FEDERER_TAIL_ROOT = { x: 66, y: 100 } as const;

const TAIL: readonly Pt[] = [[66, 100], [70, 111], [82, 119], [92, 112]];

/** The body: cream cat in a white polo and headband, left paw raised (the tennis ball is a loose image above it). Racket arm, tail and feet are separate layers. */
export function drawBossFederer(g: G): void {
  // Polo shirt with the left sleeve (the right sleeve belongs to the racket arm layer).
  layer(g, [E(64, 88, 64, 54)], CREAM);
  const polo: Pt[] = [[34, 61], [64, 57], [94, 61], [98, 80], [90, 92], [64, 95], [38, 92], [30, 80]];
  layer(g, [S(polo), T([[36, 70], [26, 64], [24, 55]], 12)], 0xffffff);
  layer(g, [T([[50, 64], [64, 70], [78, 64]], 5)], 0xffffff, 2);
  flat(g, [T([[78, 76], [87, 76]], 3)], 0x3fa35a);
  layer(g, [C(24, 51, 6.5)], CREAM, 2.5);
  // Head, ears, headband.
  layer(g, [E(64, 44, 44, 38), P([[46, 36], [42, 19], [60, 28]]), P([[82, 36], [86, 19], [68, 28]])], CREAM);
  flat(g, [E(76, 37, 13, 11), P([[74, 29], [83, 23], [84, 32]])], TAN);
  flat(g, [P([[47, 32], [45, 24], [54, 28]])], 0xf5c6c6);
  layer(g, [T([[47, 45], [64, 48], [81, 45]], 6)], 0xffffff, 2.5);
}

/** The racket arm: white sleeve and a paw, ending where the racket grips (FEDERER_PAW). Pivots on FEDERER_SHOULDER. */
export function drawFedererArm(g: G): void {
  layer(g, [T([[92, 70], [102, 62], [106, 52]], 12)], 0xffffff);
  layer(g, [C(FEDERER_PAW.x, FEDERER_PAW.y, 7)], CREAM, 2.5);
  // Hides the outline where the sleeve joins the polo (the polo is white too).
  flat(g, [C(FEDERER_SHOULDER.x, FEDERER_SHOULDER.y, 5.5)], 0xffffff);
}

/** The racket (tilted a little), handle ending at FEDERER_PAW: the layer pivots there, so a wrist flick turns the racket and not the arm. */
export function drawFedererRacket(g: G): void {
  const rot = 0.12;
  const rp = (lx: number, ly: number): Pt => [109 + lx * Math.cos(rot) - ly * Math.sin(rot), 21 + lx * Math.sin(rot) + ly * Math.cos(rot)];
  layer(g, [T([rp(0, 14), [106, 49]], 5)], 0x6b4423, 2.5);
  layer(g, [P(ellipsePts(FEDERER_RACKET_HEAD.x, FEDERER_RACKET_HEAD.y, 12, 17, rot))], 0xb08d57, 2.5);
  layer(g, [P(ellipsePts(FEDERER_RACKET_HEAD.x, FEDERER_RACKET_HEAD.y, 8.5, 13.5, rot))], 0xf6f2e4, 1.2);
  for (const u of [-5, 0, 5]) {
    const k = 12.5 * Math.sqrt(1 - (u / 8.5) ** 2);
    ink(g, [rp(u, -k), rp(u, k)], 0.9, 0x9a8f7a);
    const j = 8 * Math.sqrt(1 - ((u * 1.4) / 13.5) ** 2);
    ink(g, [rp(-j, u * 1.4), rp(j, u * 1.4)], 0.9, 0x9a8f7a);
  }
}

/** The striped tail, pivoting on FEDERER_TAIL_ROOT. */
export function drawFedererTail(g: G): void {
  layer(g, [T(TAIL, 9)], CREAM);
  flat(g, [Tpart(TAIL, 9, 0.45, 0.58), Tpart(TAIL, 9, 0.75, 0.88)], TAN);
}

/** Her feet, one layer each: they step forward and back in turn while she walks and hop on their toes while she waits. */
export function drawFedererFootL(g: G): void {
  layer(g, [E(44, 104, 14, 16)], CREAM);
}

export function drawFedererFootR(g: G): void {
  layer(g, [E(84, 104, 14, 16)], CREAM);
}
