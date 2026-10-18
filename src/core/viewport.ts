import type Phaser from 'phaser';

/**
 * Phones: the browser's address bar and toolbars slide in and out, and the old `100vh` / `inset: 0` page was sized for the
 * version WITHOUT the bars, so the bottom of the game (map edge, attack button) hid behind them.
 * CSS (index.html) sizes the page with `100dvh` and keeps the game inside the safe area (notch, rounded corners, home bar).
 * Here we add the part CSS cannot do alone: `--app-h` follows the height that is really visible (visualViewport), and Phaser is
 * told to measure again, because some browsers only resize the visible area without a normal `resize` event reaching the canvas in time.
 */
export function watchViewport(game: Phaser.Game): void {
  const root = document.documentElement;
  const viewport = window.visualViewport;

  const applyHeight = (): void => {
    const height = Math.round(viewport?.height ?? window.innerHeight);
    if (height > 0) root.style.setProperty('--app-h', `${height}px`);
  };

  let frame = 0;
  const sync = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      applyHeight();
      game.scale.refresh();
    });
  };

  applyHeight();
  window.addEventListener('resize', sync);
  viewport?.addEventListener('resize', sync);
  // After a turn of the phone some browsers report the final size a moment late, so measure once more.
  window.addEventListener('orientationchange', () => window.setTimeout(sync, 300));
}
