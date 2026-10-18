/*
 * Service worker of Varu vs. Pisicile: makes the game work with no internet and lets it be installed.
 * This is a TEMPLATE: scripts/offline-plugin.mjs fills in the two __PLACEHOLDERS__ after `vite build` and writes the result to dist/sw.js.
 * (Do not edit dist/sw.js, and do not register this template file.) Not used in `pnpm dev`.
 *
 * Why it looks like this (every line below is here because of a real phone problem):
 *  1. OPT-OUT OF CHROME'S "SERVICE WORKER AUTO PRELOAD" (install handler). Chrome / Android 143+ starts the page request BEFORE a sleeping
 *     service worker has woken up. On a cold start of an installed app that goes wrong: blank screen or a hang, until the player closes and
 *     opens the app again (once, twice, ...). Chromium bug 466790291. The documented opt-out is a "static routing" rule that sends every
 *     request to the fetch handler (explainer: github.com/WICG/service-worker-auto-preload#opt-out). It must stay even after Chrome fixes
 *     the bug: it costs nothing and is ignored by browsers that don't know it.
 *  2. A NEW VERSION TAKES OVER AT ONCE (skipWaiting). Before, an update waited for the old version to be closed, and a phone keeps an
 *     installed app alive in the background for days, so a fix never arrived. The game loads every file at start and never fetches game
 *     files later, so replacing the worker under a running page is safe (the page keeps running its old code until it is reloaded).
 *  3. Nothing from other websites goes through here (the font is self-hosted in public/fonts/), so a slow third-party host can never block the launch.
 *  4. The cache lookup is the ONLY work on the launch path: one cache, no waiting on the network.
 */
const VERSION = '__VERSION__'; // changes whenever any built file (or this worker) changes, so every new build gets its own cache
const PRECACHE = __PRECACHE__; // every file of the build, relative to this file

const CACHE_PREFIX = 'varu-';
const CORE_CACHE = `${CACHE_PREFIX}core-${VERSION}`;

/** Everything is resolved against the folder that holds sw.js, so the game works from any folder (base './'). */
const here = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  optOutOfAutoPreload(event); // must be called right here, synchronously, while the install event is being dispatched
  event.waitUntil(
    (async () => {
      const core = await caches.open(CORE_CACHE);
      // 'reload' skips the browser's own HTTP cache, so a fresh build is never mixed with stale files.
      const requests = [here('./'), ...PRECACHE.map(here)].map((url) => new Request(url, { cache: 'reload' }));
      await core.addAll(requests); // all or nothing: a half-saved game is worse than no offline mode (the install is retried later)
      await self.skipWaiting(); // see 2. above
    })(),
  );
});

/** See 1. above. Feature-checked and wrapped: on a browser without the Static Routing API this does nothing. */
function optOutOfAutoPreload(event) {
  try {
    if (typeof event.addRoutes !== 'function' || typeof URLPattern !== 'function') return;
    event.waitUntil(
      event
        .addRoutes({ condition: { urlPattern: new URLPattern({}) }, source: 'fetch-event' })
        .catch(() => undefined),
    );
  } catch {
    // Not supported here: nothing to opt out of.
  }
}

self.addEventListener('message', (event) => {
  // Older pages (before v39) asked a waiting worker to start with this message. Nothing waits any more, but it is harmless.
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache of an older version (and the old Google Fonts cache of v34-v38).
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CORE_CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // other websites: the browser handles them itself
  // Range requests (streamed audio) go straight to the network; the game decodes its sounds whole, so it never sends them.
  if (request.headers.has('range')) return;
  event.respondWith(respond(request));
});

/** The game's own files: straight from the cache (instant, works offline); the network only if something is missing. */
async function respond(request) {
  try {
    // ignoreSearch: the page may be opened as index.html?touch=1 or with a campaign link tag, it is still the same file.
    const hit = await caches.match(request, { cacheName: CORE_CACHE, ignoreSearch: true });
    if (hit) return clean(hit, request);
  } catch {
    // The cache could not be read (storage trouble): try the network below.
  }
  try {
    return await fetch(request);
  } catch {
    // Offline and not cached: a page visit still gets the game (never the browser's dinosaur), anything else just fails.
    if (request.mode === 'navigate') {
      const page = await caches.match(here('./'), { cacheName: CORE_CACHE });
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
