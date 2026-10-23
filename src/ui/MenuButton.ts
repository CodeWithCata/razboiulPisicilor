/** @file A menu button (`createMenuButton`) with a hover pop. */
import Phaser from 'phaser';
import { MENU } from '../config/menu';
import { COLORS, FONT } from '../config/style';

export interface MenuButtonOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  size: number;
  /** Draws a gold "play" triangle before the label (drawn, not a font glyph, so it never depends on the font). */
  playIcon?: boolean;
  /** Gold border and gold text. Without it: cream text and a quiet blue-grey border. */
  accent?: boolean;
  /** Makes the whole button a click target with a hover pop. The scene decides what a click does. */
  interactive?: boolean;
  /** Overrides the label color (the difficulty button shows its level in green / orange / red). */
  textColor?: string;
}

/** A navy pill with a border: same look as the pause menu rows. */
export function createMenuButton(scene: Phaser.Scene, o: MenuButtonOptions): Phaser.GameObjects.Container {
  const B = MENU.button;
  const textColor = o.textColor ?? (o.accent ? '#f5c518' : '#fff3d6');

  const back = scene.add.graphics();
  back.fillStyle(COLORS.navy, 0.96).fillRoundedRect(-o.w / 2, -o.h / 2, o.w, o.h, o.h / B.radiusFactor);
  back.lineStyle(B.border, o.accent ? COLORS.gold : 0x4a5275, 1).strokeRoundedRect(-o.w / 2, -o.h / 2, o.w, o.h, o.h / B.radiusFactor);

  const label = scene.add.text(0, 2, o.label, { fontFamily: FONT, fontSize: `${o.size}px`, color: textColor, stroke: '#1b2340', strokeThickness: 5 }).setOrigin(0, 0.5);
  const items: Phaser.GameObjects.GameObject[] = [back, label];

  // Center the icon + label as one group.
  const iconW = o.playIcon ? B.playIconW + B.playIconGap : 0;
  const startX = -(iconW + label.width) / 2;
  label.setX(startX + iconW);
  if (o.playIcon) {
    const icon = scene.add.graphics();
    const h = o.size * 0.62;
    icon.fillStyle(COLORS.gold, 1).fillTriangle(startX, -h / 2, startX, h / 2, startX + B.playIconW, 0);
    items.push(icon);
  }

  const button = scene.add.container(o.x, o.y, items).setDepth(B.depth);
  if (o.interactive) {
    button.setSize(o.w, o.h).setInteractive({ useHandCursor: true });
    const pop = (scale: number): void => {
      scene.tweens.add({ targets: button, scale, duration: B.hoverMs, ease: 'Sine.easeOut' });
    };
    button.on('pointerover', () => pop(B.hoverScale));
    button.on('pointerout', () => pop(1));
  }
  return button;
}
