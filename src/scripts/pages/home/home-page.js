import ApiService from '../../data/api.js';
import { showFormattedDate } from '../../utils/index.js';
import IndexedDBHelper from '../../utils/idb.js';

export default class HomePage {
  async render() {
  return `
    <section class="container">
      <h1>Cerita Dicoding</h1>
      <div class="notification-toggle">
        <label for="notification-toggle">Aktifkan Push Notification:</label>
        <input type="checkbox" id="notification-toggle">
        <button id="push-toggle" class="btn">Aktifkan Notifikasi</button>
      </div>
      <div class="offline-controls">
        <button id="sync-btn" class="btn-secondary">Sync Offline Data</button>
        <button id="clear-cache-btn" class="btn-secondary">Clear Cache</button>
      </div>
      <div class="content-wrapper" id="content-wrapper" style="display: none;">
        <div class="stories-list" id="stories-list"></div>
        <div class="map-container" id="map" role="application" aria-label="Peta lokasi cerita"></div>
      </div>
      <a href="#/add-story" class="btn add-story-btn">Tambah Cerita Baru</a>
    </section>
  `;

}

  async afterRender() {
    await this._loadStories();
    this._initMap();
    this._initNotificationToggle();
    this._initOfflineControls();
   
  
}
  _initOfflineControls() {
  const syncBtn = document.getElementById('sync-btn');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  
  syncBtn.addEventListener('click', async () => {
    await this._syncOfflineStories();
    await this._loadStories(); // Reload to show synced data
    await Swal.fire({
      icon: 'success',
      title: 'Sync Selesai',
      text: 'Data offline telah disinkronisasi.',
      timer: 2000,
      showConfirmButton: false
    });
  });
  
  clearCacheBtn.addEventListener('click', async () => {
    await IndexedDBHelper.clearAllStories();
    await this._loadStories();
    await Swal.fire({
      icon: 'info',
      title: 'Cache Dibersihkan',
      text: 'Semua data cache telah dihapus.',
      timer: 2000,
      showConfirmButton: false
    });
  });
}

// Update home-page.js _clearCache method
async _clearCache() {
  try {
    const result = await Swal.fire({
      title: 'Hapus Cache?',
      text: 'Semua data offline akan dihapus. Tindakan ini tidak dapat dibatalkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }

    console.log('Starting cache clear process...');
    
    // Clear IndexedDB
    await IndexedDBHelper.clearAllStories();
    console.log('IndexedDB cleared');
    
    // Clear API cache if using workbox
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('Available caches:', cacheNames);
      
      for (const cacheName of cacheNames) {
        if (cacheName.includes('story-app') || cacheName.includes('api-cache') || cacheName.includes('stories-cache')) {
          await caches.delete(cacheName);
          console.log('Deleted cache:', cacheName);
        }
      }
    }
    
    // Clear localStorage if needed
    // localStorage.clear(); // Uncomment if you want to clear all localStorage
    
    // Reload stories (will show empty or fetch from API)
    await this._loadStories();
    
    await Swal.fire({
      icon: 'success',
      title: 'Cache Dibersihkan',
      text: 'Semua data cache telah dihapus.',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Terjadi kesalahan saat menghapus cache: ${error.message}`,
    });
  }
}

// Update _initOfflineControls
_initOfflineControls() {
  const syncBtn = document.getElementById('sync-btn');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  
  syncBtn.addEventListener('click', () => {
    this._syncOfflineStories();
  });
  
  clearCacheBtn.addEventListener('click', () => {
    this._clearCache();
  });
}


_initNotificationToggle() {
  const toggle = document.getElementById('notification-toggle');
  
  // Check current subscription status on load
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((subscription) => {
        toggle.checked = !!subscription;
        console.log('Current subscription status:', !!subscription);
      }).catch((error) => {
        console.error('Error checking subscription:', error);
        toggle.checked = false;
      });
    }).catch((error) => {
      console.error('Service worker not ready:', error);
      toggle.checked = false;
    });
  } else {
    console.log('Push notifications not supported');
    toggle.disabled = true;
    toggle.parentElement.innerHTML += '<small style="color: #666; margin-left: 1rem;">(Tidak didukung di browser ini)</small>';
  }
  
  toggle.addEventListener('change', async (event) => {
    const isChecked = event.target.checked;
    console.log('Toggle changed:', isChecked);
    
    try {
      if (isChecked) {
        await this._subscribeToNotifications();
      } else {
        await this._unsubscribeFromNotifications();
      }
    } catch (error) {
      console.error('Error in toggle handler:', error);
      // Reset toggle state on error
      event.target.checked = !isChecked;
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan saat mengubah pengaturan notifikasi.',
      });
    }
  });
}

async _subscribeToNotifications() {
  console.log('Starting subscription process...');
  
  try {
    // Check if service worker is ready
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker tidak didukung');
    }
    
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready');
    
    // Check notification permission
    if (Notification.permission === 'denied') {
      throw new Error('Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.');
    }
    
    // Request permission if not granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Izin notifikasi diperlukan untuk fitur ini.');
      }
    }
    
    // Get VAPID public key
    const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
    
    console.log('Subscribing to push...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this._urlBase64ToUint8Array(vapidPublicKey)
    });
    
    console.log('Subscription created:', subscription);
    
    // Extract keys
    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');
    
    if (!p256dhKey || !authKey) {
      throw new Error('Gagal mendapatkan kunci subscription');
    }
    
    // Send to server
    const result = await ApiService.subscribeNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this._arrayBufferToBase64(p256dhKey),
        auth: this._arrayBufferToBase64(authKey)
      }
    });
    
    if (result.error) {
      throw new Error(result.message || 'Gagal subscribe ke server');
    }
    
    console.log('Successfully subscribed');
    await Swal.fire({
      icon: 'success',
      title: 'Push Notification Diaktifkan',
      text: 'Anda akan menerima notifikasi ketika ada cerita baru.',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    console.error('Subscription failed:', error);
    throw error; // Re-throw to be caught by toggle handler
  }
}

async _unsubscribeFromNotifications() {
  console.log('Starting unsubscription process...');
  
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker tidak didukung');
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('No active subscription found');
      return; // Not an error, just no subscription to remove
    }
    
    console.log('Unsubscribing...');
    
    // Unsubscribe from server first
    const result = await ApiService.unsubscribeNotification(subscription.endpoint);
    
    if (result.error) {
      console.warn('Server unsubscribe failed, but continuing with local unsubscribe');
    }
    
    // Unsubscribe locally
    const success = await subscription.unsubscribe();
    
    if (!success) {
      throw new Error('Gagal unsubscribe dari browser');
    }
    
    console.log('Successfully unsubscribed');
    await Swal.fire({
      icon: 'info',
      title: 'Push Notification Dinonaktifkan',
      text: 'Anda tidak akan menerima notifikasi lagi.',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    console.error('Unsubscription failed:', error);
    throw error; // Re-throw to be caught by toggle handler
  }
}


// ... existing helper methods ...

_urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

_arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async _loadStories() {
  const loadingIndicator = document.createElement('p');
  loadingIndicator.id = "loading-indicator";
  loadingIndicator.textContent = "Memuat cerita...";
  document.querySelector('.container').prepend(loadingIndicator);

  const contentWrapper = document.getElementById('content-wrapper');

  try {
    let stories = [];

    if (navigator.onLine) {
      const result = await ApiService.getStories({ location: 1 });
      if (!result.error) {
        stories = result.listStory;
        await this._cacheStoriesToIndexedDB(stories);
      }
    } else {
      stories = await IndexedDBHelper.getAllStories();
    }

    this._renderStories(stories);
    this.stories = stories;

    loadingIndicator.style.display = 'none';
    contentWrapper.style.display = 'grid';

  } catch (error) {
    console.error('Error loading stories:', error);

    try {
      const cachedStories = await IndexedDBHelper.getAllStories();
      this._renderStories(cachedStories);
      this.stories = cachedStories;
      loadingIndicator.style.display = 'none';
      contentWrapper.style.display = 'grid';
    } catch (cacheError) {
      loadingIndicator.textContent = 'Gagal memuat cerita. Coba periksa koneksi internet.';
    }
  }
}


async _cacheStoriesToIndexedDB(stories) {
  for (const story of stories) {
    try {
      await IndexedDBHelper.addStory({ ...story, synced: true });
    } catch (error) {
      // Story might already exist, try update
      try {
        await IndexedDBHelper.updateStory({ ...story, synced: true });
      } catch (updateError) {
        console.error('Error caching story:', updateError);
      }
    }
  }
}

async _syncOfflineStories() {
  if (!navigator.onLine) {
    await Swal.fire({
      icon: 'warning',
      title: 'Offline',
      text: 'Tidak dapat sync karena tidak ada koneksi internet.',
    });
    return;
  }
  
  try {
    const unsyncedStories = await IndexedDBHelper.getUnsyncedStories();
    console.log('Unsynced stories found:', unsyncedStories.length);
    
    if (unsyncedStories.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Data untuk Sync',
        text: 'Semua data sudah tersinkronisasi.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    
    let syncedCount = 0;
    
    for (const story of unsyncedStories) {
      try {
        // For demo purposes, we'll use guest endpoint
        // In real app, you'd need to handle authentication and file uploads properly
        const result = await ApiService.addStoryGuest({
          description: story.description,
          photo: story.photo, // This is just filename, you might need to store actual file
          lat: story.lat,
          lon: story.lon
        });
        
        if (!result.error) {
          await IndexedDBHelper.markAsSynced(story.id);
          syncedCount++;
          console.log('Story synced successfully:', story.id);
        } else {
          console.error('Failed to sync story:', story.id, result.message);
        }
      } catch (error) {
        console.error('Error syncing story:', story.id, error);
      }
    }
    
    if (syncedCount > 0) {
      await Swal.fire({
        icon: 'success',
        title: 'Sync Berhasil',
        text: `${syncedCount} cerita berhasil disinkronisasi ke server.`,
        timer: 3000,
        showConfirmButton: false
      });
      
      // Reload stories to show synced data
      await this._loadStories();
    } else {
      await Swal.fire({
        icon: 'warning',
        title: 'Sync Gagal',
        text: 'Tidak ada cerita yang berhasil disinkronisasi.',
      });
    }
    
  } catch (error) {
    console.error('Error during sync:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error Sync',
      text: 'Terjadi kesalahan saat menyinkronisasi data.',
    });
  }
}

constructor() {
  window.addEventListener("online", () => {
    console.log("Back online, syncing...");
    this._syncOfflineStories();
  });
}

  _renderStories(stories) {
    const storiesList = document.getElementById('stories-list');
    storiesList.innerHTML = stories.map(story => `
      <article class="story-card" data-id="${story.id}">
        <img src="${story.photoUrl}" alt="Foto cerita oleh ${story.name}" loading="lazy">
        <div class="story-content">
          <h3>${story.name}</h3>
          <p>${story.description}</p>
          <time datetime="${story.createdAt}">${showFormattedDate(story.createdAt)}</time>
        </div>
      </article>
    `).join('');

    // Add click event to story cards
    storiesList.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', () => {
        const storyId = card.dataset.id;
        this._showStoryDetail(storyId);
      });
    });
  }

  async _showStoryDetail(storyId) {
    try {
      const result = await ApiService.getStoryDetail(storyId);
      if (!result.error) {
        const story = result.story;
        // Tampilkan modal atau navigasi ke halaman detail
        alert(`Detail Cerita:\n\nNama: ${story.name}\nDeskripsi: ${story.description}\nTanggal: ${showFormattedDate(story.createdAt)}`);
      }
    } catch (error) {
      console.error('Error loading story detail:', error);
    }
  }

  _initMap() {
    const map = L.map('map').setView([-6.2, 106.816666], 10);
    
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Satellite": satelliteLayer
    };

    L.control.layers(baseLayers).addTo(map);
    osmLayer.addTo(map);

    this.map = map;
    this.markers = [];

    if (this.stories) {
      this._addMarkersToMap();
    }
  }

  _addMarkersToMap() {
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    this.stories.forEach(story => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.map)
          .bindPopup(`
            <img src="${story.photoUrl}" alt="Foto cerita" style="width: 100px; height: auto;">
            <h4>${story.name}</h4>
            <p>${story.description}</p>
            <small>${showFormattedDate(story.createdAt)}</small>
          `);
        
        marker.on('click', () => {
          this._highlightStory(story.id);
        });

        this.markers.push(marker);
      }
    });
  }

  _highlightStory(storyId) {
    document.querySelectorAll('.story-card').forEach(card => {
      card.classList.remove('highlight');
    });
    const storyCard = document.querySelector(`.story-card[data-id="${storyId}"]`);
    if (storyCard) {
      storyCard.classList.add('highlight');
      storyCard.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../../sw.js')  // Ganti dengan path service worker Anda
    .then(registration => {
      console.log('Service Worker registered:', registration);
    })
    .catch(error => {
      console.log('Service Worker registration failed:', error);
    });
}
