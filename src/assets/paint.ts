/** @file Helpers for placeholder textures: `make` (draw once, only if no real image loaded) and `poly` (Phaser 4 needs Vector2 lists). */
import Phaser from 'phaser';
import type { TexKey } from './keys';

export type Painter = (g: Phaser.GameObjects.Graphics) => void;

/** Draw one placeholder texture, only if no real image was loaded for it. */
export function make(scene: Phaser.Scene, key: TexKey, w: number, h: number, paint: Painter): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Phaser 4 wants real Vector2 objects for polygon drawing. */
export const poly = (coords: ReadonlyArray<readonly [number, number]>): Phaser.Math.Vector2[] =>
  coords.map(([x, y]) => new Phaser.Math.Vector2(x, y));
