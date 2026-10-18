import type Phaser from 'phaser';

/**
 * Gameplay only ever talks to this interface, never to keyboard or mouse directly.
 * For mobile, add a TouchInput that implements it. No gameplay code changes.
 */
export interface InputSource {
  /** Movement direction, length 0..1. */
  readonly move: Phaser.Math.Vector2;
  /** Aim direction, normalized. Keeps the last value when idle. */
  readonly aim: Phaser.Math.Vector2;
  /** World position being aimed at (mouse cursor). The laser pointer dot follows it. */
  readonly aimPoint: Phaser.Math.Vector2;
  readonly attackHeld: boolean;
  /** True only on the frame the player asked for a spin attack. */
  readonly spinPressed: boolean;
  /** True only on the frame the player asked to throw the belt. */
  readonly throwPressed: boolean;
  /** PowerUpSystem tells the input every frame whether the laser pointer is active. On touch it opens the tap zone where the dot is placed. */
  setLaserAiming(on: boolean): void;
  /** Call once per frame with the player's position (needed for mouse aim). */
  update(origin: Phaser.Types.Math.Vector2Like): void;
}
