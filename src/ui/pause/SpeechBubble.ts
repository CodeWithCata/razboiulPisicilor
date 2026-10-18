import Phaser from 'phaser';
import { PAUSE } from '../../config/pause';
import { COLORS, FONT } from '../../config/style';

/** A cream speech bubble with a navy outline and a little tail pointing down at the speaker. It pops in. */
export function createSpeechBubble(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Container {
  const B = PAUSE.decor.bubble;
  const text = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: `${B.size}px`, color: '#1b2340' }).setOrigin(0.5);
  const w = text.width + B.padX * 2;
  const h = text.height + B.padY * 2;

  const g = scene.add.graphics();
  g.fillStyle(COLORS.cream, 1).fillRoundedRect(-w / 2, -h / 2, w, h, B.radius);
  g.lineStyle(B.border, COLORS.navy, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, B.radius);
  // Tail: a cream triangle over the bottom edge, outlined on its two slanted sides only.
  g.fillStyle(COLORS.cream, 1).fillTriangle(-B.tail, h / 2 - 1, B.tail, h / 2 - 1, 0, h / 2 + B.tail + 4);
  g.lineStyle(B.border, COLORS.navy, 1).lineBetween(-B.tail, h / 2 + 1, 0, h / 2 + B.tail + 4).lineBetween(B.tail, h / 2 + 1, 0, h / 2 + B.tail + 4);

  // Keep the whole bubble on screen.
  const bx = Math.max(w / 2 + B.minX, x);
  const bubble = scene.add.container(bx, y, [g, text]).setDepth(PAUSE.depth + 2);
  scene.tweens.add({ targets: bubble, scale: { from: 0, to: 1 }, duration: B.popMs, ease: 'Back.easeOut' });
  return bubble;
}
