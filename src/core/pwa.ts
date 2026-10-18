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
/** A new version of the game that is downloaded and waiting. It starts when the player accepts, or the next time the app is opened. */
let waitingWorker: ServiceWorker | null = null;

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
  return waitingWorker !== null;
}

/** Calls `listener` when a new version has been downloaded and waits for the player. */
export function onUpdateReady(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

/** Starts the waiting version and reloads the page once it has taken over. Only call it from the menu (a run in progress would be lost). */
export function applyUpdate(): void {
  if (!waitingWorker) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waitingWorker.postMessage('SKIP_WAITING');
}

function watchForUpdates(registration: ServiceWorkerRegistration): void {
  const waitFor = (worker: ServiceWorker | null): void => {
    worker?.addEventListener('statechange', () => {
      // "installed" while another version already runs = an update is waiting (the very first install has no controller).
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        waitingWorker = worker;
        tell(updateListeners);
      }
    });
  };
  if (registration.waiting && navigator.serviceWorker.controller) {
    waitingWorker = registration.waiting;
    tell(updateListeners);
  }
  waitFor(registration.installing);
  registration.addEventListener('updatefound', () => waitFor(registration.installing));
}

function registerServiceWorker(): void {
  // Only in the built game: during `pnpm dev` a service worker would keep serving old files.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const firstVisit = navigator.serviceWorker.controller === null;
  // The worker takes over right after its first install (it claims the page), which means every file is saved by then.
  if (firstVisit) navigator.serviceWorker.addEventListener('controllerchange', () => tell(offlineListeners), { once: true });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}${PWA.serviceWorkerPath}`, { updateViaCache: 'none' })
      .then(watchForUpdates)
      .catch(() => {
        // Blocked (private mode, http instead of https): the game works online, just not offline.
      });
    // Ask the browser not to wipe the saved game files and records when the phone runs low on space (it may say no; that is fine).
    void Promise.resolve(navigator.storage?.persist?.()).catch(() => undefined);
  });
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
