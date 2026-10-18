import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { NINJA } from '../../config/balance';
import { bus, Events } from '../../core/events';
import type { Player } from '../Player';
import { Enemy, type EnemyContext } from '../Enemy';
import { gameClock } from '../../core/clock';

type NinjaPhase = 'chase' | 'hidden';

/** Chases, then vanishes and reappears right behind Varu's back. */
export class NinjaCat extends Enemy {
  private phase: NinjaPhase = 'chase';
  private nextTeleportAt: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ninja', Tex.CatNinja);
    this.nextTeleportAt = gameClock.now + this.randomDelay();
  }

  override get hittable(): boolean {
    return this.phase === 'chase';
  }

  protected think(time: number, _delta: number, ctx: EnemyContext): void {
    if (this.phase === 'hidden') return;

    // Distracted by the laser: just follow the dot, no teleporting.
    if (ctx.lure) {
      this.chase(ctx, this.stats.speed);
      return;
    }
    const { player } = ctx;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (time >= this.nextTeleportAt && dist > NINJA.minDistance) {
      this.vanish(player);
      return;
    }
    this.chase(ctx, this.stats.speed);
  }

  private vanish(player: Player): void {
    this.phase = 'hidden';
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    bus.emit(Events.Teleport, { x: this.x, y: this.y });
    this.scene.tweens.add({ targets: this, alpha: 0.15, duration: NINJA.vanishMs * 0.6 });

    this.scene.time.delayedCall(NINJA.vanishMs, () => {
      if (!this.active) return;
      // "Behind" = the opposite of where Varu is facing, kept inside the arena.
      const bounds = this.scene.physics.world.bounds;
      const nx = Phaser.Math.Clamp(player.x - player.facing.x * NINJA.behindDistance, 30, bounds.width - 30);
      const ny = Phaser.Math.Clamp(player.y - player.facing.y * NINJA.behindDistance, 30, bounds.height - 30);
      const spot = this.obstacles.nearestOpen(nx, ny, this.hitRadius); // never lands inside a wall
      (this.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
      (this.body as Phaser.Physics.Arcade.Body).enable = true;
      this.setAlpha(1);
      bus.emit(Events.Teleport, { x: spot.x, y: spot.y });
      this.phase = 'chase';
      this.nextTeleportAt = gameClock.now + this.randomDelay();
    });
  }

  private randomDelay(): number {
    return Phaser.Math.Between(NINJA.teleportMinMs, NINJA.teleportMaxMs);
  }
}
