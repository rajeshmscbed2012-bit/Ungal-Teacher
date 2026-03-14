// உங்கள் ஆசிரியர் - Service Worker v3.0
const CACHE_NAME = 'ungal-aasiriyar-v3.0';

// Only cache same-origin app shell files on install
const APP_SHELL = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing v3.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => { console.log('[SW] Install complete'); return self.skipWaiting(); })
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v3.0...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Firestore API — always network (never cache live data)
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com/google.firestore') ||
    url.includes('firebaseio.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 2. Firebase SDK JS files (gstatic CDN) — cache-first, lazy
  if (url.includes('gstatic.com/firebasejs')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Google Fonts — stale-while-revalidate
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // 4. App shell — cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
