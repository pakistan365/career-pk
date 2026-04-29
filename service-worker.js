const CACHE_NAME = 'careerpk-static-v2';
const STATIC_ASSETS = ['/', '/index.html', '/css/style.css', '/js/app.js', '/js/google-sheet-loader.js', '/logo.png'];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete ALL old caches so stale CSS/JS never persists
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML/JS/CSS; cache-first for images/fonts
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAsset = /\.(css|js|html)$/.test(url.pathname) || url.pathname === '/';

  if (isAsset) {
    // Network-first: always try network, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for images, fonts, etc.
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
