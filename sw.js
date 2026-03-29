// உங்கள் ஆசிரியர் v8.2 - Service Worker
const CACHE_NAME = 'ungal-asiriyar-v8.2';
const OFFLINE_URL = './offline.html';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './20260315_085358.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
];

// Install: cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch(err => console.log('[SW] Cache error:', err));
        })
    );
    self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first for Firebase, cache-first for static
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Firebase / Google APIs - network only (no cache)
    if (url.includes('firestore.googleapis.com') || url.includes('firebase') || url.includes('googleapis.com')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ error: 'offline' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // Static assets - cache first, then network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for HTML pages
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./') || new Response('<h2>Offline - இணைப்பு இல்லை</h2>');
                }
            });
        })
    );
});
