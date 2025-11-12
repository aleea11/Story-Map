importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  workbox.core.setCacheNameDetails({
    prefix: 'story-app',
    suffix: 'v1',
    precache: 'precache',
    runtime: 'runtime'
  });

  // Precache app shell
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: null },
    { url: '/index.html', revision: null },
    { url: '/manifest.json', revision: null },
    { url: '/sw.js', revision: null },
    { url: '/styles/styles.css', revision: null },
    { url: '/icon-192x192.png', revision: null },
    { url: '/icon-512x512.png', revision: null }
  ]);

  // Push notification handler - KRITERIA 2 DASAR
  self.addEventListener('push', (event) => {
    console.log('Push received:', event);

    let data = {};
    if (event.data) {
      data = event.data.json();
    }

    // Notifikasi sederhana sesuai kriteria
    const options = {
      body: data.body || 'Ada data baru ditambahkan.',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'story-notification', // Prevent duplicate notifications
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Notifikasi Baru', options)
    );
  });

  // Notification click handler
  self.addEventListener('notificationclick', (event) => {
    console.log('Notification click received');
    event.notification.close();
    
    event.waitUntil(
      clients.openWindow('/')
    );
  });

} else {
  console.log('Workbox failed to load');
}
// ... existing code ...

// Cache app shell for offline access
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'document',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache CSS and JS
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'assets-cache',
  })
);

// ... existing code ...