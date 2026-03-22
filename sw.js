// Mike Bzzz Rentals — Service Worker v1
const CACHE_NAME = 'mikebzzz-v1';
const CORE_FILES = [
  './mike-bzzz-final.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache core files
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Try each file individually so one failure doesn't break install
      return Promise.allSettled(
        CORE_FILES.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW: could not cache', url, err);
          });
        })
      );
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch: cache-first for same-origin, network-first for CDN
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // For Three.js CDN and other external resources — network first, no caching
  if (url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.') || !url.startsWith(self.location.origin)) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // For local files — cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, toCache);
        });
        return response;
      });
    })
  );
});
