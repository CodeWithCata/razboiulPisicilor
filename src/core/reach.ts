/**
 * Pure geometry for "did the belt reach that prop?". No Phaser import on purpose, so it can be tested with plain node.
 */
import { isSwept } from './sweep';

/** An axis-aligned box: top-left corner plus size, in world pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The point of the box that is closest to (px, py). Inside the box it is the point itself. */
export function nearestOnBox(px: number, py: number, box: Box): { x: number; y: number } {
  return {
    x: Math.min(Math.max(px, box.x), box.x + box.w),
    y: Math.min(Math.max(py, box.y), box.y + box.h),
  };
}

/**
 * Has a sweep around (sx, sy) that started at `startAngle` and has turned `swept` radians
 * already passed over some part of the box that lies within `range`?
 * A box is big, so the arc is checked against the closest point, the corners, the edge middles and the center.
 */
export function sweepTouchesBox(sx: number, sy: number, box: Box, range: number, startAngle: number, swept: number): boolean {
  const near = nearestOnBox(sx, sy, box);
  if (Math.hypot(near.x - sx, near.y - sy) > range) return false;

  const passes = (x: number, y: number): boolean =>
    Math.hypot(x - sx, y - sy) <= range && isSwept(Math.atan2(y - sy, x - sx), startAngle, swept);

  if (passes(near.x, near.y)) return true;
  const xs = [box.x, box.x + box.w / 2, box.x + box.w];
  const ys = [box.y, box.y + box.h / 2, box.y + box.h];
  for (const x of xs) {
    for (const y of ys) {
      if (passes(x, y)) return true;
    }
  }
  return false;
}

/**
 * Does a fast thing that moved from A to B (a circle of `radius`) touch the box on the way?
 * Sampled along the path, so a quick belt cannot tunnel through a prop.
 */
export function segmentTouchesBox(ax: number, ay: number, bx: number, by: number, box: Box, radius: number): boolean {
  const length = Math.hypot(bx - ax, by - ay);
  const samples = Math.max(1, Math.ceil(length / 12));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (x >= box.x - radius && x <= box.x + box.w + radius && y >= box.y - radius && y <= box.y + box.h + radius) return true;
  }
  return false;
}
