/** @file A collectible on the floor: item sprite on a glowing ring, bobs, then expires. */
import Phaser from 'phaser';
import { PICKUPS, type PickupKind } from '../config/balance';
import type { TexKey } from '../assets/keys';
import { texArgs } from '../assets/atlas';
import { FX_RING_R } from '../assets/art/fx';
import { Tex } from '../assets/keys';
import { PICKUP_VISUALS, pickLook } from '../config/pickups';
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
  /** The ring under the item: the atlas ring picture in the pickup's color (an `add.circle` here would split the sprite batch). */
  private readonly glow: Phaser.GameObjects.Image;
  private readonly glowScale: number;

  /** `tex`: which look to show (a gift keeps the look it had in the air); without it one is picked at random (`pickLook`). */
  constructor(scene: Phaser.Scene, kind: PickupKind, x: number, y: number, tex?: TexKey) {
    const visual = PICKUP_VISUALS[kind];
    super(scene, x, y, ...texArgs(tex ?? pickLook(kind))); // pictures live in atlas pages: pass the page + frame, not the bare key
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

    this.glowScale = (size * 0.62) / FX_RING_R;
    this.glow = scene.add
      .image(x, y, ...texArgs(Tex.FxRing))
      .setTint(visual.color)
      .setTintMode(Phaser.TintModes.FILL) // one flat color: the gold ring would turn a blue or red glow muddy if it were only multiplied
      .setScale(0.01)
      .setDepth(8);
  }

  /** Pop-in, gentle pulse, blink before expiring. Call every frame. */
  tick(time: number): void {
    const age = time - this.bornAt;
    const pop = Phaser.Math.Easing.Back.Out(Math.min(1, age / 260));
    this.setScale(this.baseScale * pop * (1 + 0.06 * Math.sin(time / 180)));
    this.glow.setScale(this.glowScale * pop).setAlpha(0.7 + 0.3 * Math.sin(time / 240));

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
