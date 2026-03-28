const CACHE_NAME = 'ksi-v3';
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install: cache all core assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

// Fetch: cache-first for app assets, network-first for currency API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For the currency API: network first, fall back to cache
  if (url.hostname.includes('open.er-api.com') || url.hostname.includes('exchangerate')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else: cache-first (works fully offline)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((res) => {
        // Cache successful GET responses
        if (res && res.status === 200 && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
