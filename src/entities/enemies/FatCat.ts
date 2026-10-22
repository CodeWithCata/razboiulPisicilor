/** @file Slow, huge, high-hp cat. */
import type Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { Enemy, type EnemyContext } from '../Enemy';

/** Slow, huge, lots of HP, barely moves when hit. A slow-walking wall. */
export class FatCat extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fat', Tex.CatFat);
  }

  protected override get thinksRarely(): boolean {
    return true; // a straight chase with nothing to time: it can think every few frames while far off screen
  }

  protected override get cullsDraw(): boolean {
    return true; // a plain sprite and its shadow, no rig: it can be hidden while far off camera
  }

  protected think(_time: number, _delta: number, ctx: EnemyContext): void {
    this.chase(ctx, this.stats.speed);
  }
}
