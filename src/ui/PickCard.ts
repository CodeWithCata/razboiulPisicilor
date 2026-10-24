/** @file The shared shape of a card on the belt pick screen (plain upgrade card and synergy card), so UpgradeScene treats them alike, and the helper that keeps a card's name on one line. */
import type Phaser from 'phaser';

export interface PickCard {
  readonly box: Phaser.GameObjects.Container;
  /** Shrinks or restores the whole card (4 cards must fit the screen); call before `setSelected` / `intro`. */
  setBaseScale(scale: number): void;
  onPointer(hover: () => void, press: () => void): void;
  setSelected(on: boolean): void;
  /** Cards with a moving picture play it here (the pick screen calls it every frame with the scene's clock). */
  update?(timeMs: number): void;
  intro(index: number): void;
  chosen(): void;
  fadeAway(): void;
}

/** Keeps a card's name on ONE line (a second line would grow up into the picture): a name wider than `maxWidth` is shrunk to fit. */
export function fitOneLine(text: Phaser.GameObjects.Text, maxWidth: number): void {
  if (text.width > maxWidth) text.setScale(maxWidth / text.width);
}
