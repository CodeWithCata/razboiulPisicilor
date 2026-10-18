import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { KAMIKAZE } from '../../config/balance';
import { bus, Events, type ExplosionPayload } from '../../core/events';
import { Enemy, type EnemyContext } from '../Enemy';

/**
 * Sprints at Varu, lights its fuse when close, then explodes in fur.
 * Kill it with the belt BEFORE the fuse ends and it just pops harmlessly.
 */
export class KamikazeCat extends Enemy {
  private fuseStartedAt = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'kamikaze', Tex.CatKamikaze);
  }

  protected think(time: number, _delta: number, ctx: EnemyContext): void {
    // Distracted by the laser (and no fuse lit yet): just follow the dot.
    if (ctx.lure && this.fuseStartedAt < 0) {
      this.chase(ctx, this.stats.speed);
      return;
    }
    const { player } = ctx;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (this.fuseStartedAt < 0 && dist < KAMIKAZE.triggerRange) this.fuseStartedAt = time;

    const fuseLit = this.fuseStartedAt >= 0;
    const speed = this.stats.speed * (fuseLit ? KAMIKAZE.fuseSpeedFactor : 1);
    this.steerTo(player, speed);

    if (!fuseLit) return;
    // Blink red while the fuse burns.
    if (Math.floor(time / 90) % 2 === 0) this.setTint(0xff4444);
    else this.clearTint();

    if (time - this.fuseStartedAt >= KAMIKAZE.fuseMs) this.explode();
  }

  private explode(): void {
    const payload: ExplosionPayload = { x: this.x, y: this.y, radius: KAMIKAZE.blastRadius, damage: KAMIKAZE.blastDamage };
    bus.emit(Events.Explosion, payload);
    this.destroy(); // self-destruct: no score for Varu
  }
}
