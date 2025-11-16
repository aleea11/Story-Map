// ============================================
// FIXED SERVICE WORKER - OFFLINE READY
// File: src/public/service-worker.js
// ============================================

const CACHE_NAME = 'story-app-v5';

// APP SHELL - File yang HARUS di-cache untuk offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon.png',
  '/icons/icon-512x512.png'
];

// ============================================
// INSTALL - Cache App Shell
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v5...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching App Shell files');
        
        // Cache file satu per satu untuk menghindari error
        const cachePromises = APP_SHELL.map(url => {
          return fetch(url)
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
              console.warn(`[SW] Failed to fetch ${url}:`, response.status);
              return Promise.resolve();
            })
            .catch(error => {
              console.warn(`[SW] Error caching ${url}:`, error);
              return Promise.resolve();
            });
        });
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] App Shell cached successfully');
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
  console.log('[SW] Activating Service Worker v5...');
  
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
// FETCH - OFFLINE FIRST STRATEGY
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // ========== STRATEGI KHUSUS UNTUK NAVIGATION ==========
  // Ini yang membuat offline mode bekerja!
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match('/index.html')
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Returning cached index.html for navigation');
            return cachedResponse;
          }
          
          // Fallback: try network
          return fetch(request)
            .then(response => {
              if (response.ok) {
                // Cache the response
                caches.open(CACHE_NAME).then(cache => {
                  cache.put('/index.html', response.clone());
                });
                return response;
              }
              return response;
            })
            .catch(() => {
              // Ultimate fallback
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>Offline - Story App</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      margin: 0;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                    }
                    .container {
                      text-align: center;
                      padding: 2rem;
                      max-width: 500px;
                    }
                    h1 { font-size: 3rem; margin: 0 0 1rem 0; }
                    p { font-size: 1.2rem; margin: 0 0 2rem 0; opacity: 0.9; }
                    .emoji { font-size: 5rem; margin-bottom: 1rem; }
                    button {
                      background: white;
                      color: #667eea;
                      border: none;
                      padding: 1rem 2rem;
                      font-size: 1rem;
                      font-weight: bold;
                      border-radius: 50px;
                      cursor: pointer;
                      transition: transform 0.2s;
                    }
                    button:hover { transform: scale(1.05); }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="emoji">📴</div>
                    <h1>Sedang Offline</h1>
                    <p>Aplikasi tidak dapat terhubung ke internet. Pastikan koneksi internet Anda aktif.</p>
                    <button onclick="location.reload()">🔄 Coba Lagi</button>
                  </div>
                </body>
                </html>`,
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
        })
    );
    return;
  }

  // ========== API REQUESTS (Network First, Fallback to Cache) ==========
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('[SW] Returning cached API response for:', url.pathname);
                return cachedResponse;
              }
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

  // ========== APP RESOURCES (Cache First, Update in Background) ==========
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cache immediately
        if (cachedResponse) {
          console.log('[SW] Cache hit for:', url.pathname);
          
          // Update cache in background
          fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {
              // Silent fail
            });
          
          return cachedResponse;
        }
        
        // Cache miss - fetch from network
        console.log('[SW] Cache miss, fetching:', url.pathname);
        
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed for:', url.pathname);
            
            // Return empty response for non-critical resources
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
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    tag: 'story-notification',
    requireInteraction: false,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Notifikasi Baru',
        body: data.body || 'Ada data baru ditambahkan.',
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