import ApiService from '../../data/api.js'; 
import { showFormattedDate } from '../../utils/index.js';
import IndexedDBHelper from '../../utils/idb.js';
import PushNotificationManager from '../../utils/push-notification.js';

export default class HomePage {
  constructor() {
    this.pushManager = new PushNotificationManager();
    this.currentView = 'all'; // 'all' or 'favorites'
    this.stories = [];
    
    // Auto-sync when coming online
    window.addEventListener("online", () => {
      console.log("Back online, syncing...");
      this._syncOfflineStories();
    });
  }

  async render() {
    return `
      <section class="container">
        <div class="page-header">
          <h1>Cerita Dicoding</h1>
          <div class="header-controls">
            <div class="notification-toggle">
              <label for="notification-toggle">
                <span class="toggle-icon">🔔</span>
                <input type="checkbox" id="notification-toggle">
                Push Notification
              </label>
            </div>
          </div>
        </div>

        <div class="view-tabs">
          <button id="view-all-btn" class="tab-btn active" data-view="all">
            📚 Semua Cerita
          </button>
          <button id="view-favorites-btn" class="tab-btn" data-view="favorites">
            ⭐ Favorit (<span id="favorites-count">0</span>)
          </button>
        </div>

        <!-- Bagian offline-controls dihapus karena tidak dibutuhkan -->

        <div id="loading-indicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Memuat cerita...</p>
        </div>

        <div class="content-wrapper" id="content-wrapper" style="display: none;">
          <div class="stories-list" id="stories-list"></div>
          <div class="map-container" id="map" role="application" aria-label="Peta lokasi cerita"></div>
        </div>

        <a href="#/add-story" class="btn add-story-btn">➕ Tambah Cerita Baru</a>
      </section>
    `;
  }

  async afterRender() {
    await this._loadStories();
    this._initMap();
    this._initNotificationToggle();
    this._initOfflineControls(); // tetap dibiarkan agar kode lain tidak rusak
    this._initViewTabs();
    await this._updateFavoritesCount();
  }

  _initViewTabs() {
    const allBtn = document.getElementById('view-all-btn');
    const favBtn = document.getElementById('view-favorites-btn');
    
    allBtn.addEventListener('click', () => {
      this.currentView = 'all';
      allBtn.classList.add('active');
      favBtn.classList.remove('active');
      this._renderStories(this.stories);
    });
    
    favBtn.addEventListener('click', async () => {
      this.currentView = 'favorites';
      favBtn.classList.add('active');
      allBtn.classList.remove('active');
      await this._loadFavorites();
    });
  }

  _initNotificationToggle() {
    const toggle = document.getElementById('notification-toggle');
    if (toggle) {
      this.pushManager.initToggle(toggle);
    }
  }

  _initOfflineControls() {
    const syncBtn = document.getElementById('sync-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const dbStatsBtn = document.getElementById('db-stats-btn');
    
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        await this._syncOfflineStories();
        await this._loadStories();
      });
    }
    
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', async () => {
        await this._clearCache();
      });
    }
    
    if (dbStatsBtn) {
      dbStatsBtn.addEventListener('click', async () => {
        await this._showDatabaseStats();
      });
    }
  }

  async _loadStories() {
    this._showLoading(true);

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

      this.stories = stories;
      this._renderStories(stories);
      this._showLoading(false);
      document.getElementById('content-wrapper').style.display = 'grid';

    } catch (error) {
      console.error('Error loading stories:', error);

      try {
        const cachedStories = await IndexedDBHelper.getAllStories();
        this.stories = cachedStories;
        this._renderStories(cachedStories);
        this._showLoading(false);
        document.getElementById('content-wrapper').style.display = 'grid';
      } catch (cacheError) {
        this._showLoading(false);
        await window.Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal memuat cerita. Silakan coba lagi.'
        });
      }
    }
  }

  async _loadFavorites() {
    this._showLoading(true);

    try {
      const favorites = await IndexedDBHelper.getAllFavorites();
      this._renderStories(favorites);
      this._showLoading(false);

      if (favorites.length === 0) {
        document.getElementById('stories-list').innerHTML = `
          <div class="empty-state">
            <p style="text-align: center; color: #999; padding: 2rem;">
              Belum ada cerita favorit.<br>
              Klik ⭐ pada cerita untuk menambahkan ke favorit.
            </p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      this._showLoading(false);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat favorit.'
      });
    }
  }

  async _cacheStoriesToIndexedDB(stories) {
    for (const story of stories) {
      try {
        await IndexedDBHelper.addStory({ ...story, synced: true });
      } catch (error) {
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
      await window.Swal.fire({
        icon: 'warning',
        title: 'Offline',
        text: 'Tidak dapat sync karena tidak ada koneksi internet.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    
    try {
      const unsyncedStories = await IndexedDBHelper.getUnsyncedStories();
      
      if (unsyncedStories.length === 0) {
        await window.Swal.fire({
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
          const result = await ApiService.addStoryGuest({
            description: story.description,
            photo: story.photo,
            lat: story.lat,
            lon: story.lon
          });
          
          if (!result.error) {
            await IndexedDBHelper.markAsSynced(story.id);
            syncedCount++;
          }
        } catch (error) {
          console.error('Error syncing story:', story.id, error);
        }
      }
      
      if (syncedCount > 0) {
        await window.Swal.fire({
          icon: 'success',
          title: 'Sync Berhasil',
          text: `${syncedCount} cerita berhasil disinkronisasi.`,
          timer: 2000,
          showConfirmButton: false
        });
      }
      
    } catch (error) {
      console.error('Error during sync:', error);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error Sync',
        text: 'Terjadi kesalahan saat menyinkronisasi data.'
      });
    }
  }

  async _clearCache() {
    try {
      const result = await window.Swal.fire({
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
        return;
      }

      await IndexedDBHelper.clearAllStories();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      
      await this._loadStories();
      
      await window.Swal.fire({
        icon: 'success',
        title: 'Cache Dibersihkan',
        text: 'Semua data cache telah dihapus.',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Gagal menghapus cache: ${error.message}`
      });
    }
  }

  async _showDatabaseStats() {
    try {
      const stats = await IndexedDBHelper.getDatabaseStats();
      
      await window.Swal.fire({
        title: '📊 Database Statistics',
        html: `
          <div style="text-align: left; padding: 1rem;">
            <p><strong>Total Stories:</strong> ${stats.totalStories}</p>
            <p><strong>Synced Stories:</strong> ${stats.syncedStories}</p>
            <p><strong>Unsynced Stories:</strong> ${stats.unsyncedStories}</p>
            <p><strong>Total Favorites:</strong> ${stats.totalFavorites}</p>
            <hr style="margin: 1rem 0;">
            <p style="color: #666; font-size: 0.9rem;">
              Network: ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}
            </p>
          </div>
        `,
        icon: 'info'
      });
    } catch (error) {
      console.error('Error showing stats:', error);
    }
  }

  _renderStories(stories) {
    const storiesList = document.getElementById('stories-list');
    
    if (!stories || stories.length === 0) {
      storiesList.innerHTML = '<p style="text-align: center; color: #999;">Tidak ada cerita.</p>';
      return;
    }

    storiesList.innerHTML = stories.map(story => `
      <article class="story-card" data-id="${story.id}">
        <img src="${story.photoUrl}" alt="Foto cerita oleh ${story.name}" loading="lazy">
        <div class="story-content">
          <div class="story-header">
            <h3>${story.name}</h3>
            <button class="favorite-btn" data-id="${story.id}" aria-label="Toggle favorite">
              ⭐
            </button>
          </div>
          <p>${story.description}</p>
          <time datetime="${story.createdAt}">${showFormattedDate(story.createdAt)}</time>
        </div>
      </article>
    `).join('');

    // Update favorite button states
    this._updateFavoriteButtons();

    // Add click events
    storiesList.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('favorite-btn')) {
          const storyId = card.dataset.id;
          this._showStoryDetail(storyId);
        }
      });
    });

    // Add favorite button events
    storiesList.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this._toggleFavorite(btn.dataset.id);
      });
    });

    this._addMarkersToMap();
  }

  async _updateFavoriteButtons() {
    const buttons = document.querySelectorAll('.favorite-btn');
    for (const btn of buttons) {
      const isFav = await IndexedDBHelper.isFavorite(btn.dataset.id);
      btn.classList.toggle('is-favorite', isFav);
      btn.style.opacity = isFav ? '1' : '0.3';
    }
  }

  async _updateFavoritesCount() {
    try {
      const favorites = await IndexedDBHelper.getAllFavorites();
      const countElement = document.getElementById('favorites-count');
      if (countElement) {
        countElement.textContent = favorites.length;
      }
    } catch (error) {
      console.error('Error updating favorites count:', error);
    }
  }

  async _toggleFavorite(storyId) {
    try {
      const isFavorite = await IndexedDBHelper.isFavorite(storyId);
      const story = this.stories.find(s => s.id === storyId);
      
      if (!story) {
        console.error('Story not found:', storyId);
        return;
      }
      
      if (isFavorite) {
        await IndexedDBHelper.removeFromFavorites(storyId);
        await window.Swal.fire({
          icon: 'info',
          title: 'Dihapus dari Favorit',
          timer: 1500,
          showConfirmButton: false,
          position: 'bottom-end',
          toast: true
        });
      } else {
        await IndexedDBHelper.addToFavorites(story);
        await window.Swal.fire({
          icon: 'success',
          title: 'Ditambahkan ke Favorit',
          timer: 1500,
          showConfirmButton: false,
          position: 'bottom-end',
          toast: true
        });
      }
      
      await this._updateFavoriteButtons();
      await this._updateFavoritesCount();
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Gagal mengubah status favorit.'
      });
    }
  }

  async _showStoryDetail(storyId) {
    try {
      const result = await ApiService.getStoryDetail(storyId);
      if (!result.error) {
        const story = result.story;
        await window.Swal.fire({
          title: story.name,
          html: `
            <img src="${story.photoUrl}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
            <p style="text-align: left; margin: 1rem 0;">${story.description}</p>
            <p style="text-align: left; color: #666; font-size: 0.9rem;">${showFormattedDate(story.createdAt)}</p>
          `,
          confirmButtonText: 'Tutup'
        });
      }
    } catch (error) {
      console.error('Error loading story detail:', error);
    }
  }

  _initMap() {
    if (typeof L === 'undefined') {
      console.error('Leaflet not loaded');
      return;
    }

    const map = L.map('map').setView([-6.2, 106.816666], 10);
    
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri'
    });

    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Satellite": satelliteLayer
    };

    L.control.layers(baseLayers).addTo(map);
    osmLayer.addTo(map);

    this.map = map;
    this.markers = [];
  }

  _addMarkersToMap() {
    if (!this.map) return;

    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    this.stories.forEach(story => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.map)
          .bindPopup(`
            <div style="text-align: center;">
              <img src="${story.photoUrl}" alt="Foto cerita" style="width: 100px; height: auto; border-radius: 4px; margin-bottom: 0.5rem;">
              <h4 style="margin: 0.5rem 0;">${story.name}</h4>
              <p style="margin: 0.25rem 0; font-size: 0.9rem;">${story.description.substring(0, 100)}...</p>
              <small style="color: #666;">${showFormattedDate(story.createdAt)}</small>
            </div>
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
      storyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  _showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }
}