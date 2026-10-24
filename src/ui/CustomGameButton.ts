/** @file The custom game button on the main menu: a code-drawn "sliders" badge with the name under it, same hover pop as the difficulty cat. The blurb and the key reminder are separate texts the menu puts under it. */
import Phaser from 'phaser';
import { CUSTOM_MENU } from '../config/customScreen';
import { MENU } from '../config/menu';
import { FONT } from '../config/style';

export interface CustomGameButtonOptions {
  /** Middle of the whole button (badge + name). */
  x: number;
  y: number;
  /** Width (= height) of the badge. */
  iconW: number;
  /** Font size of the name under the badge. */
  size: number;
  label: string;
  /** CSS color of the name. */
  textColor: string;
}

const labelHeight = (size: number): number => Math.round(size * 1.25);

/** Whole height of the button: the badge, the gap and the name (the menu places the blurb under it using this). */
export const customGameButtonHeight = (iconW: number, size: number): number => iconW + CUSTOM_MENU.labelGap + labelHeight(size);

/** The badge: a navy rounded square with a lilac border, a soft glow behind it and three sliders (a track and a gold knob each). */
function drawBadge(g: Phaser.GameObjects.Graphics, iconW: number, cy: number): void {
  const B = CUSTOM_MENU.badge;
  const S = CUSTOM_MENU.sliders;
  const half = iconW / 2;
  g.fillStyle(B.auraColor, B.auraAlpha).fillCircle(0, cy, iconW * B.auraRadius);
  g.fillStyle(B.fill, 1).fillRoundedRect(-half, cy - half, iconW, iconW, B.radius);
  g.lineStyle(B.border, B.borderColor, 1).strokeRoundedRect(-half, cy - half, iconW, iconW, B.radius);
  const trackW = iconW * S.trackW;
  for (const row of S.rows) {
    const y = cy + row.y * iconW;
    g.fillStyle(S.trackColor, 1).fillRoundedRect(-trackW / 2, y - S.trackThickness / 2, trackW, S.trackThickness, S.trackThickness / 2);
    const knobX = -trackW / 2 + trackW * row.knob;
    g.fillStyle(S.knobColor, 1).fillCircle(knobX, y, iconW * S.knobR);
    g.lineStyle(S.knobBorder, B.fill, 1).strokeCircle(knobX, y, iconW * S.knobR);
  }
}

/**
 * Like `createDifficultyCat`: the container's middle is the middle of badge + name, so `setSize` fits both and the whole thing is the tap target.
 * It pops in and grows a little under the mouse. The scene decides what a tap does.
 */
export function createCustomGameButton(scene: Phaser.Scene, o: CustomGameButtonOptions): Phaser.GameObjects.Container {
  const total = customGameButtonHeight(o.iconW, o.size);
  const badgeCy = -total / 2 + o.iconW / 2;

  const badge = scene.add.graphics();
  drawBadge(badge, o.iconW, badgeCy);

  const label = scene.add
    .text(0, total / 2 - labelHeight(o.size) / 2, o.label, { fontFamily: FONT, fontSize: `${o.size}px`, color: o.textColor, stroke: '#1b2340', strokeThickness: 5 })
    .setOrigin(0.5);

  const button = scene.add.container(o.x, o.y, [badge, label]).setDepth(MENU.button.depth);
  // The name can be wider than the badge: the tap target covers whichever is wider.
  button.setSize(Math.max(o.iconW, label.width), total).setInteractive({ useHandCursor: true });
  button.setScale(CUSTOM_MENU.pop.from);
  scene.tweens.add({ targets: button, scale: 1, duration: CUSTOM_MENU.pop.ms, ease: 'Back.easeOut' });

  const pop = (scale: number): void => {
    scene.tweens.add({ targets: button, scale, duration: MENU.button.hoverMs, ease: 'Sine.easeOut' });
  };
  button.on('pointerover', () => pop(MENU.button.hoverScale));
  button.on('pointerout', () => pop(1));
  return button;
}
