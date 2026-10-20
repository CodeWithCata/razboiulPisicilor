/** @file Cuts each arena prop out of the tileset into its own texture and draws the rock-crack overlays (used by systems/props/). */
import type Phaser from 'phaser';
import { ARENA, OBJECTS, TILES, objectTiles, type ObjectName } from '../config/arena';
import { COLORS } from '../config/style';
import { Tex } from './keys';

/**
 * The arena props (bush, rock, box, ...) are tiles in the Tiled map, and a tile cannot wobble.
 * So each one is also copied ONCE out of the tileset image into its own small texture; systems/props/ draws those as sprites.
 * Copying with drawImage (one tile at a time, at its exact spot in the tileset) keeps the 1px extruded border out of the picture.
 */
export const propKey = (name: ObjectName): string => `prop:${name}`;
/** The crack picture for a rock at crack stage 1, 2, 3... (each stage includes the earlier cracks). */
export const crackKey = (stage: number): string => `prop_crack:${stage}`;

/** Crack lines on the 80x80 rock picture, per stage: polylines of [x, y] points. Stage n draws stages 1..n. */
const CRACKS: ReadonlyArray<ReadonlyArray<ReadonlyArray<readonly [number, number]>>> = [
  [[[40, 24], [37, 33], [42, 41], [38, 50]]],
  [[[42, 41], [51, 46], [56, 55]], [[37, 33], [29, 37], [26, 45]]],
  [[[38, 50], [34, 58]], [[51, 46], [60, 43]], [[29, 37], [24, 31]], [[40, 24], [46, 21]]],
];

function bakeCracks(scene: Phaser.Scene): boolean {
  for (let stage = 1; stage <= CRACKS.length; stage++) {
    const key = crackKey(stage);
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    g.lineStyle(3, COLORS.navy, 0.9);
    for (const lines of CRACKS.slice(0, stage)) {
      for (const line of lines) {
        for (let i = 1; i < line.length; i++) g.lineBetween(line[i - 1]![0], line[i - 1]![1], line[i]![0], line[i]![1]);
      }
    }
    g.generateTexture(key, T * 2, T * 2);
    g.destroy();
  }
  return true;
}

/** One single tile (a fence piece, a can, the ball), by its 0-based tileset id. */
export const tileKey = (id: number): string => `prop_tile:${id}`;

const T = ARENA.tile;

/** Single tiles that get a texture of their own: the fence pieces and the decor you can kick. */
const SINGLE_TILES: readonly number[] = [TILES.fence, TILES.fencePost, TILES.fenceSide, TILES.fencePostSide, TILES.cans3, TILES.cans2, TILES.ball];

interface Part {
  id: number;
  dx: number;
  dy: number;
}

/** Top-left corner of a tile inside the tileset image (margin and spacing from config/arena.ts). */
function tileOrigin(id: number): { x: number; y: number } {
  const col = id % ARENA.tilesetColumns;
  const row = Math.floor(id / ARENA.tilesetColumns);
  return {
    x: ARENA.tilesetMargin + col * (T + ARENA.tilesetSpacing),
    y: ARENA.tilesetMargin + row * (T + ARENA.tilesetSpacing),
  };
}

function bake(scene: Phaser.Scene, source: CanvasImageSource, key: string, w: number, h: number, parts: readonly Part[]): boolean {
  if (scene.textures.exists(key)) return true;
  const canvas = scene.textures.createCanvas(key, w, h);
  if (!canvas) return false;
  const ctx = canvas.getContext();
  for (const { id, dx, dy } of parts) {
    const from = tileOrigin(id);
    ctx.drawImage(source, from.x, from.y, T, T, dx, dy, T, T);
  }
  canvas.refresh();
  return true;
}

/** Call once the tileset is loaded (the map builder does). Safe to call again: finished textures are kept. Returns false if anything failed. */
export function bakePropTextures(scene: Phaser.Scene): boolean {
  if (!scene.textures.exists(Tex.Tileset)) return false;
  const source = scene.textures.get(Tex.Tileset).getSourceImage() as unknown as CanvasImageSource;
  let ok = true;

  for (const name of Object.keys(OBJECTS) as ObjectName[]) {
    const [tl, tr, bl, br] = objectTiles(OBJECTS[name]);
    ok = bake(scene, source, propKey(name), T * 2, T * 2, [
      { id: tl, dx: 0, dy: 0 },
      { id: tr, dx: T, dy: 0 },
      { id: bl, dx: 0, dy: T },
      { id: br, dx: T, dy: T },
    ]) && ok;
  }
  for (const id of SINGLE_TILES) ok = bake(scene, source, tileKey(id), T, T, [{ id, dx: 0, dy: 0 }]) && ok;
  return bakeCracks(scene) && ok;
}
