// Di app.js (atau favorites.js), import helper jika belum
import IndexedDBHelper from './idb.js';  // Jika ES6, atau gunakan <script src="idb.js"></script> di HTML

// Fungsi untuk render list favorit di halaman favorit
async function displayFavorites() {
  try {
    const favorites = await IndexedDBHelper.getAllFavorites();
    const listElement = document.getElementById('favorites-list');  // ID elemen di HTML
    const countElement = document.getElementById('favorite-count');  // ID untuk counter

    if (!listElement) return;  // Jika elemen tidak ada, skip

    listElement.innerHTML = '';  // Clear list sebelum render

    if (favorites.length === 0) {
      listElement.innerHTML = '<p>Tidak ada cerita favorit.</p>';
    } else {
      favorites.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'favorite-item';  // Tambah class untuk styling
        item.innerHTML = `
          <h3>${fav.name || fav.title}</h3>  <!-- Sesuaikan field, misalnya 'name' atau 'title' -->
          <p>${fav.description || 'Deskripsi tidak tersedia'}</p>
          <button class="remove-fav-btn" data-id="${fav.id}">Hapus dari Favorit</button>
        `;
        listElement.appendChild(item);
      });
    }

    // Update counter
    if (countElement) {
      countElement.textContent = `⭐ Favorit (${favorites.length})`;
    }
  } catch (error) {
    console.error('Error displaying favorites:', error);
  }
}

// Handler untuk hapus favorit (gunakan event delegation untuk tombol dinamis)
document.addEventListener('click', async (event) => {
  if (event.target.classList.contains('remove-fav-btn')) {
    const id = event.target.getAttribute('data-id');
    try {
      await IndexedDBHelper.removeFromFavorites(id);
      alert('Cerita dihapus dari favorit.');
      displayFavorites();  // Refresh UI setelah hapus
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Gagal menghapus favorit. Coba lagi.');
    }
  }
});

// Panggil displayFavorites saat halaman favorit load
document.addEventListener('DOMContentLoaded', async () => {
  // Jika halaman favorit terpisah, cek URL atau flag
  if (window.location.pathname.includes('/favorites') || document.body.classList.contains('favorites-page')) {
    await displayFavorites();
  }
  // ... kode lain seperti untuk halaman utama
});

// Opsional: Fungsi untuk toggle favorit di halaman "Semua Cerita" (jika belum ada)
async function toggleFavorite(story) {
  try {
    const isFav = await IndexedDBHelper.isFavorite(story.id);
    if (isFav) {
      await IndexedDBHelper.removeFromFavorites(story.id);
      alert('Dihapus dari favorit.');
    } else {
      await IndexedDBHelper.addToFavorites(story);
      alert('Ditambahkan ke favorit.');
    }
    // Refresh UI jika perlu (misalnya, update tombol bintang)
  } catch (error) {
    console.error('Toggle favorite failed:', error);
  }
}