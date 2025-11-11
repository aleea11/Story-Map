export default class AboutPage {
  async render() {
    return `
      <section class="container">
        <div class="about-hero">
          <h1>Tentang Aplikasi Berbagi Cerita</h1>
          <p class="hero-subtitle">Platform untuk berbagi pengalaman Dicoding dengan komunitas</p>
        </div>
        
        <div class="about-content">
          <div class="about-card">
            <div class="card-icon">📖</div>
            <h2>Apa itu Berbagi Cerita?</h2>
            <p>Aplikasi ini dibuat sebagai bagian dari submission Dicoding untuk berbagi cerita seputar Dicoding. Bagikan pengalaman belajar, proyek menarik, atau momen spesial Anda dengan komunitas Dicoding!</p>
          </div>
          
          <div class="about-card">
            <div class="card-icon">🚀</div>
            <h2>Fitur Unggulan</h2>
            <ul>
              <li><strong>Berbagi Cerita:</strong> Unggah foto dan cerita dengan lokasi</li>
              <li><strong>Peta Interaktif:</strong> Eksplorasi cerita berdasarkan lokasi</li>
              <li><strong>Autentikasi:</strong> Sistem login dan register yang aman</li>
              <li><strong>Kamera Langsung:</strong> Ambil foto langsung dari perangkat</li>
              <li><strong>Responsive:</strong> Tampil sempurna di semua perangkat</li>
            </ul>
          </div>
          
          <div class="about-card">
            <div class="card-icon">💻</div>
            <h2>Teknologi</h2>
            <div class="tech-stack">
              <span class="tech-badge">JavaScript ES6+</span>
              <span class="tech-badge">SPA Architecture</span>
              <span class="tech-badge">Leaflet Maps</span>
              <span class="tech-badge">Web APIs</span>
              <span class="tech-badge">Vite</span>
            </div>
          </div>
          
          <div class="about-card">
            <div class="card-icon">📋</div>
            <h2>Cara Penggunaan</h2>
            <ol class="usage-steps">
              <li><strong>Daftar/Login:</strong> Buat akun atau masuk dengan akun existing</li>
              <li><strong>Tambah Cerita:</strong> Klik tombol "Tambah Cerita Baru"</li>
              <li><strong>Isi Detail:</strong> Tulis deskripsi, pilih foto, dan tentukan lokasi</li>
              <li><strong>Bagikan:</strong> Klik "Tambah Cerita" untuk membagikan ke komunitas</li>
              <li><strong>Eksplorasi:</strong> Lihat cerita orang lain di beranda!</li>
            </ol>
          </div>
          
          <div class="about-card">
            <div class="card-icon">🎯</div>
            <h2>Tujuan Aplikasi</h2>
            <p>Membangun komunitas Dicoding yang lebih solid dengan berbagi pengetahuan dan pengalaman. Setiap cerita bisa menjadi inspirasi bagi learner lainnya untuk terus belajar dan berkembang di dunia programming.</p>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // Add any additional functionality here if needed
  }
}