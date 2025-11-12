importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  workbox.core.setCacheNameDetails({
    prefix: 'story-app',
    suffix: 'v1',
    precache: 'precache',
    runtime: 'runtime'
  });

  // Precache static assets
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: null },
    { url: '/index.html', revision: null },
    { url: '/manifest.json', revision: null },
    { url: '/sw.js', revision: null },
    // Add other static assets
  ]);

  // Cache strategies for dynamic data
  workbox.routing.registerRoute(
    new RegExp('/stories'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'stories-api-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
    'GET'
  );

  // Cache images
  workbox.routing.registerRoute(
    new RegExp('https://story-api.dicoding.dev/images/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'story-images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );

  // Cache other API endpoints
  workbox.routing.registerRoute(
    new RegExp('https://story-api.dicoding.dev'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Background sync for offline actions
  workbox.routing.registerRoute(
    /\/notifications\/subscribe/,
    new workbox.strategies.NetworkOnly({
      plugins: [
        new workbox.backgroundSync.BackgroundSyncPlugin('notification-queue', {
          maxRetentionTime: 24 * 60 // Retry for max of 24 Hours
        })
      ]
    }),
    'POST'
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
        storyId: data.storyId // Add story ID if available
      },
      actions: [
        {
          action: 'explore',
          title: 'Lihat Cerita',
          icon: '/icon-192x192.png'
        },
        {
          action: 'view_story',
          title: 'Lihat Detail',
          icon: '/icon-192x192.png'
        }
      ],
      requireInteraction: true,
      silent: false
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
    } else if (event.action === 'view_story') {
      const storyId = event.notification.data?.storyId;
      if (storyId) {
        event.waitUntil(
          clients.openWindow(`/#/?story=${storyId}`)
        );
      } else {
        event.waitUntil(
          clients.openWindow('/#/')
        );
      }
    }
  });

} else {
  console.log('Workbox failed to load');
}