import Phaser from 'phaser';
import { WORLD } from '../config/arena';

/** Keep a point inside the world, `margin` px away from the walls. */
export function clampToArena(x: number, y: number, margin = 0): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(
    Phaser.Math.Clamp(x, margin, WORLD.width - margin),
    Phaser.Math.Clamp(y, margin, WORLD.height - margin),
  );
}

export interface Point {
  x: number;
  y: number;
}

/**
 * What gameplay is allowed to ask the arena. The Tiled map (world/ArenaMap.ts) provides it;
 * entities and systems only ever see this small interface, never tiles.
 */
export interface ArenaQuery {
  /** True if the point is inside a solid tile. Outside the map counts as open (world bounds handle that). */
  isSolidAt(x: number, y: number): boolean;
  /** True if a circle of `radius` around the point touches no solid tile. */
  isCircleFree(x: number, y: number, radius: number): boolean;
  /** The point itself if it is free, otherwise the closest free tile center. */
  nearestOpen(x: number, y: number, clearance?: number): Point;
}
