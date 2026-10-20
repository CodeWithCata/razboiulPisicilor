/** @file Desktop controls: WASD / arrows, mouse aim, click / Space swing, Shift / right click spin, E throw. */
import Phaser from 'phaser';
import type { InputSource } from './InputSource';

/** Bit for the right mouse button in `pointer.buttons`. */
const RIGHT_BUTTON = 2;

/**
 * Desktop controls: WASD / arrows to move, mouse to aim, hold left click or Space to swing,
 * Shift or right click to spin, E to throw the belt.
 */
export class KeyboardMouseInput implements InputSource {
  readonly move = new Phaser.Math.Vector2();
  readonly aim = new Phaser.Math.Vector2(0, -1);
  readonly aimPoint = new Phaser.Math.Vector2();
  attackHeld = false;
  spinPressed = false;
  throwPressed = false;

  private rightWasDown = false;

  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space' | 'shift' | 'e', Phaser.Input.Keyboard.Key>;

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard plugin not available');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D, space: K.SPACE, shift: K.SHIFT, e: K.E,
    }) as typeof this.keys;
    scene.input.mouse?.disableContextMenu();
  }

  /** The mouse cursor already is the laser dot: nothing to open. */
  setLaserAiming(_on: boolean): void {}

  update(origin: Phaser.Types.Math.Vector2Like): void {
    const k = this.keys;
    const x = Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown);
    const y = Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown);
    this.move.set(x, y);
    if (x !== 0 || y !== 0) this.move.normalize();

    const pointer = this.scene.input.activePointer;
    pointer.updateWorldPoint(this.scene.cameras.main);
    this.aimPoint.set(pointer.worldX, pointer.worldY);
    const dx = pointer.worldX - (origin.x ?? 0);
    const dy = pointer.worldY - (origin.y ?? 0);
    if (dx * dx + dy * dy > 16) this.aim.set(dx, dy).normalize();

    // Right click is the spin, so it must not count as a swing too.
    const rightDown = (pointer.buttons & RIGHT_BUTTON) !== 0;
    this.attackHeld = (pointer.isDown && !rightDown) || k.space.isDown;
    this.spinPressed = Phaser.Input.Keyboard.JustDown(k.shift) || (rightDown && !this.rightWasDown);
    this.throwPressed = Phaser.Input.Keyboard.JustDown(k.e);
    this.rightWasDown = rightDown;
  }
}
