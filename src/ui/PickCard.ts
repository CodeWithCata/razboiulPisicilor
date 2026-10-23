/** @file The shared shape of a card on the belt pick screen (plain upgrade card and synergy card), so UpgradeScene treats them alike. */
import type Phaser from 'phaser';

export interface PickCard {
  readonly box: Phaser.GameObjects.Container;
  /** Shrinks or restores the whole card (4 cards must fit the screen); call before `setSelected` / `intro`. */
  setBaseScale(scale: number): void;
  onPointer(hover: () => void, press: () => void): void;
  setSelected(on: boolean): void;
  intro(index: number): void;
  chosen(): void;
  fadeAway(): void;
}
