/** @file Finds the 2x2 props, cans, ball and fences in the map tiles. Pure numbers, no Phaser. */
import { OBJECTS, TILES, objectTiles, type ObjectName } from '../config/arena';
import type { KickKind } from '../config/props';

/**
 * Which tiles of the Tiled map become living props. Plain numbers in, plain lists out (no Phaser),
 * so it is easy to test with node. ArenaMap feeds it the tiles of the `walls` and `decor` layers.
 */

/** One filled tile: its column and row, and its 0-based tileset id (the layer data holds id + 1). */
export interface TileRead {
  col: number;
  row: number;
  id: number;
}

/** A 2x2 object (bush, rock, ...), by the column and row of its top-left tile. */
export interface ObjectSpot {
  name: ObjectName;
  col: number;
  row: number;
}

/** A decor tile you can kick (cans, ball). */
export interface DecorSpot {
  kind: KickKind;
  tile: number;
  col: number;
  row: number;
}

export interface PropLayout {
  objects: ObjectSpot[];
  decor: DecorSpot[];
  /** Fence pieces: they stay tiles, and shake only when hit. */
  fences: TileRead[];
  /** Every tile that is drawn as a plain tile: the fences, plus anything this reader does not know (nothing may vanish). */
  statics: TileRead[];
}

const OBJECT_NAMES = Object.keys(OBJECTS) as ObjectName[];
const TOP_LEFT = new Map<number, ObjectName>(OBJECT_NAMES.map((name): [number, ObjectName] => [OBJECTS[name], name]));
const PARTS = new Set<number>(OBJECT_NAMES.flatMap((name) => objectTiles(OBJECTS[name])));
const FENCE = new Set<number>([TILES.fence, TILES.fencePost, TILES.fenceSide, TILES.fencePostSide]);
const KICKABLE_TILES = new Map<number, KickKind>([
  [TILES.cans3, 'cans'],
  [TILES.cans2, 'cans'],
  [TILES.ball, 'ball'],
]);

/** The fence pieces that run up and down (left and right edge of the arena); the others run left to right. */
export const isVerticalFence = (tile: number): boolean => tile === TILES.fenceSide || tile === TILES.fencePostSide;

export function readPropLayout(walls: readonly TileRead[], decor: readonly TileRead[]): PropLayout {
  const layout: PropLayout = { objects: [], decor: [], fences: [], statics: [] };

  for (const tile of walls) {
    const name = TOP_LEFT.get(tile.id);
    if (name) layout.objects.push({ name, col: tile.col, row: tile.row });
    if (PARTS.has(tile.id)) continue; // drawn by the object's own sprite
    layout.statics.push(tile);
    if (FENCE.has(tile.id)) layout.fences.push(tile);
  }

  for (const tile of decor) {
    const kind = KICKABLE_TILES.get(tile.id);
    if (kind) layout.decor.push({ kind, tile: tile.id, col: tile.col, row: tile.row });
    else layout.statics.push(tile);
  }
  return layout;
}
