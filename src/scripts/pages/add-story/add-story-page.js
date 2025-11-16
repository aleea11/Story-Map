// ============================================
// UPDATE ini di src/scripts/pages/add-story/add-story-page.js
// ============================================

import ApiService from '../../data/api.js';
import IndexedDBHelper from '../../utils/idb.js';
import Toast from '../../utils/toast.js'; // ✅ IMPORT INI

export default class AddStoryPage {
  async render() {
    return `
      <section class="container">
        <h1>Tambah Cerita Baru</h1>
        <form id="add-story-form" class="story-form">
          <div class="form-group">
            <label for="description">Deskripsi:</label>
            <textarea id="description" name="description" required rows="4" placeholder="Ceritakan pengalaman Anda..."></textarea>
            <span id="description-error" class="error-message"></span>
          </div>
          <div class="form-group">
            <label for="photo">Foto:</label>
            <input type="file" id="photo" name="photo" accept="image/*" required>
            <button type="button" id="camera-btn" class="btn-secondary">Ambil dari Kamera</button>
            <span id="photo-error" class="error-message"></span>
          </div>
          <div class="form-group">
            <label for="map">Lokasi (klik pada peta untuk memilih):</label>
            <div id="map" class="map-container"></div>
            <input type="hidden" id="lat" name="lat">
            <input type="hidden" id="lon" name="lon">
            <p id="location-info" class="location-info">Belum ada lokasi dipilih. Klik pada peta untuk memilih lokasi.</p>
          </div>
          <button type="submit" class="btn" id="submit-btn">Tambah Cerita</button>
        </form>
      </section>
    `;
  }

  async afterRender() {
    if (typeof L === 'undefined') {
      console.error('Leaflet is not loaded');
      return;
    }
    
    this._initMap();
    this._initCamera();
    this._initForm();
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
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
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
      
      document.getElementById('description-error').textContent = '';
      document.getElementById('photo-error').textContent = '';
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sedang Menambah Cerita...';
      
      const apiData = {
        description: description.trim(),
        photo: photo
      };
      
      const lat = latValue ? parseFloat(latValue) : null;
      const lon = lonValue ? parseFloat(lonValue) : null;
      
      if (lat !== null && !isNaN(lat)) {
        apiData.lat = lat;
      }
      
      if (lon !== null && !isNaN(lon)) {
        apiData.lon = lon;
      }
      
      const storyData = {
        id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: description.trim(),
        photo: photo.name,
        lat: lat,
        lon: lon,
        createdAt: new Date().toISOString(),
        synced: false
      };

      try {
        if (navigator.onLine) {
          console.log('Sending to API:', apiData);
          const token = localStorage.getItem('token');
          const result = token 
            ? await ApiService.addStory(apiData)
            : await ApiService.addStoryGuest(apiData);
          
          if (!result.error) {
            // ✅✅✅ TAMPILKAN TOAST NOTIFICATION ✅✅✅
            Toast.show('Notifikasi Baru', 'Ada data baru ditambahkan.');
            
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
          text: error.message || 'Terjadi kesalahan saat menambah cerita.'
        });
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tambah Cerita';
      }
    });
  }
}