import ApiService from '../data/api.js';
import IndexedDBHelper from './idb.js';

class PushNotificationManager {
  constructor() {
    this.isEnabled = false;
    this.latestStoryId = null;
  }

  /**
   * Inisialisasi toggle untuk push notification
   */
  initToggle(toggleElement) {
    // Ambil status sebelumnya dari localStorage
    this.isEnabled = localStorage.getItem('pushEnabled') === 'true';
    toggleElement.checked = this.isEnabled;

    toggleElement.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.isEnabled = true;
          localStorage.setItem('pushEnabled', 'true');
          this._showNotification('Push Notification diaktifkan!', 'Kamu akan mendapat notifikasi cerita baru.');
        } else {
          toggleElement.checked = false;
          this.isEnabled = false;
          localStorage.setItem('pushEnabled', 'false');
          alert('Izin notifikasi ditolak oleh pengguna.');
        }
      } else {
        this.isEnabled = false;
        localStorage.setItem('pushEnabled', 'false');
        this._showNotification('Push Notification dimatikan', 'Kamu tidak akan mendapat notifikasi lagi.');
      }
    });
  }

  /**
   * Mengecek apakah ada cerita baru (dijalankan setiap 1 menit di HomePage)
   */
  async checkNewStories() {
    if (!this.isEnabled || Notification.permission !== 'granted') return;

    try {
      const result = await ApiService.getStories({ location: 1 });
      if (!result.error && result.listStory.length > 0) {
        const latestStory = result.listStory[0];

        // Bandingkan ID terakhir
        if (this.latestStoryId && latestStory.id !== this.latestStoryId) {
          this._showNotification(
            'Cerita Baru dari Dicoding!',
            `${latestStory.name} baru saja membagikan cerita: "${latestStory.description.slice(0, 40)}..."`,
            latestStory.photoUrl
          );
        }

        // Simpan ID terbaru
        this.latestStoryId = latestStory.id;
        await IndexedDBHelper.addStory({ ...latestStory, synced: true });
      }
    } catch (error) {
      console.error('Gagal memeriksa cerita baru:', error);
    }
  }

  /**
   * Menampilkan notifikasi browser
   */
  _showNotification(title, body, image = null) {
    if (Notification.permission !== 'granted') return;

    const options = {
      body,
      icon: '/icons/icon-192x192.png',
      image,
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
    };

    new Notification(title, options);
  }
}

export default PushNotificationManager;
