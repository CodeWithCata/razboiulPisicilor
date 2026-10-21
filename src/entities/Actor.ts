/** @file Shared base for Varu and every cat: hp, shadow, hit flash, knockback. */
import Phaser from 'phaser';
import { Tex, type TexKey } from '../assets/keys';
import { fitToSize, setCircleHitbox } from '../core/sprite';
import { gameClock } from '../core/clock';

export interface ActorOptions {
  maxHp: number;
  size: number; // displayed size, game px
  hitRadius: number; // physics circle, game px
}

/** Shared base for Varu and every cat: hp, shadow, hit flash, knockback. */
export abstract class Actor extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  readonly maxHp: number;
  /** Varu changes it when he grows ("Big Varu"); for every cat it stays what it was. */
  hitRadius: number;
  protected knockbackUntil = 0;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly shadowSize: number;
  private shadowGrow = 1;

  protected constructor(scene: Phaser.Scene, x: number, y: number, texture: TexKey, opts: ActorOptions) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = opts.maxHp;
    this.hp = opts.maxHp;
    this.hitRadius = opts.hitRadius;
    this.shadowSize = opts.size;

    fitToSize(this, opts.size);
    setCircleHitbox(this, opts.hitRadius);

    this.shadow = scene.add.image(x, y, Tex.Shadow).setDepth(0);
    this.shadow.setDisplaySize(opts.size * 0.9, opts.size * 0.45);
    this.setDepth(10);
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get isKnockedBack(): boolean {
    return gameClock.now < this.knockbackUntil;
  }

  /** Shove away from a point. Movement code should skip while `isKnockedBack`. */
  applyKnockback(fromX: number, fromY: number, force: number, durationMs = 140): void {
    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
    this.knockbackUntil = gameClock.now + durationMs;
  }

  /** Quick white flash (Phaser 4 style: tint + FILL mode). */
  flash(color = 0xffffff, ms = 80): void {
    this.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (!this.active) return;
      this.clearTint();
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  /** Fade the ground shadow along with the cat (a cat that fades out must not leave its shadow behind). */
  protected setShadowAlpha(alpha: number): void {
    this.shadow.setAlpha(alpha);
  }

  /** Hides or shows the ground shadow (a cat locked in a bed has none). */
  protected setShadowVisible(visible: boolean): void {
    this.shadow.setVisible(visible);
  }

  /** The shadow while an actor jumps: `size` and `alpha` are shares of the normal ones (1 and 1 = on the ground, call that to put it back). */
  protected setShadowJump(size: number, alpha: number): void {
    this.shadow.setDisplaySize(this.shadowSize * 0.9 * size * this.shadowGrow, this.shadowSize * 0.45 * size * this.shadowGrow).setAlpha(alpha);
  }

  /** The ground shadow grows with the body (Varu when he is big). 1 = normal. */
  protected setShadowScale(k: number): void {
    this.shadowGrow = k;
    this.setShadowJump(1, 1);
  }

  /** Puts the shadow under the sprite. Public so cutscenes can move a cat and keep its shadow with it. */
  syncShadow(): void {
    this.shadow.setPosition(this.x, this.y + this.shadowSize * 0.28 * this.shadowGrow);
  }

  override destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
