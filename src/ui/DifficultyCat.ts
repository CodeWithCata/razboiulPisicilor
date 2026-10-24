/** @file The difficulty button on the main menu: a cat's FACE whose mood follows the level (happy kitten, tabby, angry tabby, horned nightmare cat) with the level name under it, same hover pop as `createMenuButton`. */
import Phaser from 'phaser';
import { drawDifficultyFace } from '../assets/art/difficultyCat';
import { DIFFICULTY_CAT, type DifficultyId } from '../config/difficulty';
import { MENU } from '../config/menu';
import { FONT } from '../config/style';

export interface DifficultyCatOptions {
  x: number;
  y: number;
  /** Which level's face to draw. */
  id: DifficultyId;
  /** Width of the face's 96x96 art canvas, in game pixels. */
  faceW: number;
  /** Font size of the level name under the face. */
  size: number;
  label: string;
  textColor: string;
}

const ART = 96;
const faceHeight = (faceW: number): number => faceW * DIFFICULTY_CAT.heightShare;
const labelHeight = (size: number): number => Math.round(size * 1.25);

/** Whole height of the button: the face plus the name (the click area and the spacing under it use this). */
export const difficultyCatHeight = (faceW: number, size: number): number => faceHeight(faceW) + DIFFICULTY_CAT.labelGap + labelHeight(size);

/**
 * The container's middle is the middle of the whole button (face + name), so `setSize` fits both. A soft glow in the level's color sits
 * behind the face; the face itself is drawn once by `assets/art/difficultyCat.ts` and scaled. A new face pops in (`DIFFICULTY_CAT.pop`).
 */
export function createDifficultyCat(scene: Phaser.Scene, o: DifficultyCatOptions): Phaser.GameObjects.Container {
  const C = DIFFICULTY_CAT;
  const total = difficultyCatHeight(o.faceW, o.size);
  const faceH = faceHeight(o.faceW);
  const faceCy = -total / 2 + faceH / 2;
  const k = o.faceW / ART;

  const aura = scene.add.graphics();
  aura.fillStyle(C.looks[o.id].aura, C.aura.alpha).fillCircle(0, faceCy, o.faceW * C.aura.radius);

  const face = scene.add.graphics();
  drawDifficultyFace(face, o.id);
  face.setPosition(-ART * k * 0.5, faceCy - ART * k * 0.5).setScale(k); // the art's middle (48, 48) lands on the face's middle

  const label = scene.add
    .text(0, total / 2 - labelHeight(o.size) / 2, o.label, { fontFamily: FONT, fontSize: `${o.size}px`, color: o.textColor, stroke: '#1b2340', strokeThickness: 5 })
    .setOrigin(0.5);

  const button = scene.add.container(o.x, o.y, [aura, face, label]).setDepth(MENU.button.depth);
  button.setSize(o.faceW, total).setInteractive({ useHandCursor: true });
  button.setScale(C.pop.from);
  scene.tweens.add({ targets: button, scale: 1, duration: C.pop.ms, ease: 'Back.easeOut' });

  const pop = (scale: number): void => {
    scene.tweens.add({ targets: button, scale, duration: MENU.button.hoverMs, ease: 'Sine.easeOut' });
  };
  button.on('pointerover', () => pop(MENU.button.hoverScale));
  button.on('pointerout', () => pop(1));
  return button;
}
