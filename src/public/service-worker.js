// ============================================
// SERVICE WORKER - OFFLINE READY
// ============================================

const CACHE_NAME = 'story-app-v4';

// APP SHELL - File yang HARUS di-cache untuk offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// ============================================
// INSTALL - Cache App Shell
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching App Shell files');
        
        // Cache file satu per satu untuk menghindari error
        const cachePromises = APP_SHELL.map(url => {
          return cache.add(url)
            .then(() => console.log(`[SW] ✅ Cached: ${url}`))
            .catch(error => {
              console.warn(`[SW] ❌ Failed to cache ${url}:`, error);
              // Continue despite errors
              return Promise.resolve();
            });
        });
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] All App Shell files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// ============================================
// ACTIVATE - Clean Old Caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH - Strategi Hybrid
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // ========== API REQUESTS (Network First) ==========
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone dan cache response yang berhasil
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback ke cache jika network error
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('[SW] Returning cached API response for:', url.pathname);
                return cachedResponse;
              }
              // Return error response
              return new Response(
                JSON.stringify({ 
                  error: true, 
                  message: 'Tidak ada koneksi internet dan data tidak tersedia di cache' 
                }),
                { 
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // ========== CDN RESOURCES (Cache First) ==========
  if (url.origin.includes('cdn.jsdelivr.net') || 
      url.origin.includes('unpkg.com') || 
      url.origin.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // ========== APP RESOURCES (Cache First with Network Fallback) ==========
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Cache hit for:', url.pathname);
          
          // Return cache tapi update di background
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {
            // Silent fail
          });
          
          return cachedResponse;
        }
        
        console.log('[SW] Cache miss, fetching:', url.pathname);
        
        // Jika tidak ada di cache, fetch dari network
        return fetch(request)
          .then((response) => {
            // Jangan cache jika response tidak valid
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone dan cache response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed for:', url.pathname, error);
            
            // Offline fallback untuk navigation requests
            if (request.mode === 'navigate' || request.destination === 'document') {
              return caches.match('/index.html')
                .then(response => {
                  if (response) {
                    return response;
                  }
                  // Ultimate fallback
                  return new Response(
                    '<h1>Offline</h1><p>Aplikasi sedang offline dan halaman ini belum di-cache.</p>',
                    { 
                      status: 503,
                      headers: { 'Content-Type': 'text/html' }
                    }
                  );
                });
            }
            
            // Untuk resource lain, return empty response
            return new Response('', { 
              status: 404,
              statusText: 'Not Found' 
            });
          });
      })
  );
});

// ============================================
// PUSH NOTIFICATION
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push notification received');

  let notificationData = {
    title: 'Notifikasi Baru',
    body: 'Ada data baru ditambahkan.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'story-notification',
    requireInteraction: false,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Cerita Baru!',
        body: data.body || 'Ada cerita baru ditambahkan ke komunitas.',
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: { url: data.url || '/' }
      };
    } catch (error) {
      console.log('[SW] Using default notification data');
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
        { action: 'open', title: '📖 Lihat' },
        { action: 'close', title: '❌ Tutup' }
      ]
    })
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
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
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-stories') {
    event.waitUntil(
      syncOfflineData()
        .then(() => console.log('[SW] ✅ Sync completed'))
        .catch((error) => console.error('[SW] ❌ Sync failed:', error))
    );
  }
});

async function syncOfflineData() {
  return Promise.resolve();
}

// ============================================
// MESSAGE HANDLER
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] ✅ Service Worker script loaded - Version:', CACHE_NAME);