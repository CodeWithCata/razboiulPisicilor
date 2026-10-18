import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { Enemy, type EnemyContext } from '../Enemy';

/** Runs straight at Varu. Each cat gets a slightly different speed so they spread out. */
export class NormalCat extends Enemy {
  private readonly speedVariance = Phaser.Math.FloatBetween(0.88, 1.12);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'normal', Tex.CatNormal);
  }

  protected think(_time: number, _delta: number, ctx: EnemyContext): void {
    this.chase(ctx, this.stats.speed * this.speedVariance);
  }
}
