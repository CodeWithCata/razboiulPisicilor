/** @file Draws the stands outside the fence: a bowl of terraces with an ad barrier, aisles, balcony boxes, bunting and cat fans (returned for world/StandsCrowd.ts to animate). Built once in ArenaMap. */
import type Phaser from 'phaser';
import { drawCatFan, type FanLook, type FanPose } from '../assets/art/cats';
import { NAVY, sparkle } from '../assets/art/shapes';
import { poly } from '../assets/paint';
import { flushPictures, hasPicture, queuePainted, texArgs, texRef } from '../assets/atlas';
import { ARENA, PLAY_AREA, WORLD } from '../config/arena';
import { STANDS } from '../config/stands';
import { ringPosition } from './standsRing';
import { hyp } from '../core/hyp';

export type Side = 'left' | 'right' | 'top' | 'bottom';
type Graphics = Phaser.GameObjects.Graphics;
type Pt = [number, number];
/** Keeps the points where a*x + b*y + c >= 0. */
type Plane = readonly [number, number, number];

/**
 * One side of the ring, described by `u` (along the fence, 0..length) and `d` (outward from the fence). Using these instead of
 * x / y lets one set of rules draw all four sides. `at` turns (u, d) into world px.
 */
interface Frame {
  side: Side;
  length: number;
  depth: number;
  /** How many terraces fit between the barrier and the back wall. */
  tiers: number;
  /** Where the back wall starts (d). */
  wallD: number;
  at: (u: number, d: number) => Pt;
}

/** A balcony box (or the bigger booth) on one side. */
interface Box {
  frame: Frame;
  u: number;
  span: number;
  /** Where the wooden floor starts (d): the front of the box. */
  front: number;
  /** Index into STANDS.colors.awnings. */
  style: number;
  cats: number;
}

const FAN_KEY = 'stands:fan:';
const FAN_TEX = 96; // drawCatFan draws on a 96x96 canvas
/** Sprites face up at rotation 0, so a spectator turns to face the fence: right, left, down, up. Only used for the way they lean (and for the turn when `STANDS.spectators.upright` is false). */
const FACING: Record<Side, number> = { left: Math.PI / 2, right: -Math.PI / 2, top: Math.PI, bottom: 0 };
const SQRT2 = Math.SQRT2;
/** Terraces, spectators, boxes and bunting sit at these depths (all under the actors). */
const DEPTH = { base: ARENA.depth.stands, fans: ARENA.depth.stands + 0.01, roofs: ARENA.depth.stands + 0.02 } as const;

/** Deterministic pseudo-random 0..1 from a seed, so the crowd looks the same every time. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ---------------------------------------------------------------- geometry */

/** The frames of the sides that have stands (a side with no stand tiles has none). */
function frames(): Frame[] {
  const A = PLAY_AREA;
  const out: Frame[] = [];
  const make = (side: Side, length: number, depth: number, at: Frame['at']): void => {
    const tiers = Math.max(0, Math.floor((depth - STANDS.barrier - STANDS.backWall) / STANDS.step));
    out.push({ side, length, depth, tiers, wallD: depth - STANDS.backWall, at });
  };
  const w = A.right - A.left;
  const h = A.bottom - A.top;
  if (ARENA.standTiles.top > 0) make('top', w, A.top, (u, d) => [A.left + u, A.top - d]);
  if (ARENA.standTiles.bottom > 0) make('bottom', w, WORLD.height - A.bottom, (u, d) => [A.left + u, A.bottom + d]);
  if (ARENA.standTiles.left > 0) make('left', h, A.left, (u, d) => [A.left - d, A.top + u]);
  if (ARENA.standTiles.right > 0) make('right', h, WORLD.width - A.right, (u, d) => [A.right + d, A.top + u]);
  return out;
}

/** Keeps the part of a convex polygon on the right side of every plane (Sutherland-Hodgman). */
function clip(pts: Pt[], planes: readonly Plane[]): Pt[] {
  let cur = pts;
  for (const [a, b, c] of planes) {
    if (cur.length === 0) return cur;
    const next: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const p = cur[i]!;
      const q = cur[(i + 1) % cur.length]!;
      const dp = a * p[0] + b * p[1] + c;
      const dq = a * q[0] + b * q[1] + c;
      if (dp >= 0) next.push(p);
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        next.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    cur = next;
  }
  return cur;
}

/** The world's edges plus the four cut corners: everything drawn is clipped to this octagon. */
function octagon(): Plane[] {
  const W = WORLD.width;
  const H = WORLD.height;
  const c = STANDS.chamfer;
  return [
    [1, 0, 0],
    [-1, 0, W],
    [0, 1, 0],
    [0, -1, H],
    [1, 1, -c],
    [-1, 1, W - c],
    [1, -1, H - c],
    [-1, -1, W + H - c],
  ];
}

/** How far a world point is from the cut corner nearest to it (the "x + y" of that corner; the smallest one). */
function cornerValue(x: number, y: number): number {
  const W = WORLD.width;
  const H = WORLD.height;
  return Math.min(x + y, W - x + y, x + H - y, W - x + H - y);
}

/** A strip of a side between two distances (d0..d1), as a polygon in world px. Its ends are the 45 degree seams to the next side. */
function strip(f: Frame, d0: number, d1: number): Pt[] {
  return [f.at(-d0, d0), f.at(f.length + d0, d0), f.at(f.length + d1, d1), f.at(-d1, d1)];
}

/** An axis-aligned zone (u0..u1, d0..d1) of a side as a world rectangle. */
function zoneRect(f: Frame, u0: number, u1: number, d0: number, d1: number): { x: number; y: number; w: number; h: number } {
  const [ax, ay] = f.at(u0, d0);
  const [bx, by] = f.at(u1, d1);
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(ax - bx), h: Math.abs(ay - by) };
}

/* ---------------------------------------------------------------- painting */

/** Drawing helpers that shift everything by (-ox, -oy), so the same world drawing can be baked into any window of the world. */
class Pen {
  constructor(
    readonly g: Graphics,
    readonly ox: number,
    readonly oy: number,
  ) {}

  private v(pts: readonly Pt[]): Phaser.Math.Vector2[] {
    return poly(pts.map(([x, y]) => [x - this.ox, y - this.oy] as const));
  }

  /** A filled polygon; a hairline of the same color closes the thin cracks between neighbours. */
  fill(pts: Pt[], color: number, alpha = 1): void {
    if (pts.length < 3) return;
    this.g.fillStyle(color, alpha);
    this.g.fillPoints(this.v(pts), true);
    if (alpha >= 1) {
      this.g.lineStyle(1, color, 1);
      this.g.strokePoints(this.v(pts), true);
    }
  }

  /** A polygon's outline. */
  outline(pts: Pt[], width: number = STANDS.outline, color: number = NAVY): void {
    if (pts.length < 3) return;
    this.g.lineStyle(width, color, 1);
    this.g.strokePoints(this.v(pts), true);
  }

  rect(r: { x: number; y: number; w: number; h: number }, color: number, outline = 0): void {
    this.g.fillStyle(color, 1);
    this.g.fillRect(r.x - this.ox, r.y - this.oy, r.w, r.h);
    if (outline > 0) {
      this.g.lineStyle(outline, NAVY, 1);
      this.g.strokeRect(r.x - this.ox, r.y - this.oy, r.w, r.h);
    }
  }

  round(r: { x: number; y: number; w: number; h: number }, color: number, radius: number, outline = 0): void {
    if (outline > 0) {
      this.g.fillStyle(NAVY, 1);
      this.g.fillRoundedRect(r.x - this.ox - outline, r.y - this.oy - outline, r.w + outline * 2, r.h + outline * 2, radius + outline);
    }
    this.g.fillStyle(color, 1);
    this.g.fillRoundedRect(r.x - this.ox, r.y - this.oy, r.w, r.h, radius);
  }

  circle(x: number, y: number, r: number, color: number, outline = 0): void {
    if (outline > 0) {
      this.g.fillStyle(NAVY, 1);
      this.g.fillCircle(x - this.ox, y - this.oy, r + outline);
    }
    this.g.fillStyle(color, 1);
    this.g.fillCircle(x - this.ox, y - this.oy, r);
  }

  line(a: Pt, b: Pt, width: number, color: number, alpha = 1): void {
    this.g.lineStyle(width, color, alpha);
    this.g.lineBetween(a[0] - this.ox, a[1] - this.oy, b[0] - this.ox, b[1] - this.oy);
  }

  triangle(a: Pt, b: Pt, c: Pt, color: number, outline = 0): void {
    this.g.fillStyle(color, 1);
    this.g.fillTriangle(a[0] - this.ox, a[1] - this.oy, b[0] - this.ox, b[1] - this.oy, c[0] - this.ox, c[1] - this.oy);
    if (outline > 0) {
      this.g.lineStyle(outline, NAVY, 1);
      this.g.strokeTriangle(a[0] - this.ox, a[1] - this.oy, b[0] - this.ox, b[1] - this.oy, c[0] - this.ox, c[1] - this.oy);
    }
  }
}

/* ------------------------------------------------------- aisles, seats, boxes */

/** Where the aisles (stairs) of a side are, along the fence (u). */
function aisles(f: Frame): number[] {
  const n = STANDS.sections[f.side];
  const out: number[] = [];
  for (let i = 1; i < n; i++) out.push((f.length * i) / n);
  return out;
}

/** The balcony boxes and the booth of a side. */
function boxesOf(f: Frame): Box[] {
  if (f.tiers < 2) return [];
  const a = aisles(f);
  const front = STANDS.barrier + (f.tiers - 2) * STANDS.step;
  const out: Box[] = [];
  (STANDS.boxes[f.side] as readonly number[]).forEach((n, i) => {
    const u = a[n - 1];
    if (u !== undefined) out.push({ frame: f, u, span: STANDS.box.spanPx, front, style: i % STANDS.colors.awnings.length, cats: STANDS.box.cats });
  });
  const booth = (STANDS.booth as Partial<Record<Side, number>>)[f.side];
  const bu = booth === undefined ? undefined : a[booth - 1];
  if (bu !== undefined) out.push({ frame: f, u: bu, span: STANDS.box.boothSpanPx, front, style: 0, cats: STANDS.box.boothCats });
  return out;
}

/** True if the spot (u, d) is under a box or on an aisle, so no seat or fan goes there. */
function taken(f: Frame, boxes: readonly Box[], u: number, d: number, pad: number): boolean {
  if (aisles(f).some((a) => Math.abs(u - a) < STANDS.aisleWidth / 2 + pad)) return true;
  return boxes.some((b) => Math.abs(u - b.u) < b.span / 2 + pad && d >= b.front - 2);
}

/** One seat: where it is, which tread, which section. */
interface Seat {
  u: number;
  d: number;
  tier: number;
  section: number;
}

/** The seats of one terrace row: packed next to the aisles, in blocks, and out into the corners as far as the stand reaches. */
function seatsOf(f: Frame, tier: number): Seat[] {
  const sp = STANDS.spectators.spacing;
  const d = STANDS.barrier + tier * STANDS.step + STANDS.lip + (STANDS.step - STANDS.lip) / 2;
  const reach = d + STANDS.step / 2; // the row runs this far past each end of the fence (the 45 degree seam)
  const a = aisles(f);
  const half = STANDS.aisleWidth / 2;
  const edges = [-reach + sp / 2, ...a.flatMap((x) => [x - half, x + half]), f.length + reach - sp / 2];
  const out: Seat[] = [];
  for (let s = 0; s < edges.length / 2; s++) {
    const lo = edges[s * 2]!;
    const hi = edges[s * 2 + 1]!;
    const n = Math.floor((hi - lo) / sp + (s === 0 || s === edges.length / 2 - 1 ? 0.5 : 0));
    // The first block is packed against its aisle (on the right), the last one against its aisle (on the left), the others are centered.
    const first = s === 0 ? hi - sp / 2 - (n - 1) * sp : s === edges.length / 2 - 1 ? lo + sp / 2 : lo + (hi - lo - n * sp) / 2 + sp / 2;
    for (let i = 0; i < n; i++) {
      const u = first + i * sp;
      const [x, y] = f.at(u, d);
      // Not out in the cut corners, not past the seam into the next side.
      if (cornerValue(x, y) < STANDS.chamfer + STANDS.backWall * SQRT2 + 12) continue;
      out.push({ u, d, tier, section: s });
    }
  }
  return out;
}

/* ------------------------------------------------------------- the terraces */

/** The ad barrier: a navy strip with colored panels along the fence. */
function paintBarrier(pen: Pen, f: Frame, clipTo: readonly Plane[]): void {
  const b = STANDS.barrier;
  pen.fill(clip(strip(f, 0, b), clipTo), NAVY);
  const panels = STANDS.colors.barrierPanels;
  const len = STANDS.panelPx;
  for (let u = 0, i = 0; u < f.length; u += len, i++) {
    const color = panels[i % panels.length]!;
    if (color === NAVY) continue;
    const u1 = Math.min(u + len, f.length);
    pen.rect(zoneRect(f, u + 2, u1 - 2, 2, b - 2), color);
  }
}

/** One terrace row: the tread, its darker lip at the field side, and a thin highlight on the lip's edge. */
function paintTier(pen: Pen, f: Frame, tier: number, clipTo: readonly Plane[]): void {
  const d0 = STANDS.barrier + tier * STANDS.step;
  const d1 = d0 + STANDS.step;
  const tread = STANDS.colors.tread;
  pen.fill(clip(strip(f, d0, d1), clipTo), tread[tier % tread.length]!);
  pen.fill(clip(strip(f, d0, d0 + STANDS.lip), clipTo), STANDS.colors.lip);
  pen.fill(clip(strip(f, d0 + STANDS.lip, d0 + STANDS.lip + 2), clipTo), STANDS.colors.lipHighlight, 0.7);
}

/** The outline of every terrace row, so the steps read as stepped lines like the reference. */
function outlineTier(pen: Pen, f: Frame, tier: number, clipTo: readonly Plane[]): void {
  const d0 = STANDS.barrier + tier * STANDS.step;
  pen.outline(clip(strip(f, d0, d0 + STANDS.step), clipTo));
}

/** The back wall: navy with a gold trim on its inner edge. */
function paintWall(pen: Pen, f: Frame, clipTo: readonly Plane[]): void {
  pen.fill(clip(strip(f, f.wallD, f.depth), clipTo), STANDS.colors.backWall);
  pen.fill(clip(strip(f, f.wallD, f.wallD + 3), clipTo), STANDS.colors.trim);
}

/** The cut corners get a wall too: a navy band along the 45 degree cut, trimmed in gold on its inner edge. */
function paintCornerWalls(pen: Pen): void {
  const W = WORLD.width;
  const H = WORLD.height;
  const c = STANDS.chamfer;
  const t = STANDS.backWall * SQRT2;
  const trim = 3 * SQRT2;
  const world = [[1, 0, 0], [-1, 0, W], [0, 1, 0], [0, -1, H]] as const;
  // Each corner: [value of the cut line, the corner's own x / y sign]. A band is a strip of corner values from c to c + t.
  const corners: ReadonlyArray<readonly [number, number, number, number]> = [
    [1, 1, 0, 0],
    [-1, 1, W, 0],
    [1, -1, 0, H],
    [-1, -1, W, H],
  ];
  for (const [sx, sy, cx, cy] of corners) {
    // value(x, y) = sx * (x - cx) + sy * (y - cy), which is 0 at the world corner and grows inward.
    const k = -(sx * cx + sy * cy);
    const inner = (lo: number, hi: number): Pt[] =>
      clip(
        [[0, 0], [W, 0], [W, H], [0, H]],
        [...world, [sx, sy, k - lo], [-sx, -sy, hi - k]],
      );
    pen.fill(inner(c, c + t), STANDS.colors.backWall);
    pen.fill(inner(c + t - trim, c + t), STANDS.colors.trim);
  }
}

/** Stairs: a lighter strip down the terraces with the lips drawn as steps and a navy outline on every step. */
function paintAisle(pen: Pen, f: Frame, u: number): void {
  const half = STANDS.aisleWidth / 2;
  for (let k = 0; k < f.tiers; k++) {
    const d0 = STANDS.barrier + k * STANDS.step;
    pen.rect(zoneRect(f, u - half, u + half, d0, d0 + STANDS.step), STANDS.colors.aisle);
    pen.rect(zoneRect(f, u - half, u + half, d0, d0 + STANDS.lip), STANDS.colors.aisleLip);
  }
  for (let k = 0; k < f.tiers; k++) {
    const d0 = STANDS.barrier + k * STANDS.step;
    const r = zoneRect(f, u - half, u + half, d0, d0 + STANDS.step);
    pen.g.lineStyle(2, NAVY, 1);
    pen.g.strokeRect(r.x - pen.ox, r.y - pen.oy, r.w, r.h);
  }
}

/** Confetti and a few gold sparkles lying on the terraces (seats and aisles are left clean). */
function paintConfetti(pen: Pen, f: Frame, boxes: readonly Box[], seed: number): void {
  const area = f.length * (f.wallD - STANDS.barrier);
  const bits = Math.floor(area / STANDS.confetti.areaPerBit);
  const colors = STANDS.colors.confetti;
  for (let i = 0; i < bits; i++) {
    const u = rnd(seed + i * 3) * f.length;
    const d = STANDS.barrier + 4 + rnd(seed + i * 3 + 1) * (f.wallD - STANDS.barrier - 8);
    if (taken(f, boxes, u, d, 2)) continue;
    const [x, y] = f.at(u, d);
    if (i % STANDS.confetti.sparklesPer === 0) {
      sparkle(pen.g, x - pen.ox, y - pen.oy, 5, STANDS.colors.trim);
    } else {
      pen.circle(x, y, 1.8, colors[i % colors.length]!);
    }
  }
}

/** A wooden balcony floor with plank lines running front to back, under the roof and the cats. */
function paintBoxFloor(pen: Pen, b: Box): void {
  const f = b.frame;
  const r = zoneRect(f, b.u - b.span / 2, b.u + b.span / 2, b.front, f.wallD);
  pen.rect(r, STANDS.colors.wood, STANDS.outline);
  for (let u = b.u - b.span / 2 + 16; u < b.u + b.span / 2 - 4; u += 16) {
    pen.line(f.at(u, b.front + 3), f.at(u, f.wallD - 3), 1.5, STANDS.colors.woodDark, 0.55);
  }
}

/* ------------------------------------------------------------------ bunting */

/** The line the bunting follows: the middle of the back wall all the way round, and along the cut corners. */
function buntingPath(): Pt[] {
  const W = WORLD.width;
  const H = WORLD.height;
  const half = STANDS.backWall / 2;
  const k = STANDS.chamfer + half * SQRT2; // the cut line through the middle of the wall: x + y = k
  const e = k - half;
  return [
    [e, half],
    [W - e, half],
    [W - half, e],
    [W - half, H - e],
    [W - e, H - half],
    [e, H - half],
    [half, H - e],
    [half, e],
  ];
}

/** A pole seen from above: a round base with a gold cap. */
function paintPole(pen: Pen, x: number, y: number): void {
  pen.circle(x, y, STANDS.bunting.poleRadius, STANDS.colors.pole, 2);
  pen.circle(x, y, 2, STANDS.colors.trim);
}

/** Bunting along the whole back wall: poles every so often, a sagging string between them and little flags hanging toward the field. */
function paintBunting(pen: Pen): void {
  const B = STANDS.bunting;
  const path = buntingPath();
  let flag = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const z = path[(i + 1) % path.length]!;
    const len = hyp(z[0] - a[0], z[1] - a[1]);
    const dx = (z[0] - a[0]) / len;
    const dy = (z[1] - a[1]) / len;
    const nx = -dy; // the inward side (the path runs clockwise on screen)
    const ny = dx;
    const spans = Math.max(1, Math.ceil(len / B.maxSpanPx));
    for (let s = 0; s < spans; s++) {
      const p0: Pt = [a[0] + (dx * len * s) / spans, a[1] + (dy * len * s) / spans];
      const p1: Pt = [a[0] + (dx * len * (s + 1)) / spans, a[1] + (dy * len * (s + 1)) / spans];
      const spanLen = len / spans;
      // The string: a parabola that sags toward the field.
      const at = (t: number): Pt => [p0[0] + (p1[0] - p0[0]) * t + nx * B.sagPx * 4 * t * (1 - t), p0[1] + (p1[1] - p0[1]) * t + ny * B.sagPx * 4 * t * (1 - t)];
      const steps = Math.max(6, Math.round(spanLen / 20));
      for (let q = 0; q < steps; q++) pen.line(at(q / steps), at((q + 1) / steps), 2, STANDS.colors.string);
      const flags = Math.max(1, Math.floor(spanLen / B.flagEveryPx));
      for (let q = 0; q < flags; q++) {
        const t = (q + 0.5) / flags;
        const c = at(t);
        const left: Pt = [c[0] - dx * B.flagWidthPx * 0.5, c[1] - dy * B.flagWidthPx * 0.5];
        const right: Pt = [c[0] + dx * B.flagWidthPx * 0.5, c[1] + dy * B.flagWidthPx * 0.5];
        const tip: Pt = [c[0] + nx * B.flagLengthPx, c[1] + ny * B.flagLengthPx];
        pen.triangle(left, right, tip, STANDS.colors.flags[flag % STANDS.colors.flags.length]!, 1.5);
        flag++;
      }
    }
  }
  for (const p of path) paintPole(pen, p[0], p[1]);
  // The poles between the corners.
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const z = path[(i + 1) % path.length]!;
    const len = hyp(z[0] - a[0], z[1] - a[1]);
    const spans = Math.max(1, Math.ceil(len / B.maxSpanPx));
    for (let s = 1; s < spans; s++) paintPole(pen, a[0] + ((z[0] - a[0]) * s) / spans, a[1] + ((z[1] - a[1]) * s) / spans);
  }
}

/* ----------------------------------------------------------- baked textures */

/**
 * Bakes the whole bowl (barrier, terraces, aisles, confetti, box floors, back wall, bunting) into four textures, one for
 * each window of the world: the full-height left and right strips, and the top and bottom strips between them. Every window
 * draws the same world geometry shifted, so the seams between sides line up exactly.
 */
function bakeBowl(scene: Phaser.Scene, fs: readonly Frame[], boxes: Map<Side, Box[]>, pieces: StandsPiece[]): void {
  const A = PLAY_AREA;
  const windows: Array<{ key: string; x: number; y: number; w: number; h: number }> = [
    { key: 'stands:bowl:left', x: 0, y: 0, w: A.left, h: WORLD.height },
    { key: 'stands:bowl:right', x: A.right, y: 0, w: WORLD.width - A.right, h: WORLD.height },
    { key: 'stands:bowl:top', x: A.left, y: 0, w: A.right - A.left, h: A.top },
    { key: 'stands:bowl:bottom', x: A.left, y: A.bottom, w: A.right - A.left, h: WORLD.height - A.bottom },
  ];
  const clipTo = octagon();
  for (const win of windows) {
    if (win.w <= 0 || win.h <= 0) continue;
    if (!hasPicture(scene, win.key)) queuePainted(scene, win.key, win.w, win.h, (g) => {
      const pen = new Pen(g, win.x, win.y);
      // Back to front: barrier, terraces (all outlines after all fills so seams stay clean), walls, aisles, extras.
      for (const f of fs) paintBarrier(pen, f, clipTo);
      for (const f of fs) for (let k = 0; k < f.tiers; k++) paintTier(pen, f, k, clipTo);
      for (const f of fs) for (let k = 0; k < f.tiers; k++) outlineTier(pen, f, k, clipTo);
      for (const f of fs) paintWall(pen, f, clipTo);
      paintCornerWalls(pen);
      fs.forEach((f, i) => {
        const bx = boxes.get(f.side) ?? [];
        for (const u of aisles(f)) if (!bx.some((b) => b.u === u)) paintAisle(pen, f, u);
        paintConfetti(pen, f, bx, 5000 + i * 977);
        for (const b of bx) paintBoxFloor(pen, b);
      });
      paintBunting(pen);
    });
    pieces.push({ image: scene.add.image(win.x, win.y, ...texArgs(win.key)).setOrigin(0).setDepth(DEPTH.base), culled: false });
  }
}

/** The front of a balcony box: a railing along the front, and a striped roof with a scalloped edge over its back half. Baked small, on its own. */
function bakeBoxFront(scene: Phaser.Scene, b: Box, index: number, pieces: StandsPiece[]): void {
  const f = b.frame;
  const key = `stands:box:${f.side}:${index}`;
  const u0 = b.u - b.span / 2;
  const u1 = b.u + b.span / 2;
  const roofD = b.front + STANDS.box.roofFromFront; // the roof's front edge
  const pad = STANDS.box.scallop + 8;
  const win = zoneRect(f, u0 - 8, u1 + 8, b.front - pad, f.depth);
  if (!hasPicture(scene, key)) queuePainted(scene, key, win.w, win.h, (g) => {
    const pen = new Pen(g, win.x, win.y);
    const stripes = STANDS.colors.awnings[b.style % STANDS.colors.awnings.length]!;
    const sw = STANDS.box.stripePx;
    const n = Math.round(b.span / sw);
    const w = b.span / n;
    // The shadow the roof throws toward the field.
    const sh = zoneRect(f, u0 + 4, u1 - 4, roofD - 8, roofD);
    pen.fill([[sh.x, sh.y], [sh.x + sh.w, sh.y], [sh.x + sh.w, sh.y + sh.h], [sh.x, sh.y + sh.h]], NAVY, 0.25);
    // The scalloped edge: one half-circle per stripe, under the roof.
    for (let i = 0; i < n; i++) {
      const [cx, cy] = f.at(u0 + w * (i + 0.5), roofD);
      pen.circle(cx, cy, w / 2 + 0.5, stripes[i % 2]!, 2);
    }
    // The roof: stripes across the front-to-back direction.
    for (let i = 0; i < n; i++) {
      pen.rect(zoneRect(f, u0 + w * i, u0 + w * (i + 1), roofD, f.depth - 2), stripes[i % 2]!);
    }
    // The roof's outline on the three sides that are not the scalloped edge.
    pen.line(f.at(u0, roofD), f.at(u0, f.depth - 2), 3, NAVY);
    pen.line(f.at(u1, roofD), f.at(u1, f.depth - 2), 3, NAVY);
    pen.line(f.at(u0, f.depth - 2), f.at(u1, f.depth - 2), 3, NAVY);
    // A ridge line down the middle of the roof.
    pen.line(f.at(b.u, roofD + w / 2), f.at(b.u, f.depth - 3), 2, NAVY, 0.35);
    // The railing at the front: a rail and posts.
    pen.line(f.at(u0, b.front + 2), f.at(u1, b.front + 2), 5, NAVY);
    pen.line(f.at(u0, b.front + 2), f.at(u1, b.front + 2), 2.5, STANDS.colors.rail);
    for (let u = u0; u <= u1 + 0.5; u += STANDS.box.railPost) {
      const [px, py] = f.at(u, b.front + 2);
      pen.circle(px, py, 3.2, STANDS.colors.rail, 1.6);
    }
  });
  pieces.push({ image: scene.add.image(win.x, win.y, ...texArgs(key)).setOrigin(0).setDepth(DEPTH.roofs), culled: false });
}

/* ---------------------------------------------------------------- the fans */

/** The three pictures of every look, in the order the crowd uses them: arms down, arms up (A), arms up (B). */
const POSES: readonly FanPose[] = ['idle', 'cheerA', 'cheerB'];

/** Where one picture of a fan is: a texture, and a frame name when the texture is the atlas. */
export interface FanFrame {
  key: string;
  frame?: string;
}
/** The three pictures of one look: arms down, arms up (A), arms up (B). */
export type FanFrames = readonly [FanFrame, FanFrame, FanFrame];

/** The atlas key of one picture of a fan (also its frame name). */
const fanKey = (look: number, pose: FanPose): string => `${FAN_KEY}${look}:${pose}`;

interface FanVariant {
  /** Index into STANDS.fans (and into the returned `looks`). */
  look: number;
  weight: number;
  /** Sits in the balcony boxes (the Roman looks). */
  vip: boolean;
}

/** Queues one picture of one look for the atlas (packed with the other pictures). */
function queueFan(scene: Phaser.Scene, index: number, pose: FanPose): void {
  const fan = STANDS.fans[index]!;
  const look: FanLook = { fur: fan.fur, dark: fan.dark, inner: fan.inner, outfit: fan.outfit, eyes: fan.eyes ?? 'happy' };
  if (fan.colors) look.colors = fan.colors;
  if (fan.flag !== undefined) look.flag = fan.flag;
  queuePainted(scene, fanKey(index, pose), FAN_TEX, FAN_TEX, (g) => drawCatFan(g, look, pose));
}

/** Bakes the three pictures of every fan look (fur color + outfit) into the atlas. Returns the looks with their weights, and where each picture is. */
function bakeFans(scene: Phaser.Scene): { variants: FanVariant[]; looks: FanFrames[] } {
  const count = STANDS.fans.length;
  for (let i = 0; i < count; i++) for (const pose of POSES) queueFan(scene, i, pose);
  flushPictures();
  const at = (i: number, pose: FanPose): FanFrame => texRef(fanKey(i, pose));
  const variants = STANDS.fans.map((fan, i): FanVariant => ({ look: i, weight: fan.weight, vip: fan.vip === true }));
  const looks = STANDS.fans.map((_fan, i): FanFrames => [at(i, 'idle'), at(i, 'cheerA'), at(i, 'cheerB')]);
  return { variants, looks };
}

/** Picks a fan look by weight from a 0..1 roll. */
function pickFan(variants: readonly FanVariant[], roll: number): FanVariant {
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  let at = roll * total;
  for (const v of variants) {
    at -= v.weight;
    if (at <= 0) return v;
  }
  return variants[variants.length - 1]!;
}

/** A fan to place: where, which way, which look, which terrace row. */
interface FanSpot {
  x: number;
  y: number;
  side: Side;
  /** Terrace row counted from the fence; -1 = in a balcony box. */
  tier: number;
  variant: FanVariant;
}

/** Every fan: on the seats (some seats stay empty) and in the boxes. */
function fanSpots(fs: readonly Frame[], boxes: Map<Side, Box[]>, variants: readonly FanVariant[]): FanSpot[] {
  const spec = STANDS.spectators;
  const spots: FanSpot[] = [];
  const vips = variants.filter((v) => v.vip);
  fs.forEach((f, fi) => {
    const bx = boxes.get(f.side) ?? [];
    for (let k = 0; k < f.tiers; k++) {
      for (const seat of seatsOf(f, k)) {
        const n = fi * 100000 + k * 5000 + seat.u;
        if (rnd(n) < spec.skip || taken(f, bx, seat.u, seat.d, 0)) continue;
        const u = seat.u + (rnd(n + 1) * 2 - 1) * spec.jitter;
        const d = seat.d + (rnd(n + 2) * 2 - 1) * spec.jitter;
        const [x, y] = f.at(u, d);
        spots.push({ x, y, side: f.side, tier: k, variant: pickFan(variants, rnd(n + 3)) });
      }
    }
    // The boxes: a few cats standing behind the railing, in the open front half.
    bx.forEach((b, bi) => {
      const gap = b.span / (b.cats + 1);
      for (let c = 0; c < b.cats; c++) {
        const n = fi * 100000 + bi * 777 + c * 13 + 900000;
        const [x, y] = f.at(b.u - b.span / 2 + gap * (c + 1), b.front + 20);
        spots.push({ x, y, side: f.side, tier: -1, variant: pickFan(vips, rnd(n)) });
      }
    });
  });
  // Same look together (the loose textures swap as little as they can when the atlas could not be made).
  return spots.sort((a, b) => a.variant.look - b.variant.look);
}

/** One fan on the stands. The crowd (world/StandsCrowd.ts) moves its sprite around the `base` numbers. */
export interface StandsFan {
  sprite: Phaser.GameObjects.Image;
  /** True while the fan is hidden for being off screen (world/StandsCrowd.ts `cull`). Only the picture is hidden: nothing else reads it. */
  culled: boolean;
  side: Side;
  /** Terrace row counted from the fence (0 = the one at the fence); -1 = a VIP in a balcony box. */
  tier: number;
  /** Index into `StandsBuild.looks`. */
  look: number;
  /** How far round the stands this fan is (px, see world/standsRing.ts), so one pulse can run round the whole ring. */
  ringPos: number;
  /** 0 to 2 pi, from the fan's position: the crowd is never in step. */
  phase: number;
  baseX: number;
  baseY: number;
  baseScale: number;
  baseRot: number;
  /** Unit vector toward the field: the way a fan leans when it cheers. */
  fwdX: number;
  fwdY: number;
}

/** What `buildStands` gives back: every fan, and the three pictures of every look. */
/** One big still picture of the stands (a bowl window or a box front, origin top left). Hidden by `StandsCrowd.cull` while it is off screen. */
export interface StandsPiece {
  image: Phaser.GameObjects.Image;
  culled: boolean;
}

export interface StandsBuild {
  fans: StandsFan[];
  pieces: StandsPiece[];
  looks: FanFrames[];
}

/* ------------------------------------------------------------------- build */

/**
 * Builds all the stands outside the fence. Call once when the arena is made: the textures are kept, the sprites belong to the
 * scene (they are removed when the scene restarts). The fans are returned so world/StandsCrowd.ts can bring them to life.
 */
export function buildStands(scene: Phaser.Scene): StandsBuild {
  const fs = frames();
  const boxes = new Map<Side, Box[]>(fs.map((f) => [f.side, boxesOf(f)]));
  const pieces: StandsPiece[] = [];
  bakeBowl(scene, fs, boxes, pieces);
  const { variants, looks } = bakeFans(scene);
  const fans: StandsFan[] = [];
  for (const spot of fanSpots(fs, boxes, variants)) {
    const facing = FACING[spot.side];
    const rot = STANDS.spectators.upright ? 0 : facing; // upright: every fan sits head up on screen (turned 180 degrees the top stand looked upside down)
    const scale = STANDS.spectators.scale;
    const first = looks[spot.variant.look]![0];
    const sprite = scene.add.image(spot.x, spot.y, first.key, first.frame).setRotation(rot).setScale(scale).setDepth(DEPTH.fans);
    fans.push({
      sprite,
      culled: false,
      side: spot.side,
      tier: spot.tier,
      look: spot.variant.look,
      ringPos: ringPosition(spot.x, spot.y),
      phase: rnd(spot.x * 0.731 + spot.y * 1.379) * Math.PI * 2,
      baseX: spot.x,
      baseY: spot.y,
      baseScale: scale,
      baseRot: rot,
      fwdX: Math.sin(facing), // a sprite faces up at rotation 0: turned by `facing` it looks along (sin, -cos): toward the field
      fwdY: -Math.cos(facing),
    });
  }
  for (const f of fs) (boxes.get(f.side) ?? []).forEach((b, i) => bakeBoxFront(scene, b, i, pieces));
  return { fans, pieces, looks };
}
