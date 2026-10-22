/** @file Input driven by a cutscene script instead of a thumb or a mouse: Varu walks and turns with his real animation. */
import Phaser from 'phaser';
import type { InputSource } from './InputSource';
import { hyp } from '../core/hyp';

/**
 * The cutscene director writes `move` and `aim`; GameScene feeds this to `Player.tick` while a cutscene plays
 * (gameplay only ever reads an InputSource, so Varu's walk, waddle and legs need no special case). It never attacks.
 */
export class ScriptedInput implements InputSource {
  readonly move = new Phaser.Math.Vector2(0, 0);
  readonly aim = new Phaser.Math.Vector2(0, 1);
  readonly aimPoint = new Phaser.Math.Vector2(0, 0);
  readonly attackHeld = false;
  readonly spinPressed = false;
  readonly throwPressed = false;

  setLaserAiming(_on: boolean): void {}

  update(_origin: Phaser.Types.Math.Vector2Like): void {}

  /** Walk in this direction (any length; it is normalized) and look the same way. */
  walk(dx: number, dy: number): void {
    const length = hyp(dx, dy);
    if (length < 0.0001) {
      this.move.set(0, 0);
      return;
    }
    this.move.set(dx / length, dy / length);
    this.aim.set(dx / length, dy / length);
  }

  /** Look this way without walking. */
  look(dx: number, dy: number): void {
    const length = hyp(dx, dy);
    if (length > 0.0001) this.aim.set(dx / length, dy / length);
  }

  /** Stand still (he keeps looking where he looked). */
  stop(): void {
    this.move.set(0, 0);
  }
}
