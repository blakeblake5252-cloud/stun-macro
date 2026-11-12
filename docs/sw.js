// Service worker: lets the arcade keep working with no connection.
// Strategy: try the network first (so updates show up), fall back to the cache.
const CACHE = 'recess-v2';
const ASSETS = [
  './',
  'index.html',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/lib/audio.js',
  'js/lib/dom.js',
  'js/lib/engine.js',
  'js/lib/store.js',
  'js/games/star-dodge.js',
  'js/games/block-hop.js',
  'js/games/echo-grid.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle our own GET requests; everything else is left alone.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
