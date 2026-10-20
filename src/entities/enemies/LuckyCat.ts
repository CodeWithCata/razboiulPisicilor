/** @file Pisica Norocoasă (the lucky cat): a golden cat that runs from Varu, never hurts, and vanishes after a while unless he catches her. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { LUCKY } from '../../config/balance';
import { WORLD } from '../../config/arena';
import { gameClock } from '../../core/clock';
import { bus, Events, type PointPayload, type TeleportPayload } from '../../core/events';
import { hasClearLine } from '../../core/steering';
import { Enemy, type EnemyContext } from '../Enemy';
import type { Player } from '../Player';

/**
 * Runs AWAY from Varu (numbers: `LUCKY` in config/balance.ts). Catching her is a normal kill (`Events.EnemyKilled` with type 'lucky'):
 * PickupSystem drops the reward. If she lives for `lifeMs` she vanishes in a puff. She ignores the laser pointer, and the wave never waits for her.
 */
export class LuckyCat extends Enemy {
  private readonly bornAt = gameClock.now;
  private announced = false;
  private nextRetargetAt = 0;
  private fleeTo: Phaser.Types.Math.Vector2Like | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'lucky', Tex.CatLucky);
  }

  override get isBonus(): boolean {
    return true;
  }

  protected think(time: number, _delta: number, ctx: EnemyContext): void {
    if (!this.announced) {
      this.announced = true;
      const appeared: PointPayload = { x: this.x, y: this.y };
      bus.emit(Events.LuckySpawn, appeared);
    }
    if (time - this.bornAt >= LUCKY.lifeMs) {
      this.vanish();
      return;
    }
    if (!this.fleeTo || time >= this.nextRetargetAt) {
      this.nextRetargetAt = time + LUCKY.retargetMs;
      this.fleeTo = this.pickFleeTarget(ctx.player);
    }
    this.steerTo(this.fleeTo, this.stats.speed);
  }

  /** Of a few directions around "straight away from Varu", the one with a clear line that ends up farthest from him (turning costs a little). */
  private pickFleeTarget(player: Player): Phaser.Types.Math.Vector2Like {
    const away = Math.atan2(this.y - player.y, this.x - player.x);
    const m = LUCKY.wallMargin;
    const point = (angle: number): { x: number; y: number } => ({
      x: Phaser.Math.Clamp(this.x + Math.cos(angle) * LUCKY.fleeStep, m, WORLD.width - m),
      y: Phaser.Math.Clamp(this.y + Math.sin(angle) * LUCKY.fleeStep, m, WORLD.height - m),
    });
    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;
    for (const deg of LUCKY.turnStepsDeg) {
      const target = point(away + Phaser.Math.DegToRad(deg));
      if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) < LUCKY.minStep) continue; // cornered that way
      if (!hasClearLine(this.x, this.y, target.x, target.y, this.hitRadius, this.obstacles)) continue;
      const score = Phaser.Math.Distance.Between(target.x, target.y, player.x, player.y) - (Math.abs(deg) / 45) * LUCKY.turnPenalty;
      if (score > bestScore) {
        bestScore = score;
        best = target;
      }
    }
    return best ?? point(away); // boxed in: just run straight away
  }

  /** Time is up: she disappears in a puff (the line is Effects' job). */
  private vanish(): void {
    const out: TeleportPayload = { x: this.x, y: this.y, ninja: 'out' };
    bus.emit(Events.Teleport, out);
    const gone: PointPayload = { x: this.x, y: this.y };
    bus.emit(Events.LuckyGone, gone);
    this.destroy();
  }
}
