/** @file Shared tap / click / key input for the game over and victory screens, plus `padHitArea`. */
import Phaser from 'phaser';

export interface EndScreenButtons {
  /** Tapping / clicking this goes to the main menu (it must already be interactive: see `padHitArea`). */
  menu: Phaser.GameObjects.GameObject;
  /** Victory screen only: tapping this starts endless mode. */
  endless?: Phaser.GameObjects.GameObject;
}

/**
 * A roomier tap target around a piece of text (a fingertip is much fatter than the letters). It is invisible and already interactive;
 * hand it to `bindEndScreenInput` as the button. `padX` / `padY` = how far it reaches past the text on each side.
 */
export function padHitArea(scene: Phaser.Scene, text: Phaser.GameObjects.Text, padX: number, padY: number): Phaser.GameObjects.Zone {
  return scene.add.zone(text.x, text.y, text.width + padX * 2, text.height + padY * 2).setInteractive({ useHandCursor: true });
}

export interface EndScreenActions {
  again(): void;
  menu(): void;
  endless?(): void;
}

export interface EndScreenKeys {
  again: string;
  menu: string;
  endless: string;
}

/**
 * Input for the game over and victory screens, written once for both:
 *   tap / click the menu text  -> menu,   tap / click the endless text -> endless mode,
 *   tap / click anywhere else  -> again,  keys R / M / Enter do the same.
 * It waits `delayMs` first, so a frantic click from the fight can't skip the screen, and it only fires once.
 */
export function bindEndScreenInput(
  scene: Phaser.Scene,
  delayMs: number,
  buttons: EndScreenButtons,
  actions: EndScreenActions,
  keys: EndScreenKeys,
): void {
  scene.time.delayedCall(delayMs, () => {
    let done = false;
    const once = (action: (() => void) | undefined): void => {
      if (done || !action) return;
      done = true;
      action();
    };

    scene.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.includes(buttons.menu)) once(actions.menu);
      else if (buttons.endless && over.includes(buttons.endless)) once(actions.endless);
      else once(actions.again);
    });
    scene.input.keyboard?.on(`keydown-${keys.again}`, () => once(actions.again));
    scene.input.keyboard?.on(`keydown-${keys.menu}`, () => once(actions.menu));
    scene.input.keyboard?.on(`keydown-${keys.endless}`, () => once(actions.endless));
  });
}
