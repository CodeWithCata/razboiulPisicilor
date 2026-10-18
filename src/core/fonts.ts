import { FONT_FAMILY, FONT_LOADING } from '../config/style';

/**
 * Loads the game font and resolves when it is ready (or after FONT_LOADING.timeoutMs, whichever is first).
 * Never rejects: if the font can't load, the text just uses the fallback fonts from config/style.ts.
 * Call it BEFORE the first text is drawn: Phaser paints text to a canvas once and does not redraw it when a font arrives later.
 */
export async function loadGameFont(): Promise<void> {
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_LOADING.stylesheetUrl;
    // The @font-face rules only exist once the stylesheet is in, so wait for it before asking for the font itself.
    const stylesheet = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
    });
    document.head.appendChild(link);

    const ready = stylesheet.then(() => document.fonts.load(`32px "${FONT_FAMILY}"`, FONT_LOADING.sampleText)).then(() => undefined);
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, FONT_LOADING.timeoutMs));
    await Promise.race([ready, timeout]);
  } catch {
    // No font loading support or no network: keep the fallback fonts.
  }
}
