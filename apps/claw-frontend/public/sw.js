// The cache belongs to one build. The page registers this file as
// `/sw.js?v=<app version>`, so a release installs a new worker and `activate`
// drops every older cache. Without that, one constant name kept a previous
// build's assets forever (TD-034).
const BUILD = new URL(self.location.href).searchParams.get('v') ?? 'dev';
const CACHE_NAME = `clawai-shell-${BUILD}`;
const OFFLINE_URL = '/offline.html';
const CORE_ASSETS = [OFFLINE_URL, '/en', '/icon.png', '/icon-maskable.png', '/apple-icon.png'];

/** Fonts and images: their bytes never change under the same URL. */
const MEDIA_PATH = /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/i;

/** Code. Cached only as an offline fallback, never preferred over the network. */
const CODE_PATH = /^\/_next\/static\/.*\.(?:js|css)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function putInCache(request, response) {
  if (!response.ok || response.type === 'opaque') return response;
  const copy = response.clone();
  void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPublicPage =
          url.pathname === '/' || /^\/[a-z]{2}\/?$/.test(url.pathname)
            ? await caches.match(request)
            : null;
        return cachedPublicPage || (await caches.match(OFFLINE_URL));
      }),
    );
    return;
  }

  // Code is network-first. A worker that has not updated yet used to answer
  // with a previous build's chunk, so a shipped fix (a security one included)
  // did not reach anyone who kept the tab open (TD-034).
  if (CODE_PATH.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(request, response))
        .catch(async () => (await caches.match(request)) || Response.error()),
    );
    return;
  }

  if (MEDIA_PATH.test(url.pathname)) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) => cached || fetch(request).then((response) => putInCache(request, response)),
        ),
    );
  }
});
