/** @file Draws the leather strap with its buckle for the swing / spin. */
import Phaser from 'phaser';
import { poly } from '../../assets/paint';
import { GOLD_BELT } from '../../config/animation';
import { gameClock } from '../../core/clock';
import { BELT_FX, COLORS } from '../../config/style';

type Gfx = Phaser.GameObjects.Graphics;
type Pt = [number, number];

/** Where the belt is, for one frame. (x, y) is the fist, `radius` the strap length, `tip` the angle of the buckle, `lag` how far the strap bends back behind it (radians). */
export interface StrapPose {
  x: number;
  y: number;
  tip: number;
  lag: number;
  radius: number;
  /** The golden belt: gold strap coated in sticky white goo. */
  golden?: boolean;
}

/** Corners of a rectangle centered on (cx, cy), `len` along direction `dir`, `wid` across it. */
function rect(cx: number, cy: number, dir: number, len: number, wid: number): Phaser.Math.Vector2[] {
  const tx = Math.cos(dir) * len / 2;
  const ty = Math.sin(dir) * len / 2;
  const nx = -Math.sin(dir) * wid / 2;
  const ny = Math.cos(dir) * wid / 2;
  return poly([[cx + tx + nx, cy + ty + ny], [cx + tx - nx, cy + ty - ny], [cx - tx - nx, cy - ty - ny], [cx - tx + nx, cy - ty + ny]]);
}

/** The belt in Varu's fist: a curved strap with a gold buckle. Same flat look as the characters: navy outline, flat fill. */
export function drawStrap(g: Gfx, pose: StrapPose): void {
  const { x, y, tip, lag, radius } = pose;
  const golden = pose.golden === true;
  const n = BELT_FX.strapSegments;
  const curve = Phaser.Math.DegToRad(BELT_FX.curveDeg);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const r = radius * u;
    // A resting bow (always) plus the speed bend (`lag`): the hand end is bent back the most.
    const a = tip - curve * (1 - u) - lag * (1 - u) * (1 - u);
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const stroke = (width: number, color: number): void => {
    g.lineStyle(width, color, 1);
    g.beginPath().moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokePath();
  };
  const w = BELT_FX.strapWidth;
  const o = BELT_FX.strapOutline;
  stroke(w + o * 2, COLORS.navy);
  g.fillStyle(COLORS.navy, 1).fillCircle(pts[0][0], pts[0][1], w / 2 + o);
  const base = COLORS.belt; // still leather, the gold is in the sheen, studs and buckle
  stroke(w, base);
  g.fillStyle(base, 1).fillCircle(pts[0][0], pts[0][1], w / 2);
  stroke(w * 0.28, golden ? GOLD_BELT.goldShine : BELT_FX.strapShine);

  // Gold buckle at the tip, lined up with the end of the strap.
  const [bx, by] = pts[n];
  const dir = Math.atan2(by - pts[n - 1][1], bx - pts[n - 1][0]);
  g.fillStyle(COLORS.navy, 1).fillPoints(rect(bx, by, dir, BELT_FX.buckleLength + o * 2, BELT_FX.buckleWidth + o * 2), true);
  g.fillStyle(COLORS.gold, 1).fillPoints(rect(bx, by, dir, BELT_FX.buckleLength, BELT_FX.buckleWidth), true);
  g.fillStyle(golden ? GOLD_BELT.goldShade : 0x6b4423, 1).fillPoints(rect(bx, by, dir, BELT_FX.buckleLength * 0.45, BELT_FX.buckleWidth * 0.45), true);
  if (golden) {
    g.fillStyle(GOLD_BELT.gold, 1);
    for (let i = 2; i < n; i += 2) g.fillCircle(pts[i][0], pts[i][1], w * 0.2);
    drawGoo(g, pts, w);
  }
}

/**
 * Thick white goo on the strap: blobs that swell and shrink, and strands that hang down and stretch (they always
 * hang toward the bottom of the screen). Same flat look: navy outline, then the fill.
 */
function drawGoo(g: Gfx, pts: readonly Pt[], w: number): void {
  const cfg = GOLD_BELT.strap;
  const now = gameClock.now;
  const pulse = (i: number, speed = 1): number => 0.5 + 0.5 * Math.sin((now / cfg.pulseMs) * speed + i * 1.9);
  const blobs: Array<[number, number, number]> = [];
  for (let i = 1; i < pts.length; i++) {
    if (i % 3 !== 1) continue; // sparse: the leather shows between the blobs
    blobs.push([pts[i][0], pts[i][1], w * (cfg.blobRadius.min + (cfg.blobRadius.max - cfg.blobRadius.min) * pulse(i))]);
  }
  const strands: Array<[number, number, number, number]> = [];
  for (const i of cfg.strands) {
    if (i >= pts.length) continue;
    const len = cfg.strandLen.min + (cfg.strandLen.max - cfg.strandLen.min) * pulse(i, 1.3);
    strands.push([pts[i][0], pts[i][1], pts[i][0] + Math.sin(now / 400 + i) * 1.2, pts[i][1] + len]);
  }
  const o = cfg.outline;
  // A strand is a teardrop: circles from the strap down to a fatter bulb at the end.
  const drop = (x1: number, y1: number, x2: number, y2: number, grow: number): void => {
    const n = 8;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      g.fillCircle(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, cfg.strandWidth * (0.3 + 0.7 * u * u * u * u) + grow);
    }
  };
  const paint = (grow: number, color: number): void => {
    g.fillStyle(color, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x, y, r + grow);
    for (const [x1, y1, x2, y2] of strands) drop(x1, y1, x2, y2, grow);
  };
  paint(o, COLORS.navy);
  paint(0, GOLD_BELT.gooBody);
  g.fillStyle(COLORS.white, 1);
  for (const [x, y, r] of blobs) g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.3);
}

/**
 * Motion streak behind the tip: thin and faint at the tail, thick and bright at the tip.
 * `tail` and `head` are angles; the streak is drawn from tail to head in slices.
 */
export function drawTrail(g: Gfx, x: number, y: number, radius: number, tail: number, head: number, alpha: number, buffed: boolean, golden = false): void {
  const slices = BELT_FX.trailSlices;
  const outer = buffed ? BELT_FX.buffedOuter : BELT_FX.normalOuter;
  const inner = golden ? GOLD_BELT.trailInner : buffed ? BELT_FX.buffedInner : BELT_FX.normalInner;
  const anticlockwise = head < tail;
  for (let k = 0; k < slices; k++) {
    const weight = (k + 1) / slices;
    const a0 = tail + ((head - tail) * k) / slices;
    const a1 = tail + ((head - tail) * (k + 1)) / slices;
    g.lineStyle(BELT_FX.outerWidth * weight, outer, alpha * 0.5 * weight);
    g.beginPath().arc(x, y, radius, a0, a1, anticlockwise).strokePath();
    g.lineStyle(BELT_FX.innerWidth * weight, inner, alpha * weight);
    g.beginPath().arc(x, y, radius, a0, a1, anticlockwise).strokePath();
  }
}
