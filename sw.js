/* iKhataPro Service Worker — Production PWA Shell v2 */

const CACHE_NAME = 'ikhatapro-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/landing.html',
  '/manifest.json',
  '/css/main.css',
  '/css/components.css',
  '/css/khata.css',
  '/css/onboarding.css',
  '/css/features.css',
  '/css/landing.css',
  '/js/demoData.js',
  '/js/state.js',
  '/js/modules/intelligence.js',
  '/js/modules/dashboard.js',
  '/js/modules/khata.js',
  '/js/modules/customers.js',
  '/js/modules/suppliers.js',
  '/js/modules/pos.js',
  '/js/modules/inventory.js',
  '/js/modules/invoices.js',
  '/js/modules/expenses.js',
  '/js/modules/pnl.js',
  '/js/modules/analytics.js',
  '/js/modules/copilot.js',
  '/js/modules/search.js',
  '/js/app.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching offline app shell');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Navigation requests: try network first, fallback to cached index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Static assets: Cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Return offline fallback if network fails
        if (e.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
