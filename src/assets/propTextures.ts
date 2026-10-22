/** @file Cuts each arena prop out of the tileset into its own texture and draws the rock-crack overlays (used by systems/props/). */
import type Phaser from 'phaser';
import { ARENA, OBJECTS, TILES, objectTiles, type ObjectName } from '../config/arena';
import { COLORS } from '../config/style';
import { BUSH_VARIANTS } from '../config/props';
import { Tex } from './keys';
import { flushPictures, placedAt, queueDrawn, queuePainted } from './atlas';

/**
 * The arena props (bush, rock, box, ...) are tiles in the Tiled map, and a tile cannot wobble.
 * So each one is also copied ONCE out of the tileset image into its own small texture; systems/props/ draws those as sprites.
 * Copying with drawImage (one tile at a time, at its exact spot in the tileset) keeps the 1px extruded border out of the picture.
 */
export const propKey = (name: ObjectName): string => `prop:${name}`;
/** The bush picture for a color variant (config BUSH_VARIANTS). Variant 0 or an unknown one is the plain `prop:bush`. */
export const bushKey = (variant: number): string => (variant > 0 ? `prop:bush:${variant}` : propKey('bush'));
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
    queuePainted(scene, crackKey(stage), T * 2, T * 2, (g) => {
      g.lineStyle(3, COLORS.navy, 0.9);
      for (const lines of CRACKS.slice(0, stage)) {
        for (const line of lines) {
          for (let i = 1; i < line.length; i++) g.lineBetween(line[i - 1]![0], line[i - 1]![1], line[i]![0], line[i]![1]);
        }
      }
    });
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

function bake(scene: Phaser.Scene, source: CanvasImageSource, key: string, w: number, h: number, parts: readonly Part[]): void {
  queueDrawn(scene, key, w, h, (ctx, x, y) => {
    for (const { id, dx, dy } of parts) {
      const from = tileOrigin(id);
      ctx.drawImage(source, from.x, from.y, T, T, x + dx, y + dy, T, T);
    }
  });
}

/** Call once the tileset is loaded (the map builder does). Safe to call again: finished textures are kept. Returns false if anything failed. */
export function bakePropTextures(scene: Phaser.Scene): boolean {
  if (!scene.textures.exists(Tex.Tileset)) return false;
  const source = scene.textures.get(Tex.Tileset).getSourceImage() as unknown as CanvasImageSource;
  let ok = true;

  for (const name of Object.keys(OBJECTS) as ObjectName[]) {
    const [tl, tr, bl, br] = objectTiles(OBJECTS[name]);
    bake(scene, source, propKey(name), T * 2, T * 2, [
      { id: tl, dx: 0, dy: 0 },
      { id: tr, dx: T, dy: 0 },
      { id: bl, dx: 0, dy: T },
      { id: br, dx: T, dy: T },
    ]);
  }
  ok = bakeBushVariants(scene) && ok;
  for (const id of SINGLE_TILES) bake(scene, source, tileKey(id), T, T, [{ id, dx: 0, dy: 0 }]);
  ok = bakeCracks(scene) && ok;
  flushPictures();
  return ok;
}

/** Rotates the hue of a plain RGB color (all 0..255) by `deg`, scaling its saturation by `sat`. */
function turnHue(r: number, g: number, b: number, deg: number, sat: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const v = max / 255;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = Math.min(1, (max === 0 ? 0 : d / max) * sat);
  h = (((h + deg) % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

/**
 * One recolored copy of the bush picture per BUSH_VARIANTS entry with a `hueShift`: only the green foliage (hue 70-175 degrees,
 * clearly colored) is turned, so the navy outline, the brown stems and the shadow tones stay as they are.
 */
function bakeBushVariants(scene: Phaser.Scene): boolean {
  const plainKey = propKey('bush');
  BUSH_VARIANTS.forEach((variant, index) => {
    if (index === 0 || variant.hueShift === 0) return;
    queueDrawn(scene, bushKey(index), T * 2, T * 2, (ctx, x, y) => {
      // Copy the plain bush out of its atlas page (it is queued before this one), then turn its foliage.
      const at = placedAt(plainKey);
      const page = at ? scene.textures.get(at.page).getSourceImage() as HTMLCanvasElement : null;
      if (!at || !page) return;
      const image = page.getContext('2d')!.getImageData(at.x, at.y, T * 2, T * 2);
      const px = image.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3]! < 8) continue;
        const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max === 0 || (max - min) / max < 0.2 || g < r || g < b) continue; // not foliage green
        const [nr, ng, nb] = turnHue(r, g, b, variant.hueShift, variant.saturation);
        px[i] = nr; px[i + 1] = ng; px[i + 2] = nb;
      }
      ctx.putImageData(image, x, y);
    });
  });
  return true;
}
