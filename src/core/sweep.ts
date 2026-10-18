/**
 * Pure math for the belt. No Phaser import on purpose, so it can be tested with plain node.
 */
const TAU = Math.PI * 2;

/** Any angle -> [0, 2PI). */
export const normalizeAngle = (angle: number): number => ((angle % TAU) + TAU) % TAU;

/**
 * Has a sweep that started at `startAngle` and has turned `sweptRad` radians (clockwise on screen,
 * like Phaser angles) already passed over the direction `angleToTarget`?
 * Works for any arc, from a 130 degree swing to a full 360 degree spin.
 */
export const isSwept = (angleToTarget: number, startAngle: number, sweptRad: number): boolean =>
  normalizeAngle(angleToTarget - startAngle) <= sweptRad;

/** Shortest distance from point P to the segment A-B (so fast things cannot tunnel through targets). */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}
