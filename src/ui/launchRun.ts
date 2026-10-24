/** @file Starts a run from a menu screen (main menu, custom game setup): fullscreen inside the tap on phones, waits for the screen size to settle, plays the opening videos (never for a custom game), then starts GameScene. */
import Phaser from 'phaser';
import { TOUCH } from '../config/touch';
import { usesTouchControls } from '../core/device';
import { bus, Events, type MusicPayload } from '../core/events';
import { enterFullscreenLandscape, whenScaleSettled } from '../core/fullscreen';
import { setStartingRun, type RunOptions } from '../core/run';
import { playIntroVideos, shouldPlayIntro, unlockIntroVideo } from './IntroVideo';

/**
 * Call it from inside the start tap (the fullscreen request and the video sound must come from the tap itself). The caller keeps its own
 * "already started" flag. `run` = what GameScene gets (nothing = the campaign). A custom game skips the opening videos: they tell the campaign's story.
 */
export function launchRun(scene: Phaser.Scene, run?: RunOptions): void {
  setStartingRun(true);
  if (usesTouchControls() && TOUCH.fullscreenOnStart) enterFullscreenLandscape(scene); // inside the tap, as browsers require (it also keeps the screen awake)
  // Fullscreen changes the canvas size a moment after the tap: build the run only once the size has settled.
  const playVideos = run?.mode !== 'custom' && shouldPlayIntro(); // decided inside the tap: sound is allowed then
  if (playVideos) {
    unlockIntroVideo(); // iPhone: the video element must be started by THIS tap to get sound for every clip
    const silence: MusicPayload = { track: null };
    bus.emit(Events.MusicTrack, silence); // the menu song stops with the tap, not only when the first clip appears
  }
  void whenScaleSettled(scene)
    .then(() => (playVideos ? playIntroVideos() : undefined)) // backstory + intro, with a skip button
    .then((intro) => {
      setStartingRun(false);
      scene.scene.start('GameScene', run);
      if (!intro) return;
      // The black overlay keeps covering the menu until the game has been created and drawn, so the title never flashes.
      scene.scene.manager.getScene('GameScene').events.once(Phaser.Scenes.Events.CREATE, () => {
        requestAnimationFrame(() => requestAnimationFrame(() => intro.dismiss()));
      });
      window.setTimeout(intro.dismiss, 4000); // safety: never leave the screen black
    });
}
