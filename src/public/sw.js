// ============================================
// SERVICE WORKER - STORY APP (IMPROVED)
// ============================================

const CACHE_NAME = 'story-app-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.png',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11.7.32/dist/sweetalert2.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11.7.32/dist/sweetalert2.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// ============================================
// INSTALL - Cache App Shell
// ============================================
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL.map(url => new Request(url, {mode: 'no-cors'})))
          .catch(err => {
            console.log('Some resources failed to cache, but continuing:', err);
            // Cache individual items that succeed
            return Promise.all(
              APP_SHELL.map(url => 
                cache.add(new Request(url, {mode: 'no-cors'}))
                  .catch(e => console.log('Failed to cache:', url))
              )
            );
          });
      })
      .then(() => {
        console.log('Service Worker: App Shell Cached');
        return self.skipWaiting();
      })
  );
});

// ============================================
// ACTIVATE - Clean Old Caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH - Enhanced Cache Strategy
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network First for API calls
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline fallback
              return new Response(
                JSON.stringify({ 
                  error: true, 
                  message: 'Offline - Data tidak tersedia' 
                }),
                { 
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Cache First for App Shell & Assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Return empty response for other failed requests
            return new Response('', { status: 404 });
          });
      })
  );
});

// ============================================
// PUSH NOTIFICATION
// ============================================
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);

  let notificationData = {
    title: 'Cerita Baru!',
    body: 'Ada cerita baru ditambahkan ke komunitas.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'story-notification',
    requireInteraction: false,
    data: { url: '/' }
  };

  // Parse data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: { url: data.url || '/' }
      };
    } catch (error) {
      console.log('Using default notification data');
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: [
        { action: 'open', title: 'Lihat' },
        { action: 'close', title: 'Tutup' }
      ]
    })
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================
// BACKGROUND SYNC
// ============================================
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'sync-stories') {
    event.waitUntil(
      syncOfflineData()
        .then(() => {
          console.log('✅ Background sync completed');
          
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                count: 1
              });
            });
          });
        })
        .catch((error) => {
          console.error('❌ Background sync failed:', error);
        })
    );
  }
});

async function syncOfflineData() {
  // Placeholder for IndexedDB sync
  return Promise.resolve();
}

// ============================================
// MESSAGE HANDLER
// ============================================
self.addEventListener('message', (event) => {
  console.log('Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker loaded successfully');