import ApiService from '../../data/api.js';

export default class LoginPage {
  async render() {
    return `
      <section class="container">
        <h1>Login</h1>
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label for="login-email">Email:</label>
            <input type="email" id="login-email" name="email" required aria-describedby="login-email-error" placeholder="Masukkan email Anda">
            <span id="login-email-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label for="login-password">Password:</label>
            <input type="password" id="login-password" name="password" required aria-describedby="login-password-error" placeholder="Masukkan password Anda">
            <span id="login-password-error" class="error-message" role="alert" aria-live="polite"></span>
          </div>
          <button type="submit" class="btn" id="login-submit-btn" aria-describedby="login-status">Login</button>
          <div id="login-status" class="status-message" role="status" aria-live="polite"></div>
        </form>
        <p>Belum punya akun? <a href="#/register">Daftar di sini</a></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-submit-btn');
    const statusDiv = document.getElementById('login-status');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sedang Login...';
      statusDiv.textContent = 'Memproses login...';
      
      const formData = new FormData(form);
      const email = formData.get('email');
      const password = formData.get('password');

      try {
        const result = await ApiService.login({ email, password });
        if (!result.error) {
          await Swal.fire({
            icon: 'success',
            title: 'Login Berhasil!',
            text: `Selamat datang, ${result.loginResult.name}!`,
            timer: 2000,
            showConfirmButton: false
          });
          window.location.hash = '#/';
        } else {
          statusDiv.textContent = result.message;
          await Swal.fire({
            icon: 'error',
            title: 'Login Gagal',
            text: result.message
          });
        }
      } catch (error) {
        console.error('Error during login:', error);
        statusDiv.textContent = 'Terjadi kesalahan saat login';
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Terjadi kesalahan saat login. Silakan coba lagi.'
        });
      } finally {
        // Reset loading state
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
        statusDiv.textContent = '';
      }
    });
  }
}