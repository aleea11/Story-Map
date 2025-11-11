importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  workbox.core.setCacheNameDetails({
    prefix: 'story-app',
    suffix: 'v1',
    precache: 'precache',
    runtime: 'runtime'
  });

  workbox.precaching.precacheAndRoute([]);

  // Cache strategies
  workbox.routing.registerRoute(
    new RegExp('/stories'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'stories-cache',
    })
  );

  workbox.routing.registerRoute(
    new RegExp('https://story-api.dicoding.dev'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'api-cache',
    })
  );

  // Push notification handler
  self.addEventListener('push', (event) => {
    console.log('Push received:', event);

    let data = {};
    if (event.data) {
      data = event.data.json();
    }

    const options = {
      body: data.options?.body || 'Ada cerita baru!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Lihat Cerita',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Tutup'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Cerita Baru!', options)
    );
  });

  // Notification click handler
  self.addEventListener('notificationclick', (event) => {
    console.log('Notification click received:', event);

    event.notification.close();

    if (event.action === 'explore') {
      event.waitUntil(
        clients.openWindow('/#/')
      );
    }
  });

  // Background sync for offline actions
  workbox.routing.registerRoute(
    /\/notifications\/subscribe/,
    new workbox.strategies.NetworkOnly({
      plugins: [
        new workbox.backgroundSync.BackgroundSyncPlugin('notification-queue', {
          maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
        })
      ]
    }),
    'POST'
  );
} else {
  console.log('Workbox failed to load');
}

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notifikasi Baru';
  const options = {
    body: data.body || 'Ada update cerita!',
    icon: '/icon.png',  // Ganti dengan path ikon Anda
    badge: '/badge.png',  // Opsional, untuk badge
    data: data.url || '/'  // URL untuk redirect saat diklik
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Tambahkan event listener untuk klik notifikasi (opsional, untuk redirect)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});