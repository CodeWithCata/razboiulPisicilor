/** @file Ground warning visuals for boss attacks (`telegraphCircle`, `telegraphLine`) that can be cancelled early. */
import type Phaser from 'phaser';

/** Something that can be cancelled early (when a boss gets stunned, for example). */
export interface Telegraph {
  destroy(): void;
}

const RED = 0xff4d4d;

/** Ground warning: a red circle that fills up until the attack lands. Placeholder visual. */
export function telegraphCircle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  durationMs: number,
  color = RED,
): Telegraph {
  const outline = scene.add.circle(x, y, radius, color, 0.1).setStrokeStyle(4, color, 0.9).setDepth(7);
  const fill = scene.add.circle(x, y, radius, color, 0.3).setDepth(7).setScale(0.05);
  const tween = scene.tweens.add({
    targets: fill, scale: 1, duration: durationMs, ease: 'Linear',
    onComplete: () => { outline.destroy(); fill.destroy(); },
  });
  return {
    destroy: () => {
      tween.remove();
      outline.destroy();
      fill.destroy();
    },
  };
}

/** Ground warning for a straight dash: a red lane that fills along its length. */
export function telegraphLine(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  durationMs: number,
  color = RED,
): Telegraph {
  const lane = scene.add.rectangle(x, y, length, width, color, 0.1).setOrigin(0, 0.5).setRotation(angle).setStrokeStyle(3, color, 0.8).setDepth(7);
  const fill = scene.add.rectangle(x, y, length, width, color, 0.3).setOrigin(0, 0.5).setRotation(angle).setDepth(7).setScale(0.02, 1);
  const tween = scene.tweens.add({
    targets: fill, scaleX: 1, duration: durationMs, ease: 'Linear',
    onComplete: () => { lane.destroy(); fill.destroy(); },
  });
  return {
    destroy: () => {
      tween.remove();
      lane.destroy();
      fill.destroy();
    },
  };
}
