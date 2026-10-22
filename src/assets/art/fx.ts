/** @file Code-drawn floor and shield effects in the cartoon style (navy outline, shine, little sparkles): tear puddle, the big scream flood, bubble shields (queen, emo), magic floor ring, shockwave ring, carpet pad, dust puff and teardrop. */
import { C, NAVY, P, S, T, flat, layer, sparkle, type G, type Pt } from './shapes';
import { poly } from '../paint';

/** Where the visible edge of each round picture sits (texture px from its center), so code can scale it to a game radius: scale = radius / R. */
export const FX_BUBBLE_R = 120;
export const FX_RING_R = 120;
export const FX_SHOCK_R = 120;
/** Width of the water of the puddle picture (texture px), without its dark lip: scale = wantedWidth / this. */
export const FX_PUDDLE_W = 114;
/** The scream flood picture: its square size and the width of its water (texture px), so code can scale it to a game radius: scale = 2 * radius / FX_FLOOD_W. */
export const FX_FLOOD_SIZE = 400;
export const FX_FLOOD_W = 352;
/** Radius of the carpet pad and of the dust puff pictures. */
export const FX_PAD_R = 34;
export const FX_PUFF_R = 24;

const TAU = Math.PI * 2;
const deg = (d: number): number => (d * Math.PI) / 180;

/** Points along an arc (angles in radians, 0 = right, clockwise on screen). */
function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 20): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** A stroked polyline with real alpha (the toolkit's `flat` ignores alpha). */
function line(g: G, pts: readonly Pt[], width: number, color: number, alpha = 1): void {
  g.lineStyle(width, color, alpha).strokePoints(poly(pts), false);
}

/** A stroked arc with round ends. */
function arcRound(g: G, cx: number, cy: number, r: number, a0: number, a1: number, width: number, color: number): void {
  line(g, arcPts(cx, cy, r, a0, a1), width, color, 1);
  g.fillStyle(color, 1).fillCircle(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, width / 2).fillCircle(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, width / 2);
}

/** Scales a closed blob around a point. */
const scaled = (pts: readonly Pt[], cx: number, cy: number, k: number): Pt[] => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);

// ---- tear puddle (160x112) ---------------------------------------------------------------------------------------------

const WATER = 0x7ad0ff;
const WATER_DEEP = 0x3f94d6;
const WATER_LIGHT = 0xb9ebff;
const WATER_FOAM = 0xeaf9ff;

/** v180: how flat the puddle is (1 = the old fat blob). Thin lip, thin outline, squashed height: a film of water, not a bathtub. */
const PUDDLE_FLAT = 0.62;
const PUDDLE_LIP = 2;
const PUDDLE_OUTLINE = 2;
/** A texture y of the old drawing, squashed toward the puddle's middle line (y = 56). */
const fy = (y: number): number => 56 + (y - 56) * PUDDLE_FLAT;

/** A cartoon puddle seen from above: a flat wobbly blob with a thin dark lip underneath, a lighter middle, ripple rings, shine streaks, two bubbles. */
export function drawFxPuddle(g: G): void {
  const blob: Pt[] = [[24, 56], [29, 38], [48, 24], [70, 22], [86, 15], [110, 22], [130, 38], [138, 56], [129, 74], [106, 86], [85, 82], [62, 91], [38, 83], [28, 71]].map(([x, y]): Pt => [x, fy(y)]);
  layer(g, [S(blob.map(([x, y]): Pt => [x, y + PUDDLE_LIP]))], WATER_DEEP, PUDDLE_OUTLINE); // the lip: just a sliver of thickness
  layer(g, [S(blob)], WATER, PUDDLE_OUTLINE);
  flat(g, [S(scaled(blob, 80, 56, 0.74))], WATER_LIGHT);
  flat(g, [S(scaled(blob, 80, 56, 0.4))], WATER_FOAM);
  // Ripples spreading from the middle.
  g.lineStyle(2.5, 0xffffff, 0.85).strokeEllipse(81, 56, 44, 44 * PUDDLE_FLAT * 0.55);
  g.lineStyle(2, 0xffffff, 0.55).strokeEllipse(81, 56, 76, 76 * PUDDLE_FLAT * 0.55);
  // Shine streaks up on the left and a little glint.
  flat(g, [T([[36, fy(50)], [42, fy(42)], [56, fy(36)]], 3.6)], 0xffffff);
  flat(g, [T([[100, fy(70)], [108, fy(66)], [118, fy(58)]], 2.8)], 0xffffff);
  sparkle(g, 52, fy(50), 6);
  // Two bubbles.
  layer(g, [C(112, fy(44), 4.6)], WATER_FOAM, 1.6);
  flat(g, [C(110.8, fy(43), 1.3)], 0xffffff);
  layer(g, [C(62, fy(72), 3.2)], WATER_FOAM, 1.6);
}

// ---- scream flood (400x400) ----------------------------------------------------------------------------------------------

/** The edge of the flood: nearly a circle (it has to cover the pink scream ring), with slow wobbly bumps. Texture px from the middle. */
function floodEdge(grow: number): Pt[] {
  const c = FX_FLOOD_SIZE / 2;
  const r0 = FX_FLOOD_W / 2;
  const out: Pt[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    const k = 1 + 0.035 * Math.sin(a * 3 + 1) + 0.025 * Math.sin(a * 5 + 2.2);
    out.push([c + Math.cos(a) * (r0 * k + grow), c + Math.sin(a) * (r0 * k + grow)]);
  }
  return out;
}

/** The whole floor around the screaming emo cat turned into one big flat puddle: thin lip, pale shallows toward the middle, ripple rings, shine streaks, sparkles and a few bubbles. */
export function drawFxFlood(g: G): void {
  const c = FX_FLOOD_SIZE / 2;
  const edge = floodEdge(0);
  layer(g, [S(edge.map(([x, y]): Pt => [x, y + PUDDLE_LIP + 1]))], WATER_DEEP, PUDDLE_OUTLINE);
  layer(g, [S(edge)], WATER, PUDDLE_OUTLINE);
  flat(g, [S(scaled(edge, c, c, 0.82))], WATER_LIGHT, 0.55);
  flat(g, [S(scaled(edge, c, c, 0.5))], WATER_LIGHT, 0.7);
  // Rings spreading from where he stands.
  for (const [k, w, a] of [[0.3, 4, 0.8], [0.58, 3.5, 0.6], [0.86, 3, 0.45]] as const) g.lineStyle(w, 0xffffff, a).strokeCircle(c, c, (FX_FLOOD_W / 2) * k);
  // Foam where the edge meets the floor: short arcs just inside the rim.
  for (let i = 0; i < 7; i++) {
    const a0 = deg(18 + i * 51);
    arcRound(g, c, c, FX_FLOOD_W / 2 - 12, a0, a0 + deg(17), 3.4, WATER_FOAM);
  }
  // Shine streaks (upper left, lower right), glints and bubbles.
  flat(g, [T([[c - 112, c - 62], [c - 94, c - 86], [c - 62, c - 108]], 7)], 0xffffff);
  flat(g, [T([[c + 78, c + 96], [c + 98, c + 82], [c + 120, c + 56]], 5.5)], 0xffffff);
  sparkle(g, c - 70, c - 40, 10);
  sparkle(g, c + 92, c - 52, 8);
  sparkle(g, c + 30, c + 112, 7);
  for (const [x, y, r] of [[c + 62, c - 96, 7], [c - 98, c + 52, 5.5], [c + 112, c + 20, 4.5], [c - 30, c + 100, 4]] as const) {
    layer(g, [C(x, y, r)], WATER_FOAM, 1.8);
    flat(g, [C(x - r * 0.3, y - r * 0.3, r * 0.28)], 0xffffff);
  }
}

// ---- bubble shields (256x256) --------------------------------------------------------------------------------------------

interface BubbleLook {
  fill: number;
  fillAlpha: number;
  glow: number;
  rim: number;
  /** Little accent arcs on the rim (soap-bubble colors, or royal gold). */
  accents: readonly number[];
  lattice: number | null;
  sparkles: number;
  /** Small bubbles inside (x, y, radius), drawn when given. */
  inner: ReadonlyArray<readonly [number, number, number]>;
}

function drawBubble(g: G, look: BubbleLook): void {
  const c = 128;
  const R = FX_BUBBLE_R;
  g.fillStyle(look.fill, look.fillAlpha).fillCircle(c, c, R - 2);
  // The glow gathers near the rim and fades toward the middle, like a real bubble.
  for (let k = 0; k < 10; k++) g.lineStyle(4.6, look.glow, 0.36 * (1 - k / 10)).strokeCircle(c, c, R - 5 - k * 4.4);
  // A honeycomb of shield cells (queen only).
  if (look.lattice !== null) {
    const s = 21;
    for (let row = -7; row <= 7; row++) {
      for (let col = -8; col <= 8; col++) {
        const hx = c + s * Math.sqrt(3) * (col + row / 2);
        const hy = c + s * 1.5 * row;
        if (Math.hypot(hx - c, hy - c) > R - s - 6) continue;
        const pts: Pt[] = [];
        for (let i = 0; i < 6; i++) pts.push([hx + Math.cos(deg(30 + i * 60)) * s * 0.9, hy + Math.sin(deg(30 + i * 60)) * s * 0.9]);
        g.lineStyle(2, look.lattice, 0.34).strokePoints(poly(pts), true);
      }
    }
  }
  // Small bubbles inside.
  for (const [x, y, r] of look.inner) {
    g.fillStyle(look.rim, 0.22).fillCircle(x, y, r);
    g.lineStyle(2.2, look.rim, 0.85).strokeCircle(x, y, r);
    arcRound(g, x, y, r * 0.62, deg(200), deg(255), 2.4, 0xffffff);
  }
  // Outline and rim.
  g.lineStyle(7, NAVY, 0.85).strokeCircle(c, c, R);
  g.lineStyle(3.6, look.rim, 1).strokeCircle(c, c, R);
  // Colored accent arcs just inside the rim.
  look.accents.forEach((color, i) => {
    const a0 = deg(10 + i * (320 / look.accents.length));
    arcRound(g, c, c, R - 9, a0, a0 + deg(34), 4, color);
  });
  // Glare: a long crescent, a short one and a dot, top-left; a soft reflection bottom-right.
  arcRound(g, c, c, R - 17, deg(196), deg(256), 9, 0xffffff);
  arcRound(g, c, c, R - 17, deg(266), deg(282), 9, 0xffffff);
  g.fillStyle(0xffffff, 1).fillCircle(c + Math.cos(deg(184)) * (R - 17), c + Math.sin(deg(184)) * (R - 17), 4.8);
  line(g, arcPts(c, c, R - 15, deg(18), deg(66)), 5, look.rim, 0.6);
  // Sparkles on the glass.
  const spots: ReadonlyArray<readonly [number, number, number]> = [[96, 70, 9], [176, 176, 7], [190, 104, 6], [78, 168, 6]];
  for (const [x, y, s] of spots.slice(0, look.sparkles)) sparkle(g, x, y, s, 0xffffff);
}

/** The queen's shield (her elite guards are alive): royal cyan glass with a gold rim and a honeycomb of cells. */
export function drawFxBubbleQueen(g: G): void {
  drawBubble(g, { fill: 0x9be7ff, fillAlpha: 0.16, glow: 0x6fd3ff, rim: 0xffe08a, accents: [0xffd166, 0xffffff, 0xffd166, 0xffffff, 0xffd166], lattice: 0xffe9a8, sparkles: 4, inner: [] });
}

/** The emo cat's hiding bubble: a soapy lavender bubble with rainbow edges and little bubbles inside. */
export function drawFxBubbleEmo(g: G): void {
  drawBubble(g, {
    fill: 0xb9c4ff, fillAlpha: 0.22, glow: 0x8aa0ff, rim: 0xe3e8ff,
    accents: [0xff9bd2, 0x9fe8ff, 0xc9a8ff, 0xff9bd2, 0x9fe8ff],
    lattice: null, sparkles: 3,
    inner: [[170, 168, 11], [188, 150, 6], [84, 178, 7]],
  });
}

// ---- magic floor ring (256x256), shockwave ring (256x256) -------------------------------------------------------------

/** Gold magic circle on the floor: glowing rim, a dashed inner ring, a few stars. The spin and the scepter use it. */
export function drawFxRing(g: G): void {
  const c = 128;
  const R = FX_RING_R;
  const GOLD = 0xffd166;
  const CREAM = 0xfff3c4;
  g.fillStyle(0xffd166, 0.1).fillCircle(c, c, R - 3);
  for (let k = 0; k < 9; k++) g.lineStyle(5, 0xffe08a, 0.2 * (1 - k / 9)).strokeCircle(c, c, R - 6 - k * 5);
  g.lineStyle(8, NAVY, 0.8).strokeCircle(c, c, R - 2);
  g.lineStyle(4, GOLD, 1).strokeCircle(c, c, R - 2);
  g.lineStyle(2, GOLD, 0.7).strokeCircle(c, c, R - 30);
  // Stars between the rings.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + deg(30);
    sparkle(g, c + Math.cos(a) * (R - 44), c + Math.sin(a) * (R - 44), 9, CREAM);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.fillStyle(GOLD, 0.9).fillCircle(c + Math.cos(a) * (R - 44), c + Math.sin(a) * (R - 44), 3);
  }
}

/** A white shockwave ring with a navy edge and a soft inner fade (tinted by code per attack). */
export function drawFxShock(g: G): void {
  const c = 128;
  const R = FX_SHOCK_R;
  g.fillStyle(0xffffff, 0.12).fillCircle(c, c, R - 6);
  for (let k = 0; k < 10; k++) g.lineStyle(5.5, 0xffffff, 0.34 * (1 - k / 10)).strokeCircle(c, c, R - 14 - k * 5);
  g.lineStyle(13, NAVY, 0.9).strokeCircle(c, c, R - 6);
  g.lineStyle(7, 0xffffff, 1).strokeCircle(c, c, R - 6);
  line(g, arcPts(c, c, R - 6, deg(200), deg(250)), 3, 0xdbe6ff, 1);
}

// ---- carpet pad (80x80), dust puff (64x64), teardrop (16x24) --------------------------------------------------------------

/** One piece of the red carpet she leaves while charging: a plush red rosette with a gold stitched border and a gold star. */
export function drawFxCarpetPad(g: G): void {
  const c = 40;
  layer(g, [C(c, c, FX_PAD_R - 3)], 0xc1121f, 2.5, 0x5e0710);
  g.lineStyle(4, 0x9c0e1b, 1).strokeCircle(c, c, 24);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    line(g, arcPts(c, c, 28.5, a, a + 0.2, 4), 3, 0xffd166, 1);
  }
  line(g, arcPts(c, c, 18, deg(190), deg(250), 8), 4, 0xe8404f, 1); // light from the top-left
  sparkle(g, c, c, 9, 0xffd166);
  g.fillStyle(0xffd166, 1).fillCircle(c, c, 2.4);
}

/** A cartoon dust cloud (white, tinted by code): five round puffs merged into one outlined silhouette. */
export function drawFxPuff(g: G): void {
  layer(g, [C(32, 36, 14), C(19, 38, 10), C(45, 38, 11), C(28, 26, 10), C(40, 27, 8.5)], 0xffffff, 2.5, 0x6b6b88);
  flat(g, [C(26, 24, 3.2), C(36, 30, 2.6)], 0xeeeeee);
}

/** A teardrop (tip up, so it points back the way it came while it flies or falls). Light grey-blue so code can tint it. */
export function drawFxDrop(g: G): void {
  layer(g, [C(8, 16, 6.2), P([[8, 1.5], [2.4, 13], [13.6, 13]])], 0xe4ecfa, 1.8);
  flat(g, [C(5.8, 15, 1.9)], 0xffffff);
}

/** A small gold diamond (24x32, tall) that circles the magic ring (`entities/bosses/RingDiamonds.ts`): light top facets, darker bottom, a glint. */
export function drawFxDiamond(g: G): void {
  layer(g, [P([[12, 2], [21, 16], [12, 30], [3, 16]])], 0xffd166, 2, NAVY);
  flat(g, [P([[12, 4.5], [18.5, 15], [5.5, 15]])], 0xfff0b0);
  flat(g, [P([[12, 16.5], [18.5, 16.5], [12, 28]])], 0xe3a82c);
  flat(g, [C(9.5, 10.5, 1.7)], 0xffffff);
}

/** A seamless 64x64 tile of plush red carpet: a lattice of diamonds with a gold star in the middle of each. */
export function drawFxCarpetTile(g: G): void {
  g.fillStyle(0xc1121f, 1).fillRect(0, 0, 64, 64);
  const diamond = (cx: number, cy: number, r: number): Pt[] => [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
  for (const [cx, cy] of [[32, 32], [0, 0], [64, 0], [0, 64], [64, 64]] as const) {
    g.fillStyle(0xd1213a, 1).fillPoints(poly(diamond(cx, cy, 25)), true);
    g.lineStyle(3, 0x8f0d18, 1).strokePoints(poly(diamond(cx, cy, 25)), true);
    g.lineStyle(2, 0xffd166, 0.9).strokePoints(poly(diamond(cx, cy, 16)), true);
    sparkle(g, cx, cy, 6, 0xffd166);
  }
  for (const [x, y] of [[32, 0], [0, 32], [64, 32], [32, 64]] as const) g.fillStyle(0x8f0d18, 1).fillCircle(x, y, 3.2);
}
