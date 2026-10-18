/**
 * The "turn your phone" page (index.html) used to be a dead end: it covers the game and swallowed every tap, so a phone with
 * auto-rotate OFF (or any iPhone with the orientation lock on) could never get in. Now a tap on it asks the browser for
 * fullscreen + landscape (works on Android Chrome, even when auto-rotate is off). iPhones cannot do that: the page tells the
 * player to switch off the orientation lock instead (text in index.html).
 */
export function watchRotateHint(): void {
  const hint = document.getElementById('rotate-hint');
  if (!hint) return;
  hint.addEventListener('click', () => {
    try {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } catch {
      // No fullscreen here (iPhone): nothing to do.
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
      void orientation.lock?.('landscape').catch(() => undefined);
    } catch {
      // No orientation lock on this browser.
    }
  });
}
