import type Phaser from 'phaser';
import type { BossType } from '../config/balance';
import { BOSS_CARD } from '../config/jokes';
import { createPhotoFrame } from './PhotoFrame';

/** Distance off the left edge where the card waits before it slides in. */
const OFFSCREEN_X = -220;

/** A friend's photo slides in from the left when a boss appears, holds, and slides away. */
export function showBossIntroCard(scene: Phaser.Scene, boss: BossType): void {
  scene.time.delayedCall(BOSS_CARD.delayMs, () => {
    const card = createPhotoFrame(scene, boss, {
      x: OFFSCREEN_X,
      y: BOSS_CARD.y,
      size: BOSS_CARD.photoSize,
      tiltDeg: BOSS_CARD.tiltDeg,
    }).setDepth(90);

    scene.tweens.add({
      targets: card,
      x: BOSS_CARD.x,
      duration: BOSS_CARD.slideMs,
      ease: 'Back.easeOut',
      onComplete: () =>
        scene.tweens.add({
          targets: card,
          x: OFFSCREEN_X,
          delay: BOSS_CARD.holdMs,
          duration: BOSS_CARD.slideMs,
          ease: 'Cubic.easeIn',
          onComplete: () => card.destroy(),
        }),
    });
  });
}
