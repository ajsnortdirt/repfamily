const VERSION = 'v1';
const CACHE = `repfamily-${VERSION}`;

const PRECACHE = [
    '/',
    '/style.css',
    '/app.js',
    '/data/products.js',
    '/assets/img/background.webp',
    '/assets/img/banner_no_bg.webp',
    '/assets/img/logo.webp',
    '/assets/img/discord_logo.webp',
    '/assets/img/ad.webp',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
            .catch(() => {})
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    const isHTML = req.mode === 'navigate' ||
                   (req.headers.get('accept') || '').includes('text/html');

    if (isHTML) {
        event.respondWith(
            fetch(req)
                .then(res => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then(c => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req).then(r => r || caches.match('/')))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                if (res.ok && res.type !== 'opaque') {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                }
                return res;
            });
        })
    );
});
