/** @file PWA numbers: service worker path, icon, update re-check, boot self-repair flag. */
import { COLORS, css } from './style';

/** Offline mode and installing the game as an app (core/pwa.ts, ui/PwaUi.ts). Texts: PWA_TEXT in content/lines.ts. */
export const PWA = {
  /** Built after `pnpm build` by scripts/offline-plugin.mjs (from scripts/sw-template.js). Relative to the page, so it works from any folder. */
  serviceWorkerPath: 'sw.js',
  /** The orange-cat logo, shown on the install button (made from art-source/logo.png by scripts/make-icons.py). */
  iconPath: 'icons/icon-192.png',
  /**
   * A phone keeps an installed app alive in the background for days, so a new version would never be noticed. When the app comes back
   * to the front (or the phone gets internet again) the browser is asked whether a new version exists, at most this often (ms).
   */
  updateCheckMinMs: 10 * 60 * 1000,
  /** sessionStorage flag of the boot self-repair (index.html tries it once; main.ts clears it after a good start). Same string as in index.html! */
  healFlagKey: 'varu-healed',
  /** The install button and the "ready for offline" note are page elements above the game canvas (CSS px, not game pixels). */
  ui: {
    margin: 12,
    /** Under the "turn your phone" screen (z-index 10 in index.html). */
    zIndex: 5,
    iconSize: 40,
    fontSize: 20,
    border: 3,
    shadow: 4,
    paddingX: 16,
    gap: 10,
    hintWidth: 250,
    hintSize: 16,
    toastMs: 4200,
    toastBottom: 28,
    toastSize: 20,
    background: css(COLORS.cream),
    text: css(COLORS.navy),
    outline: css(COLORS.navy),
    toastBackground: css(COLORS.gold),
  },
} as const;
