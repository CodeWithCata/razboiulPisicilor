/** @file Keeps the page and the Phaser canvas the right size when phone browser bars slide in and out. */
import type Phaser from 'phaser';

/**
 * Phones: the browser's address bar and toolbars slide in and out, and the old `100vh` / `inset: 0` page was sized for the
 * version WITHOUT the bars, so the bottom of the game (map edge, attack button) hid behind them.
 * CSS (index.html) sizes the page with `100dvh` and keeps the game inside the safe area (notch, rounded corners, home bar).
 * Here we add the part CSS cannot do alone: `--app-h` follows the height that is really visible (visualViewport), and Phaser is
 * told to measure again.
 *
 * IMPORTANT: Phaser's `scale.refresh()` reuses the parent size it measured EARLIER. After `--app-h` changes, the parent box
 * has a new size, so we must call `getParentBounds()` first. Without it, turning the phone from upright to landscape left the
 * canvas at the stale 1280x1280 (menu cut off) until Phaser's own slow 500 ms poll noticed.
 * Browsers also report the final size a moment late after a turn, so we measure again a few times.
 */
const SETTLE_MS = [150, 400, 900] as const;

export function watchViewport(game: Phaser.Game): void {
  const root = document.documentElement;
  const viewport = window.visualViewport;

  const applyHeight = (): void => {
    const height = Math.round(viewport?.height ?? window.innerHeight);
    if (height > 0) root.style.setProperty('--app-h', `${height}px`);
  };

  const measure = (): void => {
    applyHeight();
    game.scale.getParentBounds(); // new page height -> new parent size, BEFORE the refresh uses it
    game.scale.refresh();
  };

  let frame = 0;
  const timers: number[] = [];
  const sync = (): void => {
    measure(); // at once, so the very first frame after the turn is already right
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
    timers.forEach((id) => window.clearTimeout(id));
    timers.length = 0;
    for (const ms of SETTLE_MS) timers.push(window.setTimeout(measure, ms));
  };

  applyHeight();
  window.addEventListener('resize', sync);
  viewport?.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
}
