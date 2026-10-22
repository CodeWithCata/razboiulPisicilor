/** @file Helpers for placeholder textures: `make` (queued into the atlas, skipped if a real image is loaded), `makeRepeating` (its own texture, for a tileSprite) and `poly` (Phaser 4 needs Vector2 lists). */
import Phaser from 'phaser';
import type { TexKey } from './keys';
import { queuePainted, type Painter } from './atlas';

export type { Painter };

/** Queue one placeholder picture for the atlas (packed by flushPictures, or on the first texRef). A real image loaded under the key wins. */
export function make(scene: Phaser.Scene, key: TexKey, w: number, h: number, paint: Painter): void {
  queuePainted(scene, key, w, h, paint);
}

/** Like make, but on a texture of its own: a tileSprite repeats its texture, and a repeat cannot cross an atlas frame. */
export function makeRepeating(scene: Phaser.Scene, key: TexKey, w: number, h: number, paint: Painter): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Phaser 4 wants real Vector2 objects for polygon drawing. */
export const poly = (coords: ReadonlyArray<readonly [number, number]>): Phaser.Math.Vector2[] =>
  coords.map(([x, y]) => new Phaser.Math.Vector2(x, y));
