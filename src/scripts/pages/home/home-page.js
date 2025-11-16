import ApiService from '../../data/api.js'; 
import { showFormattedDate } from '../../utils/index.js';
import IndexedDBHelper from '../../utils/idb.js';

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
          <h1>📖 Cerita Dicoding</h1>
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

        <!-- Database Stats Button -->
        <div style="margin: 1rem 0; display: flex; gap: 1rem;">
          <button id="db-stats-btn" class="btn-secondary">
            📊 Statistik Database
          </button>
          <button id="clear-favorites-btn" class="btn-secondary" style="background: #dc3545;">
            🗑️ Hapus Semua Favorit
          </button>
        </div>

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
    this._initViewTabs();
    this._initDatabaseControls();
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

  _initDatabaseControls() {
    const statsBtn = document.getElementById('db-stats-btn');
    const clearBtn = document.getElementById('clear-favorites-btn');
    
    if (statsBtn) {
      statsBtn.addEventListener('click', async () => {
        await this._showDatabaseStats();
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await this._clearAllFavorites();
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
        
        if (stories.length === 0) {
          await window.Swal.fire({
            icon: 'warning',
            title: 'Offline',
            text: 'Anda sedang offline dan belum ada data tersimpan.'
          });
        }
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
            <div>⭐</div>
            <h3>Belum Ada Favorit</h3>
            <p style="text-align: center; color: #999; padding: 2rem;">
              Klik tombol <strong>⭐</strong> pada cerita untuk menambahkannya ke favorit.<br>
              Data favorit akan tersimpan di <strong>IndexedDB</strong> browser Anda.
            </p>
          </div>
        `;
      } else {
        // Event listener untuk hapus dari favorit
        document.querySelectorAll('.remove-favorite-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this._removeFromFavorites(btn.dataset.id);
          });
        });
      }

    } catch (error) {
      console.error('Error loading favorites:', error);
      this._showLoading(false);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat favorit dari IndexedDB.'
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
    }
  }

  async _showDatabaseStats() {
    try {
      const stats = await IndexedDBHelper.getDatabaseStats();
      
      await window.Swal.fire({
        title: '📊 Statistik IndexedDB',
        html: `
          <div style="text-align: left; padding: 1rem;">
            <h3 style="margin-bottom: 1rem;">📦 Database: StoryAppDB</h3>
            
            <p><strong>📚 Total Stories (Cache):</strong> ${stats.totalStories}</p>
            <p><strong>✅ Synced:</strong> ${stats.syncedStories}</p>
            <p><strong>⏳ Unsynced:</strong> ${stats.unsyncedStories}</p>
            
            <hr style="margin: 1rem 0;">
            
            <p><strong>⭐ Total Favorit:</strong> ${stats.totalFavorites}</p>
            
            <hr style="margin: 1rem 0;">
            
            <p style="color: #666; font-size: 0.9rem;">
              <strong>Koneksi:</strong> ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}
            </p>
            
            <p style="color: #999; font-size: 0.8rem; margin-top: 1rem;">
              Data disimpan di IndexedDB browser Anda secara lokal.
            </p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'Tutup'
      });
    } catch (error) {
      console.error('Error showing stats:', error);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat statistik database.'
      });
    }
  }

  async _clearAllFavorites() {
    try {
      const result = await window.Swal.fire({
        title: '⚠️ Hapus Semua Favorit?',
        text: 'Semua cerita favorit akan dihapus dari IndexedDB. Tindakan ini tidak dapat dibatalkan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus Semua',
        cancelButtonText: 'Batal'
      });

      if (!result.isConfirmed) {
        return;
      }

      await IndexedDBHelper.clearAllFavorites();
      
      await window.Swal.fire({
        icon: 'success',
        title: 'Favorit Dihapus',
        text: 'Semua data favorit telah dihapus dari IndexedDB.',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Refresh tampilan
      if (this.currentView === 'favorites') {
        await this._loadFavorites();
      }
      await this._updateFavoritesCount();
      
    } catch (error) {
      console.error('Error clearing favorites:', error);
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal menghapus favorit.'
      });
    }
  }

  _renderStories(stories) {
    const storiesList = document.getElementById('stories-list');
    
    if (!stories || stories.length === 0) {
      storiesList.innerHTML = '<p style="text-align: center; color: #999;">Tidak ada cerita.</p>';
      return;
    }

    const isFavoritesView = this.currentView === 'favorites';

    storiesList.innerHTML = stories.map(story => `
      <article class="story-card" data-id="${story.id}">
        <img src="${story.photoUrl}" alt="Foto cerita oleh ${story.name}" loading="lazy">
        <div class="story-content">
          <div class="story-header">
            <h3>${story.name}</h3>
            <div class="story-actions">
              <button class="favorite-btn" data-id="${story.id}" aria-label="Toggle favorite" title="Tambah/Hapus Favorit">
                ⭐
              </button>
              ${isFavoritesView ? `
                <button class="remove-favorite-btn" data-id="${story.id}" aria-label="Hapus dari favorit" title="Hapus dari IndexedDB">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>
          <p>${story.description}</p>
          <time datetime="${story.createdAt}">${showFormattedDate(story.createdAt)}</time>
        </div>
      </article>
    `).join('');

    this._updateFavoriteButtons();

    // Story card click events
    storiesList.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('favorite-btn') && 
            !e.target.classList.contains('remove-favorite-btn')) {
          const storyId = card.dataset.id;
          this._showStoryDetail(storyId);
        }
      });
    });

    // Favorite button events
    storiesList.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this._toggleFavorite(btn.dataset.id);
      });
    });

    // Remove favorite button events
    if (isFavoritesView) {
      storiesList.querySelectorAll('.remove-favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this._removeFromFavorites(btn.dataset.id);
        });
      });
    }

    this._addMarkersToMap();
  }

  async _updateFavoriteButtons() {
    const buttons = document.querySelectorAll('.favorite-btn');
    for (const btn of buttons) {
      const isFav = await IndexedDBHelper.isFavorite(btn.dataset.id);
      btn.classList.toggle('is-favorite', isFav);
      btn.style.opacity = isFav ? '1' : '0.3';
      btn.title = isFav ? 'Hapus dari Favorit' : 'Tambah ke Favorit';
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
        // HAPUS dari IndexedDB
        await IndexedDBHelper.removeFromFavorites(storyId);
        await window.Swal.fire({
          icon: 'info',
          title: '❌ Dihapus dari Favorit',
          text: 'Cerita dihapus dari IndexedDB.',
          timer: 1500,
          showConfirmButton: false,
          position: 'bottom-end',
          toast: true
        });
      } else {
        // TAMBAH ke IndexedDB
        await IndexedDBHelper.addToFavorites(story);
        await window.Swal.fire({
          icon: 'success',
          title: '✅ Ditambahkan ke Favorit',
          text: 'Cerita disimpan di IndexedDB browser.',
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
        text: 'Gagal mengubah status favorit di IndexedDB.'
      });
    }
  }

  async _removeFromFavorites(storyId) {
    try {
      const confirmDelete = await window.Swal.fire({
        title: '🗑️ Hapus dari Favorit?',
        text: 'Cerita ini akan dihapus dari IndexedDB.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
      });

      if (!confirmDelete.isConfirmed) return;

      await IndexedDBHelper.removeFromFavorites(storyId);

      await window.Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: 'Cerita telah dihapus dari IndexedDB.',
        timer: 1500,
        showConfirmButton: false,
        position: 'bottom-end',
        toast: true
      });

      await this._loadFavorites();
      await this._updateFavoritesCount();

    } catch (error) {
      console.error('Error removing favorite:', error);
      await window.Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: 'Terjadi kesalahan saat menghapus dari IndexedDB.'
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
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

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