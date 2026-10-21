/** @file The two black cinema bars that slide in over the arena for a cutscene. */
import Phaser from 'phaser';
import { GAME } from '../../config/balance';
import { CUTSCENE } from '../../config/cutscene';

export class CutsceneBars {
  /** Bar height in pixels (the dialogue box sits above the bottom one). */
  readonly height = Math.round(GAME.height * CUTSCENE.bars.heightShare);
  private readonly top: Phaser.GameObjects.Rectangle;
  private readonly bottom: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    const h = this.height;
    this.top = scene.add.rectangle(0, -h, GAME.width, h, CUTSCENE.bars.color).setOrigin(0, 0);
    this.bottom = scene.add.rectangle(0, GAME.height, GAME.width, h, CUTSCENE.bars.color).setOrigin(0, 0);
  }

  slideIn(): void {
    this.slide(0, GAME.height - this.height);
  }

  slideOut(onDone: () => void): void {
    this.slide(-this.height, GAME.height);
    this.scene.time.delayedCall(CUTSCENE.bars.slideMs, onDone);
  }

  private slide(topY: number, bottomY: number): void {
    this.scene.tweens.killTweensOf([this.top, this.bottom]);
    this.scene.tweens.add({ targets: this.top, y: topY, duration: CUTSCENE.bars.slideMs, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: this.bottom, y: bottomY, duration: CUTSCENE.bars.slideMs, ease: 'Sine.easeInOut' });
  }
}
