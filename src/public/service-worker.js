// service-worker.js

const CACHE_NAME = 'berbagi-cerita-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/scripts/index.js',
  '/scripts/pages/home/home-page.js',
  '/styles/styles.css',
];

// Install event – caching file utama
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching files');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event – hapus cache lama
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event – respon dari cache dulu
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return dari cache jika ada, kalau tidak ambil dari jaringan
        return response || fetch(event.request);
      })
      .catch(() => {
        // Optional: fallback ke halaman offline custom
        return caches.match('/index.html');
      })
  );
});
