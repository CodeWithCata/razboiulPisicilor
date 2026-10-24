/** @file Drawing pieces for the upgrade card pictures (Varu from above, a cowboy hat, a cat head, a cat in flight, the belt, a burst, stars, dashed arcs, a weak-point target, a recharge ring) on a Phaser Graphics, in the game's flat shapes with a navy outline. They take plain numbers and make nothing new, so they are safe to call every frame. */
import type Phaser from 'phaser';
import { UPGRADE_ART as A } from '../config/beltUpgradeArt';
import { COLORS } from '../config/style';

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t);
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2);
/** 0..1 inside [from, to] (clamped): the progress of one beat of a loop. */
export const beat = (p: number, from: number, to: number): number => clamp01((p - from) / (to - from));

type G = Phaser.GameObjects.Graphics;

/** How a thrown cat moves: the height of its arc, how many times it tumbles and how many dots trail behind it. (`UPGRADE_ART.knock` and the synergy scenes have all three.) */
export interface FlightShape {
  readonly arc: number;
  readonly spins: number;
  readonly trailDots: number;
}

/** Varu seen from above: red shoulders, a skin head and the hood line. (x, y) = his middle. */
export function drawVaru(g: G, x: number, y: number): void {
  const r = A.varuR;
  g.fillStyle(A.colors.fleece, 1).fillEllipse(x, y + 2, r * 2.1, r * 1.55);
  g.lineStyle(A.outline, COLORS.navy, 1).strokeEllipse(x, y + 2, r * 2.1, r * 1.55);
  g.fillStyle(A.colors.skin, 1).fillCircle(x, y - 1, r * 0.62);
  g.lineStyle(A.outline, COLORS.navy, 1).strokeCircle(x, y - 1, r * 0.62);
  g.fillStyle(COLORS.navy, 1).fillCircle(x + r * 0.2, y - 3, 1.6).fillCircle(x + r * 0.2, y + 2, 1.6); // two eyes, looking right
}

/** A cowboy hat seen from above, on top of Varu's head: a wide brim, a round crown and a dark band. (x, y) = the same middle as `drawVaru`. */
export function drawHat(g: G, x: number, y: number): void {
  const r = A.varuR;
  g.fillStyle(A.colors.hat, 1).fillEllipse(x, y - 1, r * 2.3, r * 1.75);
  g.lineStyle(A.outline, COLORS.navy, 1).strokeEllipse(x, y - 1, r * 2.3, r * 1.75);
  g.fillStyle(A.colors.hatDark, 1).fillCircle(x, y - 1, r * 0.62);
  g.lineStyle(A.outline, COLORS.navy, 1).strokeCircle(x, y - 1, r * 0.62);
  g.fillStyle(A.colors.hat, 1).fillCircle(x, y - 1, r * 0.34);
}

/** A boss's weak point: a red and white target. `alpha` fades it in and out, `r` is its radius (let it pulse). */
export function drawTarget(g: G, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.02) return;
  g.fillStyle(A.colors.target, alpha).fillCircle(x, y, r);
  g.fillStyle(A.colors.flash, alpha).fillCircle(x, y, r * 0.66);
  g.fillStyle(A.colors.target, alpha).fillCircle(x, y, r * 0.34);
  g.lineStyle(A.outline, COLORS.navy, alpha).strokeCircle(x, y, r);
}

/** The recharge ring: a dark plate with a ring that fills clockwise (`fill` 0..1) and turns green when it is nearly full. */
export function drawRecharge(g: G, x: number, y: number, r: number, width: number, fill: number): void {
  g.fillStyle(A.colors.plate, 0.75).fillCircle(x, y, r + 3);
  g.lineStyle(width, A.colors.ringOff, 1).strokeCircle(x, y, r);
  g.lineStyle(width, fill > 0.9 ? A.colors.ok : A.colors.buckle, 1).beginPath().arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill, false).strokePath();
}

/**
 * A cat thrown from (x0, y) to (x1, y) in an arc. `fly` 0..1 = how far it has flown (0 = still on its spot, 1 = landed and dizzy),
 * `grow` 0..1 scales the cat (0 = gone), `flash` (0..1) turns it white. A trail of dots follows it while it is in the air.
 */
export function drawFlyingCat(g: G, x0: number, x1: number, y: number, fly: number, grow: number, shape: FlightShape, flash = 0): void {
  const flying = fly > 0 && fly < 1;
  const cx = fly > 0 ? lerp(x0, x1, easeOut(fly)) : x0;
  const cy = fly > 0 ? y - shape.arc * Math.sin(Math.PI * fly) : y;
  if (flying) {
    for (let i = 1; i <= shape.trailDots; i++) {
      const f = Math.max(0, fly - i * 0.05);
      const tx = lerp(x0, x1, easeOut(f));
      const ty = y - shape.arc * Math.sin(Math.PI * f);
      g.fillStyle(A.colors.trail, 0.6 * (1 - i / (shape.trailDots + 1))).fillCircle(tx, ty, 3.5 - i * 0.4);
    }
  }
  const flip = flying ? Math.max(0.35, Math.abs(Math.cos(fly * shape.spins * Math.PI))) : 1;
  if (grow > 0.02) drawCat(g, cx, cy, A.catR * grow, 1, flip, flash, fly > 0);
}

/**
 * A cat head: round face, two ears, two eyes. `sx` / `sy` squash it (1 = round), `flash` (0..1) turns it white, `dizzy` swaps the eyes for crosses.
 * (x, y) = its middle, `r` = its radius.
 */
export function drawCat(g: G, x: number, y: number, r: number, sx = 1, sy = 1, flash = 0, dizzy = false): void {
  const w = r * 2 * sx;
  const h = r * 2 * sy;
  const body = flash > 0.5 ? A.colors.flash : A.colors.cat;
  const earY = y - h * 0.42;
  const earDx = w * 0.3;
  const earW = r * 0.62;
  for (let side = -1; side <= 1; side += 2) {
    const ex = x + side * earDx;
    g.fillStyle(body, 1).fillTriangle(ex - earW * 0.55, earY + r * 0.35, ex + earW * 0.55, earY + r * 0.35, ex + side * earW * 0.1, earY - r * 0.55);
    g.lineStyle(A.outline, COLORS.navy, 1).strokeTriangle(ex - earW * 0.55, earY + r * 0.35, ex + earW * 0.55, earY + r * 0.35, ex + side * earW * 0.1, earY - r * 0.55);
  }
  g.fillStyle(body, 1).fillEllipse(x, y, w, h);
  g.lineStyle(A.outline, COLORS.navy, 1).strokeEllipse(x, y, w, h);
  g.fillStyle(flash > 0.5 ? A.colors.flash : A.colors.catDark, 1).fillEllipse(x, y - h * 0.3, w * 0.28, h * 0.12); // a stripe on the forehead
  const eyeY = y - h * 0.02;
  const eyeDx = w * 0.22;
  if (dizzy) {
    g.lineStyle(2, COLORS.navy, 1);
    for (let side = -1; side <= 1; side += 2) {
      const ex = x + side * eyeDx;
      g.lineBetween(ex - 2.5, eyeY - 2.5, ex + 2.5, eyeY + 2.5).lineBetween(ex - 2.5, eyeY + 2.5, ex + 2.5, eyeY - 2.5);
    }
  } else {
    g.fillStyle(COLORS.navy, 1).fillCircle(x - eyeDx, eyeY, 2.2).fillCircle(x + eyeDx, eyeY, 2.2);
  }
  g.fillStyle(A.colors.catEar, 1).fillCircle(x, y + h * 0.2, r * 0.17); // the little pink nose
}

/** The belt: a brown strap with a navy outline from (x, y) along `angle`, with the gold buckle on the end. `buckleR` can be big for a heavy buckle. */
export function drawBelt(g: G, x: number, y: number, angle: number, length: number, buckleR: number): void {
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  g.lineStyle(A.strapW + 3, COLORS.navy, 1).lineBetween(x, y, ex, ey);
  g.lineStyle(A.strapW, A.colors.strap, 1).lineBetween(x, y, ex, ey);
  g.fillStyle(A.colors.buckle, 1).fillCircle(ex, ey, buckleR);
  g.lineStyle(A.outline, COLORS.navy, 1).strokeCircle(ex, ey, buckleR);
}

/** A faint arc round (x, y), the swish a swing leaves behind. */
export function drawSwish(g: G, x: number, y: number, radius: number, from: number, to: number, alpha: number): void {
  if (alpha <= 0.02 || to === from) return;
  g.lineStyle(5, A.colors.trail, alpha).beginPath().arc(x, y, radius, Math.min(from, to), Math.max(from, to), false).strokePath();
}

/** A dashed arc: used for "the old reach" and "the old distance" markers. */
export function drawDashedArc(g: G, x: number, y: number, radius: number, from: number, to: number, dash: number, alpha: number): void {
  g.lineStyle(2, A.colors.ghost, alpha);
  for (let a = from; a < to; a += dash * 2) g.beginPath().arc(x, y, radius, a, Math.min(a + dash, to), false).strokePath();
}

/** A burst of rays (an impact). `t` 0..1 = how far it has grown; it fades out as it grows. */
export function drawBurst(g: G, x: number, y: number, maxR: number, rays: number, t: number): void {
  if (t <= 0 || t >= 1) return;
  const r0 = maxR * 0.25 + maxR * 0.5 * easeOut(t);
  const r1 = maxR * 0.5 + maxR * 0.5 * easeOut(t);
  const alpha = 1 - t * t;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.2;
    g.lineStyle(i % 2 === 0 ? 5 : 3, A.colors.burst[i % A.colors.burst.length] ?? COLORS.gold, alpha);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  }
}

/** A small four-point star (dizzy stars, landing sparkles). */
export function drawStar(g: G, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(A.colors.star, alpha);
  g.fillTriangle(x - r, y, x, y - r * 0.35, x, y + r * 0.35).fillTriangle(x + r, y, x, y - r * 0.35, x, y + r * 0.35);
  g.fillTriangle(x, y - r, x - r * 0.35, y, x + r * 0.35, y).fillTriangle(x, y + r, x - r * 0.35, y, x + r * 0.35, y);
}

/** The mini arena the pictures play on: striped grass and a navy frame. The stage's middle is (0, 0). */
export function drawStage(g: G): void {
  const S = A.stage;
  const left = -S.w / 2;
  const top = -S.h / 2;
  g.fillStyle(S.grass, 1).fillRoundedRect(left, top, S.w, S.h, S.radius);
  g.fillStyle(S.stripe, 1);
  for (let x = left + S.stripeW; x < left + S.w - S.radius; x += S.stripeW * 2) g.fillRect(x, top + 2, Math.min(S.stripeW, left + S.w - S.radius - x), S.h - 4);
  g.lineStyle(S.border, S.borderColor, 1).strokeRoundedRect(left, top, S.w, S.h, S.radius);
}
