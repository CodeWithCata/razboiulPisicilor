/** @file Loads the self-hosted game font once, before any text is drawn (never rejects). */
import { FONT_LOADING } from '../config/style';

let loading: Promise<void> | null = null;

/**
 * Loads the game font (self-hosted files in public/fonts/, listed in FONT_LOADING) and resolves when it is ready, or after
 * FONT_LOADING.timeoutMs, whichever is first. Never rejects: if the font can't load, text just uses the fallback fonts from config/style.ts.
 * Safe to call more than once (main.ts starts it at launch, BootScene waits for it): the work is done only once.
 * Call it BEFORE the first text is drawn: Phaser paints text to a canvas once and does not redraw it when a font arrives later.
 */
export function loadGameFont(): Promise<void> {
  loading ??= load();
  return loading;
}

async function load(): Promise<void> {
  try {
    const faces = FONT_LOADING.files.map((file) => {
      const source = `url("${import.meta.env.BASE_URL}${file.path}") format("woff2")`;
      const face = new FontFace(file.family, source, { display: 'swap', unicodeRange: file.unicodeRange });
      document.fonts.add(face); // page text (install button, "turn your phone" page) can use it too
      return face.load();
    });
    const ready = Promise.allSettled(faces).then(() => undefined);
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, FONT_LOADING.timeoutMs));
    await Promise.race([ready, timeout]);
  } catch {
    // No FontFace support or a blocked file: keep the fallback fonts.
  }
}
