import type Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { Enemy, type EnemyContext } from '../Enemy';

/** Slow, huge, lots of HP, barely moves when hit. A slow-walking wall. */
export class FatCat extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fat', Tex.CatFat);
  }

  protected think(_time: number, _delta: number, ctx: EnemyContext): void {
    this.chase(ctx, this.stats.speed);
  }
}
