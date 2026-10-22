/** @file Rebuilds Menu / GameOver / Victory when the canvas size changes (fullscreen, rotation). */
import type Phaser from 'phaser';
import { RELAYOUT } from '../config/viewport';
import { isStartingRun } from './run';

/**
 * With Scale.EXPAND the canvas size can change while the game runs (fullscreen, turning the phone). Scenes place their things
 * when they are created, so a scene that stays up through a change would keep the old layout. The menu and the end screens
 * hold nothing worth keeping, so they are simply rebuilt at the new size. The run itself (GameScene + UIScene) is left alone:
 * the camera follows the new size by itself, and the next scene is built at the final size.
 * Portrait is ignored: the "turn your phone" page covers it, and the game pauses by itself.
 */
export function watchRelayout(game: Phaser.Game): void {
  let laidOut = { width: game.scale.width, height: game.scale.height };
  let timer = 0;

  const apply = (): void => {
    const { width, height } = game.scale;
    if (width <= height) return; // upright phone: wait for the turn
    if (Math.abs(width - laidOut.width) < 1 && Math.abs(height - laidOut.height) < 1) return;
    laidOut = { width, height };
    for (const key of RELAYOUT.sceneKeys) {
      const scene = game.scene.getScene(key);
      if (key === 'MenuScene' && isStartingRun()) continue; // the start tap is already being handled: rebuilding would bring the menu music back
      if (scene && game.scene.isActive(key)) scene.scene.restart();
    }
  };

  // Browsers send a burst of resize events while fullscreen or the address bar animates: act once it calms down.
  game.scale.on('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, RELAYOUT.debounceMs);
  });
}
