import type { ArenaQuery, Point } from './arena';

const DEG = Math.PI / 180;

/**
 * Cheap wall avoidance for cats that walk in straight lines. No pathfinding:
 * if a wall is straight ahead, try turning a bit more each time, on the cat's own side first.
 * Returns the heading to walk (the original one if nothing is in the way, or if nothing helps).
 * Pure math, no Phaser.
 */
export function steerAround(
  x: number,
  y: number,
  heading: number,
  probe: number,
  arena: Pick<ArenaQuery, 'isSolidAt'>,
  side: 1 | -1,
  anglesDeg: readonly number[],
): number {
  const blocked = (angle: number): boolean =>
    arena.isSolidAt(x + Math.cos(angle) * probe, y + Math.sin(angle) * probe) ||
    arena.isSolidAt(x + Math.cos(angle) * probe * 0.5, y + Math.sin(angle) * probe * 0.5);

  if (!blocked(heading)) return heading;
  for (const deg of anglesDeg) {
    for (const s of [side, -side]) {
      const angle = heading + s * deg * DEG;
      if (!blocked(angle)) return angle;
    }
  }
  return heading;
}

/**
 * Walk from (x, y) toward (toX, toY) in small steps and stop just before the first spot where a
 * circle of `radius` would touch a wall. Returns the start point if it is blocked right away.
 * Used for dashes, so a boss never plans to run into a wall. Pure math, no Phaser.
 */
export function lastFreePoint(
  x: number,
  y: number,
  toX: number,
  toY: number,
  radius: number,
  arena: Pick<ArenaQuery, 'isCircleFree'>,
  step = 10,
): Point {
  const dist = Math.hypot(toX - x, toY - y);
  let last: Point = { x, y };
  if (dist === 0) return last;
  for (let walked = step; walked < dist + step; walked += step) {
    const t = Math.min(1, walked / dist);
    const px = x + (toX - x) * t;
    const py = y + (toY - y) * t;
    if (!arena.isCircleFree(px, py, radius)) break;
    last = { x: px, y: py };
  }
  return last;
}

/** True if a circle of `radius` can walk the straight line from (x, y) to (toX, toY) without touching a wall. */
export function hasClearLine(
  x: number,
  y: number,
  toX: number,
  toY: number,
  radius: number,
  arena: Pick<ArenaQuery, 'isCircleFree'>,
  step = 12,
): boolean {
  const reached = lastFreePoint(x, y, toX, toY, radius, arena, step);
  return Math.hypot(toX - reached.x, toY - reached.y) <= step;
}
