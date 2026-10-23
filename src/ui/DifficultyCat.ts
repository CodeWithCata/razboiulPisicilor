/** @file The difficulty button on the main menu, shaped like a cat's head: pointy ears, whiskers on the cheeks, the level name on the face. Same navy look and hover pop as `createMenuButton`. */
import Phaser from 'phaser';
import { DIFFICULTY_CAT } from '../config/difficulty';
import { MENU } from '../config/menu';
import { COLORS, FONT } from '../config/style';

export interface DifficultyCatOptions {
  x: number;
  y: number;
  /** Width and height of the HEAD (the ears stand on top of it, `DIFFICULTY_CAT.earH` more). */
  w: number;
  h: number;
  size: number;
  label: string;
  textColor: string;
}

/** Whole height of the button: the head plus the ears (the click area and the spacing use this). */
export const difficultyCatHeight = (headH: number): number => headH + DIFFICULTY_CAT.earH;

/**
 * The container's middle is the middle of the whole shape (head + ears), so the click area (`setSize`) fits the ears too.
 * The outline is ONE path (ears are part of it, no seam where the ears meet the head): corner arcs, an ear going up to a tip and down again, twice.
 */
export function createDifficultyCat(scene: Phaser.Scene, o: DifficultyCatOptions): Phaser.GameObjects.Container {
  const C = DIFFICULTY_CAT;
  const hw = o.w / 2;
  const hh = o.h / 2;
  const r = hh * C.cornerShare;
  const ear = C.earH;
  const shift = ear / 2; // the head sits this much lower than the container's middle
  const top = -hh + shift;
  const bottom = hh + shift;

  const g = scene.add.graphics();
  // Both ears: outer foot, tip leaning outward, inner foot (mirrored for the right ear).
  const path = (): void => {
    g.beginPath();
    g.moveTo(-hw, top + r);
    g.arc(-hw + r, top + r, r, Math.PI, Math.PI * 1.5);
    g.lineTo(-hw + r + C.tipLean, top - ear);
    g.lineTo(-hw + r + C.earW, top);
    g.lineTo(hw - r - C.earW, top);
    g.lineTo(hw - r - C.tipLean, top - ear);
    g.lineTo(hw - r, top);
    g.arc(hw - r, top + r, r, Math.PI * 1.5, Math.PI * 2);
    g.lineTo(hw, bottom - r);
    g.arc(hw - r, bottom - r, r, 0, Math.PI * 0.5);
    g.lineTo(-hw + r, bottom);
    g.arc(-hw + r, bottom - r, r, Math.PI * 0.5, Math.PI);
    g.closePath();
  };
  g.fillStyle(COLORS.navy, 0.96);
  path();
  g.fillPath();
  g.lineStyle(MENU.button.border, C.borderColor, 1);
  path();
  g.strokePath();

  // The inside of the ears: a smaller, lighter triangle in each.
  g.fillStyle(C.innerEar, 1);
  for (const side of [-1, 1]) {
    const footOuter = side * (hw - r - C.earInset);
    const footInner = side * (hw - r - C.earW + C.earInset);
    const tip = side * (hw - r - C.tipLean - C.earInset * 0.2);
    g.fillTriangle(footOuter, top + 1, footInner, top + 1, tip, top - ear + C.earInset + 2);
  }

  // Whiskers on the cheeks (inside the head, so the button never reaches past its own edge): three short lines on each side.
  g.lineStyle(C.whiskerWidth, C.whiskerColor, 1);
  for (const side of [-1, 1]) {
    for (const [dy, tilt] of C.whiskers) {
      const x0 = side * (hw - C.whiskerFromEdge);
      const x1 = side * (hw - C.whiskerFromEdge - C.whiskerLen);
      g.lineBetween(x0, shift + dy, x1, shift + dy + tilt);
    }
  }

  const label = scene.add.text(0, shift + 2, o.label, { fontFamily: FONT, fontSize: `${o.size}px`, color: o.textColor, stroke: '#1b2340', strokeThickness: 5 }).setOrigin(0.5);

  const button = scene.add.container(o.x, o.y, [g, label]).setDepth(MENU.button.depth);
  button.setSize(o.w, o.h + ear).setInteractive({ useHandCursor: true });
  const pop = (scale: number): void => {
    scene.tweens.add({ targets: button, scale, duration: MENU.button.hoverMs, ease: 'Sine.easeOut' });
  };
  button.on('pointerover', () => pop(MENU.button.hoverScale));
  button.on('pointerout', () => pop(1));
  return button;
}
