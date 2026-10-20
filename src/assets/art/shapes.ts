/** @file Drawing toolkit for the code-drawn art: flat shapes with a thick navy outline (layer / flat / ink / T / P / C / E ...). */
import type Phaser from 'phaser';
import { COLORS } from '../../config/style';
import { poly } from '../paint';

/** Tiny toolkit for the code-drawn characters: flat shapes with a thick navy outline. */
export type G = Phaser.GameObjects.Graphics;
export type Pt = readonly [number, number];

export const NAVY: number = COLORS.navy;
/** How far the navy outline sticks out around a shape, in texture pixels. */
export const OUTLINE = 3;

/** One filled shape. `grow` expands it (that is how the outline is drawn), `color` fills it. */
export type Shape = (g: G, grow: number, color: number) => void;

export const E = (x: number, y: number, w: number, h: number): Shape => (g, grow, color) => {
  g.fillStyle(color, 1).fillEllipse(x, y, w + grow * 2, h + grow * 2);
};

export const C = (x: number, y: number, r: number): Shape => (g, grow, color) => {
  g.fillStyle(color, 1).fillCircle(x, y, r + grow);
};

export const R = (x: number, y: number, w: number, h: number, r = 2): Shape => (g, grow, color) => {
  g.fillStyle(color, 1).fillRoundedRect(x - grow, y - grow, w + grow * 2, h + grow * 2, r + grow);
};

/** Polygon (corners get rounded by the outline). */
export const P = (pts: readonly Pt[]): Shape => (g, grow, color) => {
  const v = poly(pts);
  g.fillStyle(color, 1).fillPoints(v, true);
  if (grow > 0) {
    g.lineStyle(grow * 2, color, 1).strokePoints(v, true);
    for (const [x, y] of pts) g.fillCircle(x, y, grow);
  }
};

/** Catmull-Rom curve through the points. */
export function smooth(pts: readonly Pt[], closed = false, steps = 8): Pt[] {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  const out: Pt[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** Re-sample a polyline so consecutive points are about `spacing` apart. */
export function dense(path: readonly Pt[], spacing: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / spacing));
    for (let k = 0; k < n; k++) out.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
  }
  out.push(path[path.length - 1]);
  return out;
}

/** Smooth closed blob through the points. */
export const S = (pts: readonly Pt[]): Shape => P(smooth(pts, true));

/** Thick curved stroke (tails, arms, straps). Width can taper from `w0` to `w1`. */
export const T = (pts: readonly Pt[], w0: number, w1 = w0): Shape => {
  const path = dense(smooth(pts), Math.max(0.35, Math.min(1.2, Math.min(w0, w1) * 0.3)));
  return (g, grow, color) => {
    g.fillStyle(color, 1);
    path.forEach(([x, y], i) => {
      const t = path.length > 1 ? i / (path.length - 1) : 0;
      g.fillCircle(x, y, (w0 + (w1 - w0) * t) / 2 + grow);
    });
  };
};

/** Only the part of a curve between t0 and t1 (0..1), e.g. a stripe around a tail. */
export const Tpart = (pts: readonly Pt[], w: number, t0: number, t1: number): Shape => {
  const path = dense(smooth(pts), Math.max(0.35, Math.min(1.2, w * 0.3)));
  const a = Math.floor(path.length * t0);
  const b = Math.ceil(path.length * t1);
  return (g, grow, color) => {
    g.fillStyle(color, 1);
    for (const [x, y] of path.slice(a, b)) g.fillCircle(x, y, w / 2 + grow);
  };
};

/** A row of round puffs along a curve: fluffy fur trim. */
export const fluff = (pts: readonly Pt[], r: number): Shape[] =>
  dense(smooth(pts), r * 1.15).map(([x, y]) => C(x, y, r));

/** Wavy circle outline (fluffy fur). */
export function scalloped(cx: number, cy: number, rx: number, ry: number, bumps: number, amp: number): Pt[] {
  const out: Pt[] = [];
  const n = bumps * 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + amp * (Math.abs(Math.sin((a * bumps) / 2)) - 0.5) * 2;
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}

/** Ellipse as a polygon, optionally rotated (clockwise, radians). */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const lx = Math.cos(t) * rx;
    const ly = Math.sin(t) * ry;
    out.push([cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)]);
  }
  return out;
}

/** Straight bar between two points, as polygon corners. */
export function rod(x1: number, y1: number, x2: number, y2: number, half: number): Pt[] {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = ((y2 - y1) / len) * half;
  const ny = (-(x2 - x1) / len) * half;
  return [
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
  ];
}

/** Outline every shape in navy, then fill them all: overlapping shapes merge into one silhouette. */
export function layer(g: G, shapes: readonly Shape[], fill: number, grow = OUTLINE, outline: number = NAVY): void {
  if (grow > 0) for (const s of shapes) s(g, grow, outline);
  for (const s of shapes) s(g, 0, fill);
}

/** Fill shapes with no outline (stripes, highlights, details). */
export const flat = (g: G, shapes: readonly Shape[], fill: number, alpha = 1): void => {
  g.fillStyle(fill, alpha);
  for (const s of shapes) s(g, 0, fill);
};

/** Thin navy line detail. */
export function ink(g: G, pts: readonly Pt[], width = 2, color = NAVY): void {
  flat(g, [T(pts, width)], color);
}

/** Four-point sparkle. */
export function sparkle(g: G, x: number, y: number, s: number, color = 0xffffff): void {
  const k = s * 0.28;
  flat(g, [P([[x, y - s], [x + k, y - k], [x + s, y], [x + k, y + k], [x, y + s], [x - k, y + k], [x - s, y], [x - k, y - k]])], color);
}

/** Small heart. */
export const heart = (x: number, y: number, s: number): Shape[] => [
  C(x - s * 0.5, y - s * 0.35, s * 0.55),
  C(x + s * 0.5, y - s * 0.35, s * 0.55),
  P([[x - s * 1.02, y - s * 0.1], [x + s * 1.02, y - s * 0.1], [x, y + s * 1.05]]),
];
