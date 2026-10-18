/*
 * Service worker of Varu vs. Pisicile: makes the game work with no internet and lets it be installed.
 * This is a TEMPLATE: scripts/offline-plugin.mjs fills in the three __PLACEHOLDERS__ after `vite build` and writes the result to dist/sw.js.
 * (Do not edit dist/sw.js, and do not register this template file.) Not used in `pnpm dev`.
 */
const VERSION = '__VERSION__'; // changes whenever any built file changes, so every new build replaces the old cache
const PRECACHE = __PRECACHE__; // every file of the build, relative to this file
const FONT_STYLESHEETS = __FONT_STYLESHEETS__; // Google Fonts stylesheets the game asks for (config/style.ts)

const CORE_CACHE = `varu-core-${VERSION}`;
const FONT_CACHE = 'varu-fonts-v1'; // fonts never change per build, so this cache outlives versions
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** Everything is resolved against the folder that holds sw.js, so the game works from any folder (base './'). */
const here = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const core = await caches.open(CORE_CACHE);
      // 'reload' skips the browser's own HTTP cache, so a fresh build is never mixed with stale files.
      const requests = [here('./'), ...PRECACHE.map(here)].map((url) => new Request(url, { cache: 'reload' }));
      await core.addAll(requests); // all or nothing: a half-saved game is worse than no offline mode
      await precacheFonts(); // best effort
      // First install: take over at once (nothing can break). An UPDATE waits until the player taps "actualizează" on the menu
      // (message below) or closes the app: taking over mid-session could mix two versions of the game.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith('varu-core-') && name !== CORE_CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    // Range requests (streamed audio) go straight to the network; the game decodes its sounds whole, so it never sends them.
    if (request.headers.has('range')) return;
    event.respondWith(fromCoreCache(request));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontResponse(event, request));
  }
});

/** The game's own files: straight from the cache (instant, works offline); the network only if something is missing. */
async function fromCoreCache(request) {
  const cache = await caches.open(CORE_CACHE);
  // ignoreSearch: the page may be opened as index.html?touch=1 or with a campaign link tag, it is still the same file.
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return clean(hit, request);
  try {
    return await fetch(request);
  } catch {
    // Offline and not cached: a page visit still gets the game (never the browser's dinosaur), anything else just fails.
    if (request.mode === 'navigate') {
      const page = await cache.match(here('./'));
      if (page) return clean(page, request);
    }
    return Response.error();
  }
}

/** Some hosts redirect /index.html to /. A saved redirect can't be handed to a page visit (the browser refuses it), so copy it without the flag. */
async function clean(response, request) {
  if (!response.redirected || request.mode !== 'navigate') return response;
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
}

/** Google Fonts: saved on first use, shown from the cache from then on, refreshed quietly in the background. */
async function fontResponse(event, request) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') void cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}

/**
 * The font must already be saved after the very FIRST visit (the first page load happens before this worker controls the page,
 * so fontResponse never sees it). So the worker downloads the font stylesheets itself, plus every font file they point to.
 * Failure is fine: the game falls back to Impact (config/style.ts).
 */
async function precacheFonts() {
  try {
    const cache = await caches.open(FONT_CACHE);
    for (const sheetUrl of FONT_STYLESHEETS) {
      const response = await fetch(sheetUrl);
      if (!response.ok) continue;
      await cache.put(sheetUrl, response.clone());
      const css = await response.text();
      const files = [...css.matchAll(/url\((["']?)(https:[^)"']+)\1\)/g)].map((match) => match[2]);
      await Promise.all(files.map((file) => cache.add(file).catch(() => undefined)));
    }
  } catch {
    // No network for the fonts right now: the game still installs and runs.
  }
}
