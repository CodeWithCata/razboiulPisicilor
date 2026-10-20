/** @file Reads player / enemy / boss spawn points from Tiled objects and picks safe enemy spots. Pure logic. */
import { SPAWN_KINDS } from '../config/arena';
import type { Point } from '../core/arena';

/** The few fields we read from a Tiled object (Phaser's TiledObject has all of these). */
export interface SpawnObject {
  name?: string;
  type?: string;
  class?: string;
  x?: number;
  y?: number;
}

export interface ArenaSpawns {
  player: Point | null;
  enemies: Point[];
  boss: Point | null;
}

/**
 * Turn the Tiled `spawns` object layer into points.
 * The kind comes from the object's Type/Class, or its name ("enemy 3", "boss"...).
 * Use POINT objects in Tiled; for rectangles Tiled gives the top-left corner.
 */
export function parseSpawns(objects: readonly SpawnObject[]): ArenaSpawns {
  const spawns: ArenaSpawns = { player: null, enemies: [], boss: null };
  for (const o of objects) {
    if (typeof o.x !== 'number' || typeof o.y !== 'number') continue;
    const kind = (o.type || o.class || o.name || '').toLowerCase();
    const point = { x: o.x, y: o.y };
    if (kind.startsWith(SPAWN_KINDS.player)) spawns.player ??= point;
    else if (kind.startsWith(SPAWN_KINDS.boss)) spawns.boss ??= point;
    else if (kind.startsWith(SPAWN_KINDS.enemy)) spawns.enemies.push(point);
  }
  return spawns;
}

/**
 * A random spawn point at least `minDistance` and (if given) at most `maxDistance` from `avoid` (Varu), so nothing
 * pops up in his face and nothing starts a minute's walk away in a big world.
 * If none is in that band, any point that is far enough wins, and if every point is too close, the farthest one.
 * Null if there are no points at all.
 */
export function pickEnemySpawn(
  points: readonly Point[],
  avoid: Point,
  minDistance: number,
  maxDistance: number = Infinity,
  rng: () => number = Math.random,
): Point | null {
  if (points.length === 0) return null;
  const dist = (p: Point): number => Math.hypot(p.x - avoid.x, p.y - avoid.y);
  const band = points.filter((p) => dist(p) >= minDistance && dist(p) <= maxDistance);
  if (band.length > 0) return band[Math.floor(rng() * band.length)]!;
  const far = points.filter((p) => dist(p) >= minDistance);
  if (far.length > 0) return far[Math.floor(rng() * far.length)]!;
  return points.reduce((best, p) =>
    Math.hypot(p.x - avoid.x, p.y - avoid.y) > Math.hypot(best.x - avoid.x, best.y - avoid.y) ? p : best,
  );
}
