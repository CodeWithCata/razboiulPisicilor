/** @file `fitToSize` and `setCircleHitbox`: size and hitboxes in game pixels, independent of texture size. */
import type Phaser from 'phaser';

/** Scale a sprite so its biggest side is `size` game pixels (any texture size works). */
export function fitToSize(sprite: Phaser.GameObjects.Sprite, size: number): void {
  const longest = Math.max(sprite.frame.realWidth, sprite.frame.realHeight);
  sprite.setScale(size / longest);
}

/** Circle hitbox in GAME pixels, centered on the sprite, independent of texture size. */
export function setCircleHitbox(sprite: Phaser.Physics.Arcade.Sprite, worldRadius: number): void {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  const r = worldRadius / Math.abs(sprite.scaleX || 1);
  body.setCircle(r, sprite.frame.realWidth / 2 - r, sprite.frame.realHeight / 2 - r);
}
