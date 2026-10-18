import type Phaser from 'phaser';
import { RELAYOUT } from '../config/viewport';

let watchingVisibility = false;
/** True once the browser said yes to fullscreen (so the retry below stops asking). */
let wentFullscreen = false;
/** Set when a fullscreen request was just made, so whenScaleSettled knows there is a size change to wait for. */
let fullscreenRequested = false;

/**
 * A thumb on the glass is not "activity" for the phone, so the screen would dim in the middle of a fight.
 * Ask the browser to keep it on (and ask again whenever the page comes back to the front). Refused = nothing happens.
 */
export function keepScreenOn(): void {
  const lock = async (): Promise<void> => {
    try {
      await navigator.wakeLock?.request('screen');
    } catch {
      // Not supported, or refused (battery saver): the screen may dim, the game still works.
    }
  };
  void lock();
  if (watchingVisibility) return;
  watchingVisibility = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void lock();
  });
}

/**
 * Phones: go fullscreen, try to lock the screen to landscape and keep the screen awake. Must be called from a tap
 * (browsers refuse otherwise). Every part is optional: iPhones have no fullscreen, and many
 * browsers refuse the orientation lock, so failures are silently ignored and the game still works.
 */
export function enterFullscreenLandscape(scene: Phaser.Scene): void {
  try {
    const scale = scene.scale;
    if (scale.fullscreen.available && !scale.isFullscreen) {
      scale.startFullscreen();
      fullscreenRequested = true;
    }
    if (scale.isFullscreen) wentFullscreen = true;
  } catch {
    // Fullscreen refused: play in the page.
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
    void orientation.lock?.('landscape').catch(() => undefined);
  } catch {
    // No orientation lock on this browser.
  }
  keepScreenOn();
}

/**
 * Second chance: if the first try (the menu tap) was refused, try again on the first finished tap in the game.
 * Gives up for good once fullscreen worked or when the browser has no fullscreen (iPhones).
 */
export function retryFullscreenOnTap(scene: Phaser.Scene): void {
  if (wentFullscreen || !scene.scale.fullscreen.available) return;
  scene.input.once('pointerup', () => {
    try {
      if (!scene.scale.isFullscreen) scene.scale.startFullscreen();
      if (scene.scale.isFullscreen) wentFullscreen = true;
    } catch {
      // Refused again: play in the page.
    }
  });
}

/**
 * Fullscreen does not happen at once: the canvas changes size a moment AFTER the tap. A run built before that would be laid out for the
 * old size. So when fullscreen was just requested, wait for the browser to say yes and for the size to settle, then continue. A "no"
 * (or nothing at all for a short while) continues at once. Resolves immediately if fullscreen was not requested.
 * The event names are Phaser's Scale.Events ENTER_FULLSCREEN, FULLSCREEN_FAILED and FULLSCREEN_UNSUPPORTED.
 */
export function whenScaleSettled(scene: Phaser.Scene): Promise<void> {
  const scale = scene.scale;
  const requested = fullscreenRequested;
  fullscreenRequested = false;
  if (!requested || scale.isFullscreen) return Promise.resolve();
  return new Promise((resolve) => {
    let settle = 0;
    const done = (): void => {
      window.clearTimeout(settle);
      window.clearTimeout(giveUp);
      scale.off('enterfullscreen', onActivity);
      scale.off('resize', onActivity);
      scale.off('fullscreenfailed', done);
      scale.off('fullscreenunsupported', done);
      resolve();
    };
    const onActivity = (): void => {
      window.clearTimeout(settle);
      settle = window.setTimeout(done, RELAYOUT.fullscreenSettleMs);
    };
    const giveUp = window.setTimeout(done, RELAYOUT.fullscreenWaitMs);
    scale.on('enterfullscreen', onActivity);
    scale.on('resize', onActivity);
    scale.on('fullscreenfailed', done);
    scale.on('fullscreenunsupported', done);
  });
}
