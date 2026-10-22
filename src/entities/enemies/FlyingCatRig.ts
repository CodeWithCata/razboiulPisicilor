/** @file The flying cat's two wings: loose layers behind the body that flap around the shoulders and follow her turn. Visual only. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { FLYER_WING_PIVOT } from '../../assets/art/cats';
import { Tex } from '../../assets/keys';
import { ANIM } from '../../config/animation';

const HALF = 48; // the wing textures are 96x96 like the body

export class FlyingCatRig {
  private readonly right: Phaser.GameObjects.Image;
  private readonly left: Phaser.GameObjects.Image;
  private phase = Math.random() * Math.PI * 2; // so a flock does not flap in step
  private destroyed = false;
  /** Hidden by draw culling (`setCulled`): a flag of its own, so the owner's `visible` is never the only switch. */
  private culledOff = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.Physics.Arcade.Sprite,
  ) {
    const { x, y } = FLYER_WING_PIVOT;
    this.right = scene.add.image(owner.x, owner.y, ...texArgs(Tex.CatWingR)).setDepth(ANIM.wing.depth).setOrigin(x / 96, y / 96);
    this.left = scene.add.image(owner.x, owner.y, ...texArgs(Tex.CatWingL)).setDepth(ANIM.wing.depth).setOrigin((96 - x) / 96, y / 96);
  }

  /** Same white flash as the body (`Actor.flash` only tints the body). */
  flash(color: number, ms: number): void {
    if (this.destroyed) return;
    for (const wing of [this.right, this.left]) wing.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (this.destroyed) return;
      for (const wing of [this.right, this.left]) wing.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  /** Draw culling (called by `FlyingCat.onCullChange`): hide / show both wings now, with the body's current alpha, so a cat that comes back is whole on that same frame. */
  setCulled(culled: boolean): void {
    if (this.destroyed || culled === this.culledOff) return;
    this.culledOff = culled;
    const o = this.owner;
    this.right.setVisible(!culled && o.visible).setAlpha(o.alpha);
    this.left.setVisible(!culled && o.visible).setAlpha(o.alpha);
  }

  /** Call every frame after the cat has moved (from `preUpdate`). `delta` is in ms. */
  sync(delta: number): void {
    const o = this.owner;
    if (this.destroyed || !o.active) return;
    this.phase += Math.min(delta, 50) * ANIM.wing.rate;
    const W = ANIM.wing;
    const c = Math.cos(o.rotation);
    const s = Math.sin(o.rotation);
    this.placeWing(this.right, 1, 0, c, s);
    this.placeWing(this.left, -1, W.lag, c, s);
  }

  /** One wing picture: it pivots on the body and flaps with `phase`. `c` / `s`: cos / sin of the body's angle, worked out once per frame. */
  private placeWing(img: Phaser.GameObjects.Image, side: 1 | -1, lag: number, c: number, s: number): void {
    const o = this.owner;
    const beat = Math.sin(this.phase - lag); // -1 (wings up and narrow) .. 1 (wings down and wide)
    const wide = (beat + 1) / 2;
    const lx = side * (FLYER_WING_PIVOT.x - HALF) * o.scaleX;
    const ly = (FLYER_WING_PIVOT.y - HALF) * o.scaleY;
    img
      .setPosition(o.x + lx * c - ly * s, o.y + lx * s + ly * c)
      .setRotation(o.rotation + side * Phaser.Math.DegToRad(-beat * ANIM.wing.swingDeg))
      .setScale(o.scaleX * (ANIM.wing.foldX + (1 - ANIM.wing.foldX) * wide), o.scaleY)
      .setAlpha(o.alpha)
      .setVisible(o.visible && !this.culledOff);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.right.destroy();
    this.left.destroy();
  }
}
