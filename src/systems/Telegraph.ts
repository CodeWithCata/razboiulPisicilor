/** @file Ground warning visuals for boss attacks (`telegraphCircle`, `telegraphLine`, `telegraphLineAimed`, `telegraphRect`) that can be cancelled early. */
import type Phaser from 'phaser';

/** Something that can be cancelled early (when a boss gets stunned, for example). */
export interface Telegraph {
  destroy(): void;
}

const RED = 0xff4d4d;

/** Draw depth of every ground warning. Lights out (`Blackout`) lifts it above the dark sheet so the warnings stay readable. */
export const telegraphDepth = { value: 7 };

/** Ground warning: a red circle that fills up until the attack lands. Placeholder visual. */
export function telegraphCircle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  durationMs: number,
  color = RED,
): Telegraph {
  const outline = scene.add.circle(x, y, radius, color, 0.1).setStrokeStyle(4, color, 0.9).setDepth(telegraphDepth.value);
  const fill = scene.add.circle(x, y, radius, color, 0.3).setDepth(telegraphDepth.value).setScale(0.05);
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
  const lane = scene.add.rectangle(x, y, length, width, color, 0.1).setOrigin(0, 0.5).setRotation(angle).setStrokeStyle(3, color, 0.8).setDepth(telegraphDepth.value);
  const fill = scene.add.rectangle(x, y, length, width, color, 0.3).setOrigin(0, 0.5).setRotation(angle).setDepth(telegraphDepth.value).setScale(0.02, 1);
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

/** A telegraph lane that can turn while it fills (the charge follows Varu) and then lock (it turns white). */
export interface AimedTelegraph extends Telegraph {
  aim(x: number, y: number, angle: number): void;
  /** Make the lane shorter or longer (a wall or a prop ends it). */
  setLength(length: number): void;
  lock(): void;
}

/** Like `telegraphLine`, but the lane can be moved and turned every frame with `aim`, and `lock` marks that it has stopped following. */
export function telegraphLineAimed(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  durationMs: number,
  color = RED,
): AimedTelegraph {
  const lane = scene.add.rectangle(x, y, length, width, color, 0.1).setOrigin(0, 0.5).setRotation(angle).setStrokeStyle(3, color, 0.8).setDepth(telegraphDepth.value);
  const fill = scene.add.rectangle(x, y, length, width, color, 0.3).setOrigin(0, 0.5).setRotation(angle).setDepth(telegraphDepth.value).setScale(0.02, 1);
  const tween = scene.tweens.add({
    targets: fill, scaleX: 1, duration: durationMs, ease: 'Linear',
    onComplete: () => { lane.destroy(); fill.destroy(); },
  });
  return {
    aim: (nx, ny, a) => {
      lane.setPosition(nx, ny).setRotation(a);
      fill.setPosition(nx, ny).setRotation(a);
    },
    setLength: (len) => {
      lane.setSize(len, width);
      fill.setSize(len, width);
    },
    lock: () => {
      lane.setStrokeStyle(5, 0xffffff, 1);
    },
    destroy: () => {
      tween.remove();
      lane.destroy();
      fill.destroy();
    },
  };
}

/**
 * Ground warning for a straight-edged area (a band of floor). `fillIt` = it fills up like the other warnings; without it
 * only a calm outline shows for `durationMs` (the safe band of the red carpet).
 */
export function telegraphRect(
  scene: Phaser.Scene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  durationMs: number,
  color = RED,
  fillIt = true,
): Telegraph {
  const w = x2 - x1;
  const h = y2 - y1;
  const cx = x1 + w / 2;
  const cy = y1 + h / 2;
  const outline = scene.add.rectangle(cx, cy, w, h, color, fillIt ? 0.1 : 0.14).setStrokeStyle(4, color, 0.9).setDepth(telegraphDepth.value);
  if (!fillIt) {
    const timer = scene.tweens.add({ targets: outline, alpha: 1, duration: durationMs, onComplete: () => outline.destroy() });
    return { destroy: () => { timer.remove(); outline.destroy(); } };
  }
  const fill = scene.add.rectangle(cx, cy, w, h, color, 0.3).setDepth(telegraphDepth.value);
  fill.setScale(w < h ? 0.05 : 1, w < h ? 1 : 0.05); // it grows across the thin side
  const tween = scene.tweens.add({
    targets: fill, scaleX: 1, scaleY: 1, duration: durationMs, ease: 'Linear',
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
