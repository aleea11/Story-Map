import ApiService from '../../data/api.js';
import IndexedDBHelper from '../../utils/idb.js';

export default class AddStoryPage {
  async render() {
    return `
      <section class="container">
        <h1>Tambah Cerita Baru</h1>
        <form id="add-story-form" class="story-form">
          <div class="form-group">
            <label for="description">Deskripsi:</label>
            <textarea id="description" name="description" required aria-describedby="description-error" rows="4" placeholder="Ceritakan pengalaman Anda..."></textarea>
            <span id="description-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label for="photo">Foto:</label>
            <input type="file" id="photo" name="photo" accept="image/*" required aria-describedby="photo-error">
            <button type="button" id="camera-btn" class="btn-secondary" aria-describedby="camera-help">Ambil dari Kamera</button>
            <span id="camera-help" class="help-text">Klik untuk mengambil foto langsung dari kamera perangkat</span>
            <span id="photo-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label for="map">Lokasi (klik pada peta untuk memilih):</label>
            <div id="map" class="map-container" role="application" aria-label="Pilih lokasi pada peta dengan mengklik area yang diinginkan" tabindex="0"></div>
            <input type="hidden" id="lat" name="lat" aria-describedby="location-info">
            <input type="hidden" id="lon" name="lon" aria-describedby="location-info">
            <p id="location-info" class="location-info" role="status" aria-live="polite">Belum ada lokasi dipilih. Klik pada peta untuk memilih lokasi.</p>
          </div>
          <button type="submit" class="btn" id="submit-btn" aria-describedby="story-status">Tambah Cerita</button>
          <div id="story-status" class="status-message" role="status" aria-live="polite"></div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    // Wait for Leaflet to be loaded
    if (typeof L === 'undefined') {
      console.error('Leaflet is not loaded');
      return;
    }
    
    this._initMap();
    this._initCamera();
    this._initForm();
    
    await this._checkAndRequestNotificationPermission();
  }

  _initMap() {
    try {
      const map = L.map('map').setView([-6.2, 106.816666], 10);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      let marker;
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('lat').value = lat;
        document.getElementById('lon').value = lng;
        document.getElementById('location-info').textContent = `Lokasi dipilih: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        if (marker) {
          map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);
      });

      this.map = map;
    } catch (error) {
      console.error('Error initializing map:', error);
      document.getElementById('map').innerHTML = '<p>Error loading map. Please refresh the page.</p>';
    }
  }

  _initCamera() {
    const cameraBtn = document.getElementById('camera-btn');
    const photoInput = document.getElementById('photo');

    cameraBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'camera-modal';
        modal.innerHTML = `
          <h3>Ambil Foto</h3>
          <video id="camera-video" autoplay playsinline></video>
          <div>
            <button id="capture-btn">Ambil Foto</button>
            <button id="close-camera">Tutup</button>
          </div>
        `;
        document.body.appendChild(modal);

        const cameraVideo = modal.querySelector('#camera-video');
        cameraVideo.srcObject = stream;

        modal.querySelector('#capture-btn').addEventListener('click', () => {
          canvas.width = cameraVideo.videoWidth;
          canvas.height = cameraVideo.videoHeight;
          context.drawImage(cameraVideo, 0, 0);
          
          canvas.toBlob((blob) => {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            photoInput.files = dataTransfer.files;
          });
          
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(modal);
        });

        modal.querySelector('#close-camera').addEventListener('click', () => {
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(modal);
        });
      } catch (error) {
        alert('Tidak dapat mengakses kamera');
      }
    });
  }

  _initForm() {
    const form = document.getElementById('add-story-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusDiv = document.getElementById('story-status');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(form);
      const description = formData.get('description');
      const photo = formData.get('photo');
      const latValue = formData.get('lat');
      const lonValue = formData.get('lon');
      
      // Validation
      if (!description || !description.trim()) {
        document.getElementById('description-error').textContent = 'Deskripsi tidak boleh kosong';
        return;
      }
      
      if (!photo || photo.size === 0) {
        document.getElementById('photo-error').textContent = 'Pilih foto terlebih dahulu';
        return;
      }
      
      // Clear error messages
      document.getElementById('description-error').textContent = '';
      document.getElementById('photo-error').textContent = '';
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sedang Menambah Cerita...';
      statusDiv.textContent = 'Memproses cerita...';
      
      // Prepare data for API
      const apiData = {
        description: description.trim(),
        photo: photo
      };
      
      // Only add lat/lon if they have valid values
      const lat = latValue ? parseFloat(latValue) : null;
      const lon = lonValue ? parseFloat(lonValue) : null;
      
      if (lat !== null && !isNaN(lat)) {
        apiData.lat = lat;
      }
      
      if (lon !== null && !isNaN(lon)) {
        apiData.lon = lon;
      }
      
      // Prepare data for IndexedDB (offline)
      const storyData = {
        id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: description.trim(),
        photo: photo.name, // Store filename only for demo
        lat: lat,
        lon: lon,
        createdAt: new Date().toISOString(),
        synced: false
      };

      try {
        if (navigator.onLine) {
          // Online: send to API
          console.log('Sending to API:', apiData);
          const token = localStorage.getItem('token');
          const result = token 
            ? await ApiService.addStory(apiData)
            : await ApiService.addStoryGuest(apiData);
          
          if (!result.error) {
            // ✅✅✅ TRIGGER PUSH NOTIFICATION DI SINI ✅✅✅
            await this._triggerPushNotification(description);
            
            await Swal.fire({
              icon: 'success',
              title: 'Cerita Berhasil Ditambahkan!',
              text: 'Cerita Anda telah dibagikan ke komunitas.',
              timer: 2000,
              showConfirmButton: false
            });
            window.location.hash = '#/';
          } else {
            throw new Error(result.message);
          }
        } else {
          // Offline: save to IndexedDB
          console.log('Saving offline story:', storyData);
          await IndexedDBHelper.addStory(storyData);
          await Swal.fire({
            icon: 'info',
            title: 'Cerita Disimpan Offline',
            text: 'Cerita akan di-sync ketika koneksi internet tersedia.',
            timer: 3000,
            showConfirmButton: false
          });
          window.location.hash = '#/';
        }
      } catch (error) {
        console.error('Error adding story:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Terjadi kesalahan saat menambah cerita. Silakan coba lagi.'
        });
      } finally {
        // Reset loading state
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tambah Cerita';
        statusDiv.textContent = '';
      }
    });
  }

  // ============================================
  // ✅ PUSH NOTIFICATION FUNCTIONS
  // ============================================

  async _checkAndRequestNotificationPermission() {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log('Browser tidak support notifications');
        return;
      }

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('Browser tidak support service worker');
        return;
      }

      // Check current permission status
      const permission = Notification.permission;
      console.log('Current notification permission:', permission);

      // If default (not asked yet), don't auto-request
      // User will be asked when they enable toggle on homepage
      if (permission === 'default') {
        console.log('Notification permission belum diminta');
        return;
      }

      // If denied, inform user
      if (permission === 'denied') {
        console.log('Notification permission ditolak oleh user');
        return;
      }

      // If granted, ensure we have subscription
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        await this._ensurePushSubscription();
      }

    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  }

  async _ensurePushSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('Tidak ada subscription, membuat baru...');
        
        // VAPID public key dari API Dicoding
        const VAPID_PUBLIC_KEY = 'BN7-r0Svv7CsTi18-OPYtJLVW0bfuZ1x1UhyhHsQCIqKu543pM8sK5EPTYaFmNt3S-7dVbPVGK34jF6LVXzH9Xo';
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('✅ Push subscription created:', subscription.endpoint);

        // Optional: Send subscription to your server
        // await this._sendSubscriptionToServer(subscription);
      } else {
        console.log('✅ Push subscription sudah ada:', subscription.endpoint);
      }

    } catch (error) {
      console.error('Error ensuring push subscription:', error);
    }
  }

  async _triggerPushNotification(description) {
    try {
      console.log('🔔 Triggering push notification...');

      // Check if Service Worker and Push API are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Push notifications not supported');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if user has granted permission
      if (Notification.permission !== 'granted') {
        console.log('❌ Push notification permission not granted');
        
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ User denied notification permission');
          return;
        }
      }

      // Get current subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('⚠️ No push subscription, creating one...');
        await this._ensurePushSubscription();
        subscription = await registration.pushManager.getSubscription();
      }

      console.log('✅ Push subscription ready:', subscription ? 'YES' : 'NO');

      await registration.showNotification('Notifikasi Baru', {
        body: 'Ada data baru ditambahkan.',
        icon: '/icons/icon.png',
        badge: '/icons/icon.png',
        tag: 'new-story-' + Date.now(),
        requireInteraction: false,
        data: { 
          url: '/',
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        actions: [
          { 
            action: 'open', 
            title: 'Lihat',
            icon: '/icons/icon.png'
          },
          { 
            action: 'close', 
            title: 'Tutup'
          }
        ]
      });

      console.log('✅ Push notification displayed successfully!');

      // ============================================
      // 📝 PRODUCTION NOTE:
      // ============================================
      // Di production, setelah story berhasil ditambah, backend server
      // harus mengirim push notification ke semua subscribers menggunakan
      // subscription endpoint dan VAPID keys.
      //
      // Contoh (di backend Node.js dengan web-push library):
      // 
      // const webpush = require('web-push');
      // 
      // webpush.setVapidDetails(
      //   'mailto:your-email@example.com',
      //   VAPID_PUBLIC_KEY,
      //   VAPID_PRIVATE_KEY
      // );
      //
      // const notificationPayload = {
      //   notification: {
      //     title: 'Notifikasi Baru',
      //     body: 'Ada data baru ditambahkan.',
      //     icon: '/icons/icon-192x192.png'
      //   }
      // };
      //
      // subscriptions.forEach(subscription => {
      //   webpush.sendNotification(subscription, JSON.stringify(notificationPayload));
      // });
      // ============================================

    } catch (error) {
      console.error('❌ Error triggering push notification:', error);
      
      // Fallback: Show browser notification jika push API gagal
      if (Notification.permission === 'granted') {
        new Notification('Notifikasi Baru', {
          body: 'Ada data baru ditambahkan.',
          icon: '/icons/icon-192x192.png'
        });
      }
    }
  }

  /**
   * Convert VAPID key dari Base64 URL-safe ke Uint8Array
   */
  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Optional: Send subscription to server
   * (Uncomment jika ada backend endpoint untuk menyimpan subscription)
   */
  /*
  async _sendSubscriptionToServer(subscription) {
    try {
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this._arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this._arrayBufferToBase64(subscription.getKey('auth'))
        }
      };

      const response = await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        console.log('✅ Subscription saved to server');
      }
    } catch (error) {
      console.error('❌ Error sending subscription to server:', error);
    }
  }

  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  */
}