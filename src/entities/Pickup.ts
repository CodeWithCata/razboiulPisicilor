import Phaser from 'phaser';
import { PICKUPS, type PickupKind } from '../config/balance';
import { PICKUP_VISUALS } from '../config/pickups';
import { fitToSize, setCircleHitbox } from '../core/sprite';
import { gameClock } from '../core/clock';

/**
 * Something Varu can walk over. Placeholder look: the item sprite on a glowing ring.
 */
export class Pickup extends Phaser.Physics.Arcade.Sprite {
  readonly kind: PickupKind;
  private readonly bornAt: number;
  private readonly expiresAt: number;
  private readonly baseScale: number;
  private readonly glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, kind: PickupKind, x: number, y: number) {
    const visual = PICKUP_VISUALS[kind];
    super(scene, x, y, visual.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = kind;
    this.bornAt = gameClock.now;
    this.expiresAt = this.bornAt + PICKUPS.lifetimeMs;

    const size = visual.size ?? PICKUPS.size;
    fitToSize(this, size);
    setCircleHitbox(this, PICKUPS.hitRadius);
    this.baseScale = this.scale;
    this.setScale(0.01).setDepth(12);

    this.glow = scene.add
      .circle(x, y, size * 0.62, visual.color, 0.28)
      .setStrokeStyle(3, visual.color, 0.9)
      .setDepth(8);
  }

  /** Pop-in, gentle pulse, blink before expiring. Call every frame. */
  tick(time: number): void {
    const age = time - this.bornAt;
    const pop = Phaser.Math.Easing.Back.Out(Math.min(1, age / 260));
    this.setScale(this.baseScale * pop * (1 + 0.06 * Math.sin(time / 180)));
    this.glow.setScale(pop).setAlpha(0.7 + 0.3 * Math.sin(time / 240));

    const remaining = this.expiresAt - time;
    const visible = remaining > PICKUPS.blinkMs || Math.floor(time / 120) % 2 === 0;
    const alpha = visible ? 1 : 0.3;
    this.setAlpha(alpha);
    this.glow.setAlpha(this.glow.alpha * alpha);

    if (remaining <= 0) this.destroy();
  }

  override destroy(fromScene?: boolean): void {
    this.glow.destroy();
    super.destroy(fromScene);
  }
}
