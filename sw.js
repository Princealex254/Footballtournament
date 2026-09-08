const CACHE_NAME = 'tournament-hub-v23';
const urlsToCache = [
    '/',
    'index.html',
    'favicon.svg',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Cache each file individually so one failure can't break the install
                return Promise.all(urlsToCache.map(url =>
                    cache.add(url).catch(err => console.warn('Cache skip:', url, err))
                ));
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;

    // Only handle same-origin GET requests.
    // Firebase, Firestore web-channels and CDN imports pass straight through —
    // intercepting them is what caused the "Failed to fetch" error spam.
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                }
                return res;
            }).catch(() =>
                // Offline and not cached: fall back to the cached app shell
                caches.match('/')
            );
        })
    );
});