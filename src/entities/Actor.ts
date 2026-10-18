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
  readonly hitRadius: number;
  protected knockbackUntil = 0;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly shadowSize: number;

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

  protected syncShadow(): void {
    this.shadow.setPosition(this.x, this.y + this.shadowSize * 0.28);
  }

  override destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
