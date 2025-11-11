import ApiService from '../../data/api.js';

export default class RegisterPage {
  async render() {
    return `
      <section class="container">
        <h1>Register</h1>
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label for="register-name">Nama:</label>
            <input type="text" id="register-name" name="name" required aria-describedby="register-name-error" placeholder="Masukkan nama lengkap Anda">
            <span id="register-name-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label for="register-email">Email:</label>
            <input type="email" id="register-email" name="email" required aria-describedby="register-email-error" placeholder="Masukkan email Anda">
            <span id="register-email-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label for="register-password">Password:</label>
            <input type="password" id="register-password" name="password" required minlength="8" aria-describedby="register-password-error" placeholder="Minimal 8 karakter">
            <span id="register-password-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <button type="submit" class="btn" id="register-submit-btn" aria-describedby="register-status">Register</button>
          <div id="register-status" class="status-message" role="status" aria-live="polite"></div>
        </form>
        <p>Sudah punya akun? <a href="#/login">Login di sini</a></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('register-form');
    const submitBtn = document.getElementById('register-submit-btn');
    const statusDiv = document.getElementById('register-status');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sedang Mendaftar...';
      statusDiv.textContent = 'Memproses pendaftaran...';
      
      const formData = new FormData(form);
      const name = formData.get('name');
      const email = formData.get('email');
      const password = formData.get('password');

      try {
        const result = await ApiService.register({ name, email, password });
        if (!result.error) {
          await Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Berhasil!',
            text: 'Akun Anda telah dibuat. Silakan login.',
            timer: 2000,
            showConfirmButton: false
          });
          window.location.hash = '#/login';
        } else {
          statusDiv.textContent = result.message;
          await Swal.fire({
            icon: 'error',
            title: 'Pendaftaran Gagal',
            text: result.message
          });
        }
      } catch (error) {
        console.error('Error during registration:', error);
        statusDiv.textContent = 'Terjadi kesalahan saat pendaftaran';
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.'
        });
      } finally {
        // Reset loading state
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
        statusDiv.textContent = '';
      }
    });
  }
}