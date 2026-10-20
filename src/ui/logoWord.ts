/** @file One word of logo lettering with a hard drop shadow. */
import Phaser from 'phaser';
import { MENU } from '../config/menu';
import { FONT } from '../config/style';

const NAVY = '#1b2340';
const INK = `#${MENU.inkDark.toString(16).padStart(6, '0')}`;

/** One word of "logo" lettering: a hard dark drop shadow plus the colored letters with a navy outline. Returns [shadow, letters]. */
export function createLogoWord(scene: Phaser.Scene, label: string, size: number, color: string, y: number, stroke: number): Phaser.GameObjects.Text[] {
  const make = (dy: number, fill: string, strokeColor: string, thickness: number): Phaser.GameObjects.Text =>
    scene.add.text(0, y + dy, label, { fontFamily: FONT, fontSize: `${size}px`, color: fill, stroke: strokeColor, strokeThickness: thickness }).setOrigin(0.5);
  return [make(MENU.logo.shadowOffset, INK, INK, stroke + 2), make(0, color, NAVY, stroke)];
}
