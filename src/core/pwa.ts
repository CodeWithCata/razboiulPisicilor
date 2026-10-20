/** @file Service worker registration, update detection and the install prompt (built game only). */
import { PWA } from '../config/pwa';

/** Chrome / Edge / Android hand over this event when the game can be installed. It is not in TypeScript's DOM types. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** 'native': one tap installs (Chrome, Edge, Android). 'ios': needs the Share menu (iPhone, iPad). 'none': already installed, or not possible here. */
export type InstallMode = 'native' | 'ios' | 'none';

let installPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
const offlineListeners = new Set<() => void>();
const updateListeners = new Set<() => void>();
/** True once a NEW version of the game has taken over in the background (see registerServiceWorker). The page itself still runs the old one. */
let newVersionActive = false;
let lastUpdateCheck = 0;

const tell = (listeners: Set<() => void>): void => listeners.forEach((listener) => listener());

/** True when the game runs as an installed app (home screen icon), not as a page in a browser tab. */
export function isInstalledApp(): boolean {
  const standaloneFlag = (navigator as Navigator & { standalone?: boolean }).standalone === true; // iOS
  return standaloneFlag || ['standalone', 'fullscreen', 'minimal-ui'].some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
}

function isIos(): boolean {
  // iPads in "desktop mode" call themselves a Mac, but have a touch screen.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function installMode(): InstallMode {
  if (isInstalledApp()) return 'none';
  if (installPrompt) return 'native';
  return isIos() ? 'ios' : 'none';
}

/** Calls `listener` whenever installMode() may have changed. Returns the function that stops it. */
export function onInstallModeChange(listener: () => void): () => void {
  installListeners.add(listener);
  return () => installListeners.delete(listener);
}

/** Calls `listener` once the whole game is saved for offline play for the first time (not on later updates). */
export function onOfflineReady(listener: () => void): void {
  offlineListeners.add(listener);
}

/** Shows the browser's own install question. The browser lets a page ask only once per event, so the button disappears after. */
export async function promptInstall(): Promise<void> {
  const event = installPrompt;
  if (!event) return;
  installPrompt = null;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    // The player closed the question or the browser refused: nothing to do.
  }
  tell(installListeners);
}

export function updateReady(): boolean {
  return newVersionActive;
}

/** Calls `listener` when a new version has been downloaded and is active (the player decides when to reload into it). */
export function onUpdateReady(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

/** Loads the new version. Only call it from the menu (a run in progress would be lost). */
export function applyUpdate(): void {
  window.location.reload();
}

/** Tells index.html's boot self-repair that the game started fine, so a later problem may be repaired again. */
export function markBootSuccess(): void {
  try {
    window.sessionStorage.removeItem(PWA.healFlagKey);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/**
 * The service worker (scripts/sw-template.js) takes over by itself as soon as it is installed, so there is no "waiting" version to manage.
 * The only signal the page needs is the controller changing: the very first time = the whole game is now saved for offline play,
 * any later time = a new version replaced the old one (the page keeps running the old code until it is reloaded).
 */
function watchController(container: ServiceWorkerContainer): void {
  let controlled = container.controller !== null;
  container.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      tell(offlineListeners);
    } else if (!newVersionActive) {
      newVersionActive = true;
      tell(updateListeners);
    }
  });
}

/** An installed app stays alive in the background for days: look for a new version whenever it comes back to the front or gets internet. */
function keepFresh(registration: ServiceWorkerRegistration): void {
  const check = (): void => {
    const now = Date.now();
    if (now - lastUpdateCheck < PWA.updateCheckMinMs) return;
    lastUpdateCheck = now;
    registration.update().catch(() => undefined); // offline or the server is busy: try again next time
  };
  lastUpdateCheck = Date.now(); // the browser checks by itself at every launch
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('online', check);
}

function registerServiceWorker(): void {
  // Only in the built game: during `pnpm dev` a service worker would keep serving old files.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  watchController(navigator.serviceWorker);
  const register = (): void => {
    navigator.serviceWorker
      // updateViaCache 'none': never take sw.js from the browser's own cache, so a fixed worker is found at once.
      .register(`${import.meta.env.BASE_URL}${PWA.serviceWorkerPath}`, { updateViaCache: 'none' })
      .then(keepFresh)
      .catch(() => {
        // Blocked (private mode, http instead of https): the game works online, just not offline.
      });
    // Ask the browser not to wipe the saved game files and records when the phone runs low on space (it may say no; that is fine).
    void Promise.resolve(navigator.storage?.persist?.()).catch(() => undefined);
  };
  // After the page is loaded, so the worker's downloads never compete with starting the game.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Call once at start, before the game is created: offline mode, and listening for the install question. */
export function initPwa(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // no automatic bar: the game shows its own button on the menu
    installPrompt = event as InstallPromptEvent;
    tell(installListeners);
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    tell(installListeners);
  });
  registerServiceWorker();
}
